const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');
const azureConfig = require('../storage/azure.config');
const recordingService = require('./recording.service');

const Classroom = db.classroom;
const ClassSession = db.classSession;
const ClassRecording = db.classRecording;
const ClassEnrollment = db.classEnrollment;
const ClassAttendance = db.classAttendance;

const ensureClassAccess = async (classId, user) => {
  const classroom = await Classroom.findByPk(classId);

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  if (user.type === USER_TYPES.ACADEMIC) {
    if (user.academyId !== classroom.academyId) {
      const error = new Error('You do not have access to this class');
      error.status = 403;
      throw error;
    }
    return classroom;
  }

  if (user.type === USER_TYPES.STUDENT) {
    const enrolled = await ClassEnrollment.findOne({
      where: { classId: classroom.id, studentId: user.id }
    });

    if (!enrolled) {
      const error = new Error('You must be enrolled in this class to view sessions');
      error.status = 403;
      throw error;
    }

    return classroom;
  }

  const error = new Error('You do not have permission to access sessions');
  error.status = 403;
  throw error;
};

const getActiveSession = async (classId) =>
  ClassSession.findOne({
    where: { classId, status: 'live' },
    order: [['startedAt', 'DESC']]
  });

const startSession = async (classId, academyId) => {
  const existing = await getActiveSession(classId);
  if (existing) return existing;

  return ClassSession.create({
    classId,
    academyId,
    startedAt: new Date(),
    status: 'live'
  });
};

const syncSessionRecordingUrl = async (sessionId) => {
  const recording = await ClassRecording.findOne({
    where: { sessionId, status: 'completed' },
    order: [['completedAt', 'DESC']]
  });

  if (!recording?.recordingUrl) return;

  await ClassSession.update(
    { recordingUrl: recording.recordingUrl },
    { where: { id: sessionId } }
  );
};

const endSession = async (classId) => {
  const session = await getActiveSession(classId);
  if (!session) return null;

  await syncSessionRecordingUrl(session.id);

  const latest = await ClassSession.findByPk(session.id);
  await latest.update({
    status: 'ended',
    endedAt: new Date()
  });

  return latest.reload().then((row) => row.toJSON());
};

const updateSessionFromRecording = async (recording) => {
  if (!recording.recordingUrl) return;

  let sessionId = recording.sessionId;

  if (!sessionId) {
    const session = await ClassSession.findOne({
      where: { classId: recording.classId },
      order: [['startedAt', 'DESC']]
    });

    if (session) {
      sessionId = session.id;
      await recording.update({ sessionId });
    }
  }

  if (!sessionId) return;

  await ClassSession.update(
    { recordingUrl: recording.recordingUrl },
    { where: { id: sessionId } }
  );
};

const formatSessionRow = (session) => {
  const plain = session.toJSON();
  const recordings = plain.recordings || [];
  const latestRecording = recordings.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  const recordingUrl = azureConfig.resolveBlobUrl({
    filePath: latestRecording?.filePath,
    storedUrl: plain.recordingUrl || latestRecording?.recordingUrl
  });

  return {
    id: plain.id,
    classId: plain.classId,
    startedAt: plain.startedAt,
    endedAt: plain.endedAt,
    status: plain.status,
    recordingUrl,
    recordingStatus: latestRecording?.status || null,
    hasRecording: Boolean(recordingUrl)
  };
};

const listSessions = async (classId, user) => {
  await ensureClassAccess(classId, user);
  await recordingService.syncProcessingRecordings(classId, { force: false });

  const sessions = await ClassSession.findAll({
    where: { classId },
    include: [
      {
        model: ClassRecording,
        as: 'recordings',
        required: false
      }
    ],
    order: [['startedAt', 'DESC']]
  });

  await Promise.all(sessions.map((item) => syncSessionRecordingUrl(item.id)));

  const refreshed = await ClassSession.findAll({
    where: { classId },
    include: [{ model: ClassRecording, as: 'recordings', required: false }],
    order: [['startedAt', 'DESC']]
  });

  let presentSessionIds = new Set();
  if (user.type === USER_TYPES.STUDENT) {
    const sessionIds = refreshed.map((item) => item.id);
    if (sessionIds.length > 0) {
      const attendanceRows = await ClassAttendance.findAll({
        where: { studentId: user.id, sessionId: sessionIds }
      });
      presentSessionIds = new Set(attendanceRows.map((row) => row.sessionId));
    }
  }

  return refreshed.map((session) => {
    const row = formatSessionRow(session);
    if (user.type === USER_TYPES.STUDENT) {
      row.attendanceStatus = presentSessionIds.has(session.id)
        ? 'present'
        : 'absent';
    }
    return row;
  });
};

module.exports = {
  ensureClassAccess,
  getActiveSession,
  startSession,
  endSession,
  updateSessionFromRecording,
  listSessions
};
