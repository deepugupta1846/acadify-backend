const classService = require('./class.service');
const recordingService = require('./recording.service');
const sessionService = require('./session.service');
const sessionContentService = require('./session-content.service');
const attendanceService = require('./attendance.service');

const VALID_STATUS = ['active', 'inactive', 'archived'];

const validateClassBody = (body, isUpdate = false) => {
  if (!isUpdate && !body.name?.trim()) {
    const error = new Error('Class name is required');
    error.status = 400;
    throw error;
  }

  if (body.status && !VALID_STATUS.includes(body.status)) {
    const error = new Error(`Invalid status. Allowed: ${VALID_STATUS.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (
    body.durationMinutes !== undefined &&
    body.durationMinutes !== null &&
    Number(body.durationMinutes) <= 0
  ) {
    const error = new Error('Duration must be greater than 0 minutes');
    error.status = 400;
    throw error;
  }
};

const normalizeClassTime = (value) => {
  if (!value?.trim()) return null;
  const time = value.trim();
  return time.length === 5 ? `${time}:00` : time;
};

const listClasses = async (req, res, next) => {
  try {
    const classes = await classService.listClasses(req.user);
    return res.status(200).json({ success: true, data: classes });
  } catch (error) {
    return next(error);
  }
};

const getClass = async (req, res, next) => {
  try {
    const classroom = await classService.getClassById(req.params.id, req.user);
    return res.status(200).json({ success: true, data: classroom });
  } catch (error) {
    return next(error);
  }
};

const createClass = async (req, res, next) => {
  try {
    validateClassBody(req.body);

    const classroom = await classService.createClass(req.user, {
      name: req.body.name.trim(),
      description: req.body.description?.trim(),
      courseId: req.body.courseId ? Number(req.body.courseId) : null,
      status: req.body.status,
      maxStudents: req.body.maxStudents ? Number(req.body.maxStudents) : null,
      classTime: normalizeClassTime(req.body.classTime),
      durationMinutes: req.body.durationMinutes
        ? Number(req.body.durationMinutes)
        : null
    });

    return res.status(201).json({
      success: true,
      message: 'Class created successfully',
      data: classroom
    });
  } catch (error) {
    return next(error);
  }
};

const updateClass = async (req, res, next) => {
  try {
    validateClassBody(req.body, true);

    const classroom = await classService.updateClass(req.params.id, req.user, {
      name: req.body.name?.trim(),
      description: req.body.description?.trim(),
      courseId:
        req.body.courseId !== undefined
          ? req.body.courseId
            ? Number(req.body.courseId)
            : null
          : undefined,
      status: req.body.status,
      maxStudents:
        req.body.maxStudents !== undefined
          ? req.body.maxStudents
            ? Number(req.body.maxStudents)
            : null
          : undefined,
      classTime:
        req.body.classTime !== undefined
          ? normalizeClassTime(req.body.classTime)
          : undefined,
      durationMinutes:
        req.body.durationMinutes !== undefined
          ? req.body.durationMinutes
            ? Number(req.body.durationMinutes)
            : null
          : undefined
    });

    return res.status(200).json({
      success: true,
      message: 'Class updated successfully',
      data: classroom
    });
  } catch (error) {
    return next(error);
  }
};

const getLiveToken = async (req, res, next) => {
  try {
    const result = await classService.getLiveClassAccess(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(error);
  }
};

const startLiveClass = async (req, res, next) => {
  try {
    const result = await classService.startLiveClass(req.params.id, req.user);
    const { sent = 0 } = result.studentNotifications || {};

    return res.status(200).json({
      success: true,
      message:
        sent > 0
          ? `Live class started. ${sent} enrolled student(s) notified by email.`
          : 'Live class started',
      data: result.classroom,
      livekit: result.livekit,
      studentNotifications: result.studentNotifications
    });
  } catch (error) {
    return next(error);
  }
};

const endLiveClass = async (req, res, next) => {
  try {
    const result = await classService.endLiveClass(req.params.id, req.user);

    return res.status(200).json({
      success: true,
      message: result.recordingFinalized
        ? 'Live class ended. Recording is uploading to Azure.'
        : 'Live class ended',
      data: result.classroom,
      recordingFinalized: result.recordingFinalized,
      recording: result.recording
    });
  } catch (error) {
    return next(error);
  }
};

const deleteClass = async (req, res, next) => {
  try {
    await classService.deleteClass(req.params.id, req.user);
    return res.status(200).json({
      success: true,
      message: 'Class deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const joinClass = async (req, res, next) => {
  try {
    if (!req.body.classCode?.trim()) {
      const error = new Error('Class code is required');
      error.status = 400;
      throw error;
    }

    const classroom = await classService.joinClassByCode(
      req.user,
      req.body.classCode
    );

    return res.status(200).json({
      success: true,
      message: 'Joined class successfully',
      data: classroom
    });
  } catch (error) {
    return next(error);
  }
};

const listEnrolledClasses = async (req, res, next) => {
  try {
    const classes = await classService.listStudentClasses(req.user);
    return res.status(200).json({ success: true, data: classes });
  } catch (error) {
    return next(error);
  }
};

const getEnrolledClass = async (req, res, next) => {
  try {
    const classroom = await classService.getEnrolledClassById(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data: classroom });
  } catch (error) {
    return next(error);
  }
};

const listRecordings = async (req, res, next) => {
  try {
    const recordings = await recordingService.listRecordings(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data: recordings });
  } catch (error) {
    return next(error);
  }
};

const getMyAttendance = async (req, res, next) => {
  try {
    const data = await attendanceService.getStudentAttendanceSummary(req.user);
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const getClassAttendance = async (req, res, next) => {
  try {
    const sessionId = req.query.sessionId
      ? Number(req.query.sessionId)
      : null;

    const data = await attendanceService.getClassAttendance(
      req.params.id,
      req.user,
      sessionId
    );

    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const listSessions = async (req, res, next) => {
  try {
    const sessions = await sessionService.listSessions(
      req.params.id,
      req.user
    );
    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    return next(error);
  }
};

const getSessionDetail = async (req, res, next) => {
  try {
    const data = await sessionContentService.getSessionDetail(
      req.params.id,
      req.params.sessionId,
      req.user
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    return next(error);
  }
};

const createSessionMaterial = async (req, res, next) => {
  try {
    const material = await sessionContentService.createMaterial(
      req.params.id,
      req.params.sessionId,
      req.user,
      req.body,
      req.file
    );

    return res.status(201).json({
      success: true,
      message: 'Material added successfully',
      data: material
    });
  } catch (error) {
    return next(error);
  }
};

const downloadSessionMaterial = async (req, res, next) => {
  try {
    const file = await sessionContentService.downloadMaterial(
      req.params.id,
      req.params.sessionId,
      req.params.materialId,
      req.user
    );

    const safeName = encodeURIComponent(file.fileName);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`
    );
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');

    if (file.contentLength) {
      res.setHeader('Content-Length', String(file.contentLength));
    }

    file.stream.pipe(res);
  } catch (error) {
    return next(error);
  }
};

