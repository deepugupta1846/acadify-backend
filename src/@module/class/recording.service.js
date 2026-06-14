const { EgressStatus } = require('livekit-server-sdk');
const { Op } = require('sequelize');
const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');
const livekitService = require('../livekit/livekit.service');
const azureConfig = require('../storage/azure.config');

const Classroom = db.classroom;
const ClassRecording = db.classRecording;
const ClassEnrollment = db.classEnrollment;

const ACTIVE_STATUSES = ['recording', 'processing'];
const STALE_PROCESSING_MS = 10 * 60 * 1000;
const SYNC_THROTTLE_MS = 5000;
const lastSyncByClass = new Map();

const resolveRecordingUrl = (egress, filePath) => {
  const fileResult = egress?.fileResults?.[0];
  if (!fileResult) {
    return filePath ? azureConfig.buildBlobUrl(filePath) : null;
  }

  if (fileResult.location) return fileResult.location;
  if (fileResult.filename) return azureConfig.buildBlobUrl(fileResult.filename);

  return filePath ? azureConfig.buildBlobUrl(filePath) : null;
};

const isEgressComplete = (status) =>
  status === EgressStatus.EGRESS_COMPLETE ||
  status === 'EGRESS_COMPLETE' ||
  status === 3;

const isEgressFailed = (status) =>
  status === EgressStatus.EGRESS_FAILED ||
  status === EgressStatus.EGRESS_ABORTED ||
  status === EgressStatus.EGRESS_LIMIT_REACHED ||
  status === 'EGRESS_FAILED' ||
  status === 'EGRESS_ABORTED' ||
  status === 'EGRESS_LIMIT_REACHED' ||
  status === 4 ||
  status === 5 ||
  status === 6;

const applyEgressResult = async (recording, egress) => {
  if (!egress) return recording.toJSON();

  const recordingUrl = resolveRecordingUrl(egress, recording.filePath);

  if (isEgressComplete(egress.status)) {
    await recording.update({
      status: 'completed',
      recordingUrl,
      completedAt: new Date()
    });
    const sessionService = require('./session.service');
    await sessionService.updateSessionFromRecording(
      await recording.reload()
    );
  } else if (isEgressFailed(egress.status)) {
    await recording.update({
      status: 'failed',
      recordingUrl,
      completedAt: new Date()
    });
  } else {
    await recording.update({ status: 'processing' });
  }

  return recording.reload().then((row) => row.toJSON());
};

const syncProcessingRecording = async (recording) => {
  try {
    const egress = await livekitService.getEgressInfo(recording.egressId);

    if (egress) {
      await applyEgressResult(recording, egress);
      return;
    }

    const ageMs = Date.now() - new Date(recording.updatedAt).getTime();
    if (ageMs < STALE_PROCESSING_MS) return;

    await recording.update({
      status: 'failed',
      completedAt: new Date()
    });
  } catch (error) {
    console.error('Failed to sync recording:', recording.egressId, error.message);
  }
};

const syncProcessingRecordings = async (classId, { force = false } = {}) => {
  const now = Date.now();
  const lastSync = lastSyncByClass.get(classId) || 0;

  if (!force && now - lastSync < SYNC_THROTTLE_MS) return;

  const processing = await ClassRecording.findAll({
    where: { classId, status: 'processing' }
  });

  if (processing.length === 0) return;

  lastSyncByClass.set(classId, now);
  await Promise.all(processing.map((item) => syncProcessingRecording(item)));
};

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
      const error = new Error('You must be enrolled in this class to view recordings');
      error.status = 403;
      throw error;
    }

    return classroom;
  }

  const error = new Error('You do not have permission to access recordings');
  error.status = 403;
  throw error;
};

const listRecordings = async (classId, user) => {
  await ensureClassAccess(classId, user);
  await syncProcessingRecordings(classId);

  const recordings = await ClassRecording.findAll({
    where: { classId },
    order: [['createdAt', 'DESC']]
  });

  return recordings.map((item) => item.toJSON());
};

const getActiveRecording = async (classId) =>
  ClassRecording.findOne({
    where: { classId, status: { [Op.in]: ACTIVE_STATUSES } }
  });

const startRecording = async (classId, user) => {
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

  if (!classroom.isLive || !classroom.livekitRoomName) {
    const error = new Error('Start the live class before recording');
    error.status = 400;
    throw error;
  }

  const active = await ClassRecording.findOne({
    where: { classId, status: 'recording' }
  });

  if (active) {
    const error = new Error('A recording is already in progress for this class');
    error.status = 409;
    throw error;
  }

  const sessionService = require('./session.service');
  const activeSession = await sessionService.getActiveSession(classId);

  const { egressId, filePath } = await livekitService.startRoomRecording({
    roomName: classroom.livekitRoomName,
    classId,
    hostIdentity: `${USER_TYPES.ACADEMIC}-${user.id}`
  });

  const recording = await ClassRecording.create({
    classId,
    sessionId: activeSession?.id || null,
    academyId: classroom.academyId,
    egressId,
    filePath,
    status: 'recording',
    startedAt: new Date()
  });

  return recording.toJSON();
};

const finalizeActiveRecording = async (classId) => {
  const recording = await ClassRecording.findOne({
    where: { classId, status: 'recording' },
    order: [['createdAt', 'DESC']]
  });

  if (!recording) return null;

  try {
    const egress = await livekitService.stopRoomRecording(recording.egressId);

    if (
      isEgressComplete(egress.status) ||
      isEgressFailed(egress.status)
    ) {
      return applyEgressResult(recording, egress);
    }

    await recording.update({ status: 'processing' });
    return recording.reload().then((row) => row.toJSON());
  } catch (error) {
    console.error('Failed to finalize recording:', error.message);
    await recording.update({ status: 'failed', completedAt: new Date() });
    return null;
  }
};

const stopRecording = async (classId, user) => {
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

  const recording = await finalizeActiveRecording(classId);
  if (recording) return recording;

  const processing = await ClassRecording.findOne({
    where: { classId, status: 'processing' },
    order: [['createdAt', 'DESC']]
  });

  if (processing) {
    await syncProcessingRecording(processing);
    return processing.reload().then((row) => row.toJSON());
  }

  const error = new Error('No active recording found for this class');
  error.status = 404;
  throw error;
};

const handleEgressEnded = async (egress) => {
  if (!egress?.egressId) return;

  const recording = await ClassRecording.findOne({
    where: { egressId: egress.egressId }
  });

  if (!recording) return;

  await applyEgressResult(recording, egress);
};

module.exports = {
  listRecordings,
  getActiveRecording,
  startRecording,
  stopRecording,
  finalizeActiveRecording,
  syncProcessingRecordings,
  handleEgressEnded
};
