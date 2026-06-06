const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');
const uploadService = require('../storage/upload.service');
const azureConfig = require('../storage/azure.config');
const sessionService = require('./session.service');

const Classroom = db.classroom;
const ClassSession = db.classSession;
const ClassRecording = db.classRecording;
const ClassAttendance = db.classAttendance;
const ClassSessionMaterial = db.classSessionMaterial;
const ClassSessionAssignment = db.classSessionAssignment;
const MAX_FILE_SIZE = 15 * 1024 * 1024;

const ensureAcademicClass = async (classId, user) => {
  if (!user.academyId) {
    const error = new Error('Your account is not linked to an academy');
    error.status = 403;
    throw error;
  }

  const classroom = await Classroom.findOne({
    where: { id: classId, academyId: user.academyId }
  });

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  return classroom;
};

const getSessionForClass = async (classId, sessionId) => {
  const session = await ClassSession.findOne({
    where: { id: sessionId, classId }
  });

  if (!session) {
    const error = new Error('Session not found for this class');
    error.status = 404;
    throw error;
  }

  return session;
};

const formatMaterial = (row) => {
  const plain = row.toJSON ? row.toJSON() : row;
  return {
    id: plain.id,
    sessionId: plain.sessionId,
    type: plain.type,
    title: plain.title,
    content: plain.content,
    fileName: plain.fileName,
    mimeType: plain.mimeType,
    fileSize: plain.fileSize,
    createdAt: plain.createdAt
  };
};

const formatAssignment = (row) => {
  const plain = row.toJSON ? row.toJSON() : row;
  return {
    id: plain.id,
    sessionId: plain.sessionId,
    title: plain.title,
    description: plain.description,
    instructions: plain.instructions,
    dueDate: plain.dueDate,
    maxScore: plain.maxScore,
    createdAt: plain.createdAt
  };
};

const formatSessionDetail = async (session, user) => {
  const plain = session.toJSON();
  const recordings = plain.recordings || [];
  const latestRecording = recordings.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  const recordingUrl = azureConfig.resolveBlobUrl({
    filePath: latestRecording?.filePath,
    storedUrl: plain.recordingUrl || latestRecording?.recordingUrl
  });

  const detail = {
    id: plain.id,
    classId: plain.classId,
    startedAt: plain.startedAt,
    endedAt: plain.endedAt,
    status: plain.status,
    recordingUrl,
    recordingStatus: latestRecording?.status || null,
    hasRecording: Boolean(recordingUrl)
  };

  if (user.type === USER_TYPES.STUDENT) {
    const attendance = await ClassAttendance.findOne({
      where: { sessionId: plain.id, studentId: user.id }
    });
    detail.attendanceStatus = attendance ? 'present' : 'absent';
  }

  return detail;
};

const getSessionDetail = async (classId, sessionId, user) => {
  await sessionService.ensureClassAccess(classId, user);

  const session = await ClassSession.findOne({
    where: { id: sessionId, classId },
    include: [{ model: ClassRecording, as: 'recordings', required: false }]
  });

  if (!session) {
    const error = new Error('Session not found for this class');
    error.status = 404;
    throw error;
  }

  const [materials, assignments] = await Promise.all([
    ClassSessionMaterial.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    }),
    ClassSessionAssignment.findAll({
      where: { sessionId },
      order: [['createdAt', 'DESC']]
    })
  ]);

  return {
    session: await formatSessionDetail(session, user),
    materials: materials.map(formatMaterial),
    assignments: assignments.map(formatAssignment)
  };
};

const createMaterial = async (classId, sessionId, user, payload, file) => {
  const classroom = await ensureAcademicClass(classId, user);
  const session = await getSessionForClass(classId, sessionId);

  const title = payload.title?.trim();
  if (!title) {
    const error = new Error('Title is required');
    error.status = 400;
    throw error;
  }

  const type = payload.type === 'note' ? 'note' : 'attachment';

  if (type === 'note') {
    const content = payload.content?.trim();
    if (!content) {
      const error = new Error('Note content is required');
      error.status = 400;
      throw error;
    }

    const material = await ClassSessionMaterial.create({
      sessionId: session.id,
      classId: classroom.id,
      academyId: classroom.academyId,
      createdBy: user.id,
      type: 'note',
      title,
      content
    });

    return formatMaterial(material);
  }

  if (!file) {
    const error = new Error('File is required for attachments');
    error.status = 400;
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error('File size must be 15 MB or less');
    error.status = 400;
    throw error;
  }

  const uploaded = await uploadService.uploadBuffer({
    buffer: file.buffer,
    mimeType: file.mimetype,
    originalName: file.originalname,
    folder: `attachments/class-${classId}/session-${sessionId}`
  });

  const material = await ClassSessionMaterial.create({
    sessionId: session.id,
    classId: classroom.id,
    academyId: classroom.academyId,
    createdBy: user.id,
    type: 'attachment',
    title,
    fileName: file.originalname,
    filePath: uploaded.filePath,
    fileUrl: uploaded.fileUrl,
    mimeType: file.mimetype,
    fileSize: file.size
  });

  return formatMaterial(material);
};

const downloadMaterial = async (classId, sessionId, materialId, user) => {
  await sessionService.ensureClassAccess(classId, user);
  await getSessionForClass(classId, sessionId);

  const material = await ClassSessionMaterial.findOne({
    where: { id: materialId, sessionId, classId, type: 'attachment' }
  });

  if (!material?.filePath) {
    const error = new Error('Attachment not found');
    error.status = 404;
    throw error;
  }

  const file = await uploadService.downloadFile(material.filePath);

  return {
    stream: file.stream,
    fileName: material.fileName || 'attachment',
    mimeType: material.mimeType || file.contentType,
    contentLength: file.contentLength
  };
};

const deleteMaterial = async (classId, sessionId, materialId, user) => {
  await ensureAcademicClass(classId, user);
  await getSessionForClass(classId, sessionId);

  const material = await ClassSessionMaterial.findOne({
    where: { id: materialId, sessionId, classId }
  });

  if (!material) {
    const error = new Error('Material not found');
    error.status = 404;
    throw error;
  }

  await material.destroy();
  return { id: materialId };
};

const createAssignment = async (classId, sessionId, user, payload) => {
  const classroom = await ensureAcademicClass(classId, user);
  const session = await getSessionForClass(classId, sessionId);

  const title = payload.title?.trim();
  if (!title) {
    const error = new Error('Assignment title is required');
    error.status = 400;
    throw error;
  }

  const assignment = await ClassSessionAssignment.create({
    sessionId: session.id,
    classId: classroom.id,
    academyId: classroom.academyId,
    createdBy: user.id,
    title,
    description: payload.description?.trim() || null,
    instructions: payload.instructions?.trim() || null,
    dueDate: payload.dueDate ? new Date(payload.dueDate) : null,
    maxScore: payload.maxScore ? Number(payload.maxScore) : null
  });

  return formatAssignment(assignment);
};

const deleteAssignment = async (classId, sessionId, assignmentId, user) => {
  await ensureAcademicClass(classId, user);
  await getSessionForClass(classId, sessionId);

  const assignment = await ClassSessionAssignment.findOne({
    where: { id: assignmentId, sessionId, classId }
  });

  if (!assignment) {
    const error = new Error('Assignment not found');
    error.status = 404;
    throw error;
  }

  await assignment.destroy();
  return { id: assignmentId };
};

module.exports = {
  getSessionDetail,
  createMaterial,
  downloadMaterial,
  deleteMaterial,
  createAssignment,
  deleteAssignment
};