const deleteSessionMaterial = async (req, res, next) => {
  try {
    await sessionContentService.deleteMaterial(
      req.params.id,
      req.params.sessionId,
      req.params.materialId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Material deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const createSessionAssignment = async (req, res, next) => {
  try {
    const assignment = await sessionContentService.createAssignment(
      req.params.id,
      req.params.sessionId,
      req.user,
      req.body
    );

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: assignment
    });
  } catch (error) {
    return next(error);
  }
};

const deleteSessionAssignment = async (req, res, next) => {
  try {
    await sessionContentService.deleteAssignment(
      req.params.id,
      req.params.sessionId,
      req.params.assignmentId,
      req.user
    );

    return res.status(200).json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const startRecording = async (req, res, next) => {
  try {
    const recording = await recordingService.startRecording(
      req.params.id,
      req.user
    );
    return res.status(200).json({
      success: true,
      message: 'Recording started',
      data: recording
    });
  } catch (error) {
    return next(error);
  }
};

const stopRecording = async (req, res, next) => {
  try {
    const recording = await recordingService.stopRecording(
      req.params.id,
      req.user
    );
    return res.status(200).json({
      success: true,
      message: 'Recording stopped. Upload will finish shortly.',
      data: recording
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  getLiveToken,
  startLiveClass,
  endLiveClass,
  deleteClass,
  joinClass,
  listEnrolledClasses,
  getEnrolledClass,
  listRecordings,
  listSessions,
  getSessionDetail,
  createSessionMaterial,
  downloadSessionMaterial,
  deleteSessionMaterial,
  createSessionAssignment,
  deleteSessionAssignment,
  getMyAttendance,
  getClassAttendance,
  startRecording,
  stopRecording
};
