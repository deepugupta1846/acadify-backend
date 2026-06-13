const crypto = require('crypto');
const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');
const livekitService = require('../livekit/livekit.service');
const recordingService = require('./recording.service');
const sessionService = require('./session.service');
const attendanceService = require('./attendance.service');
const {
  sendLiveClassStartedEmailsToStudents
} = require('../email/email.service');

const Classroom = db.classroom;
const ClassEnrollment = db.classEnrollment;
const Course = db.course;
const User = db.user;

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateClassCode = async () => {
  while (true) {
    let code = 'CLS-';
    for (let i = 0; i < 6; i += 1) {
      code += CODE_CHARS[crypto.randomInt(0, CODE_CHARS.length)];
    }

    const exists = await Classroom.findOne({ where: { classCode: code } });
    if (!exists) return code;
  }
};

const ensureAcademyAccess = (user) => {
  if (!user.academyId) {
    const error = new Error(
      'Your account is not linked to an academy. Contact admin.'
    );
    error.status = 403;
    throw error;
  }

  return user.academyId;
};

const listClasses = async (user) => {
  const academyId = ensureAcademyAccess(user);

  const classes = await Classroom.findAll({
    where: { academyId },
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title']
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  const enrollmentCounts = await ClassEnrollment.findAll({
    attributes: [
      'class_id',
      [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
    ],
    where: { academyId },
    group: ['class_id'],
    raw: true
  });

  const countMap = enrollmentCounts.reduce((acc, row) => {
    acc[row.class_id] = Number(row.count);
    return acc;
  }, {});

  return classes.map((item) => {
    const plain = item.toJSON();
    plain.studentCount = countMap[item.id] || 0;
    return plain;
  });
};

const getClassById = async (id, user) => {
  const academyId = ensureAcademyAccess(user);
  const classroom = await Classroom.findOne({
    where: { id, academyId },
    include: [
      {
        model: Course,
        as: 'course',
        attributes: ['id', 'title']
      }
    ]
  });

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  const studentCount = await ClassEnrollment.count({
    where: { classId: classroom.id }
  });

  const plain = classroom.toJSON();
  plain.studentCount = studentCount;
  return plain;
};

const validateCourseForAcademy = async (courseId, academyId) => {
  if (!courseId) return null;

  const course = await Course.findOne({
    where: { id: courseId, academyId }
  });

  if (!course) {
    const error = new Error('Course not found for your academy');
    error.status = 404;
    throw error;
  }

  return course.id;
};

const createClass = async (user, payload) => {
  const academyId = ensureAcademyAccess(user);
  const courseId = await validateCourseForAcademy(payload.courseId, academyId);
  const classCode = await generateClassCode();

  return Classroom.create({
    academyId,
    courseId,
    createdBy: user.id,
    name: payload.name,
    description: payload.description || null,
    classCode,
    status: payload.status || 'active',
    maxStudents: payload.maxStudents || null,
    classTime: payload.classTime || null,
    durationMinutes: payload.durationMinutes || null
  });
};

const updateClass = async (id, user, payload) => {
  const academyId = ensureAcademyAccess(user);
  const classroom = await Classroom.findOne({ where: { id, academyId } });

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  const courseId =
    payload.courseId !== undefined
      ? await validateCourseForAcademy(payload.courseId, academyId)
      : classroom.courseId;

  await classroom.update({
    name: payload.name ?? classroom.name,
    description:
      payload.description !== undefined
        ? payload.description
        : classroom.description,
    courseId,
    status: payload.status ?? classroom.status,
    maxStudents:
      payload.maxStudents !== undefined
        ? payload.maxStudents
        : classroom.maxStudents,
    classTime:
      payload.classTime !== undefined ? payload.classTime : classroom.classTime,
    durationMinutes:
      payload.durationMinutes !== undefined
        ? payload.durationMinutes
        : classroom.durationMinutes
  });

  return classroom;
};

const buildLiveKitAccess = async (classroom, user, role) => {
  const roomName = classroom.livekitRoomName || livekitService.buildRoomName(classroom.id);
  const token = await livekitService.createParticipantToken({
    identity: `${user.type}-${user.id}`,
    name: user.name,
    roomName,
    role
  });

  return livekitService.buildLiveKitPayload({ roomName, token, role });
};

const getLiveClassAccess = async (id, user) => {
  const classroom = await Classroom.findByPk(id, {
    include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }]
  });

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  if (!classroom.isLive) {
    const error = new Error('This class is not live right now');
    error.status = 400;
    throw error;
  }

  let role = null;

  if (user.type === USER_TYPES.ACADEMIC && user.academyId === classroom.academyId) {
    role = 'host';
  } else if (user.type === USER_TYPES.STUDENT) {
    const enrolled = await ClassEnrollment.findOne({
      where: { classId: classroom.id, studentId: user.id }
    });

    if (!enrolled) {
      const error = new Error('You must join this class before entering live session');
      error.status = 403;
      throw error;
    }

    role = 'student';

    const activeSession = await sessionService.getActiveSession(classroom.id);
    if (activeSession) {
      await attendanceService.markStudentPresent({
        sessionId: activeSession.id,
        classId: classroom.id,
        studentId: user.id
      });
    }
  } else {
    const error = new Error('You do not have permission to join this live class');
    error.status = 403;
    throw error;
  }

  const studentCount = await ClassEnrollment.count({
    where: { classId: classroom.id }
  });
  const plain = classroom.toJSON();
  plain.studentCount = studentCount;

  const livekit = await buildLiveKitAccess(classroom, user, role);

  return { classroom: plain, livekit };
};

const getEnrolledStudentsForClass = async (classId) => {
  const enrollments = await ClassEnrollment.findAll({
    where: { classId },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'email', 'name', 'isActive'],
        required: true
      }
    ]
  });

  return enrollments
    .map((item) => item.student)
    .filter((student) => student?.isActive && student?.email);
};

const notifyEnrolledStudentsLiveStarted = async (classroom) => {
  const students = await getEnrolledStudentsForClass(classroom.id);
  return sendLiveClassStartedEmailsToStudents(classroom, students);
};

const startLiveClass = async (id, user) => {
  const classroom = await getClassById(id, user);

  if (classroom.status !== 'active') {
    const error = new Error('Only active classes can go live');
    error.status = 400;
    throw error;
  }

  const roomName = livekitService.buildRoomName(id);
  await livekitService.ensureRoom(roomName, classroom.name);

  const record = await Classroom.findByPk(id);
  await sessionService.startSession(id, record.academyId);
  await record.update({
    isLive: true,
    liveStartedAt: new Date(),
    livekitRoomName: roomName
  });

  const updated = await getClassById(id, user);
  const livekit = await buildLiveKitAccess(
    { ...updated, livekitRoomName: roomName },
    user,
    'host'
  );

  let studentNotifications = { sent: 0, failed: 0, errors: [] };

  try {
    studentNotifications = await notifyEnrolledStudentsLiveStarted(updated);
  } catch (error) {
    studentNotifications = {
      sent: 0,
      failed: 0,
      errors: [error.message || 'Failed to notify enrolled students']
    };
  }

  return { classroom: updated, livekit, studentNotifications };
};

const endLiveClass = async (id, user) => {
  const classroom = await getClassById(id, user);
  const record = await Classroom.findByPk(classroom.id);

  const finalizedRecording = await recordingService.finalizeActiveRecording(id);
  await recordingService.syncProcessingRecordings(id, { force: true });
  await sessionService.endSession(id);

  if (record.livekitRoomName) {
    await livekitService.deleteRoom(record.livekitRoomName);
  }

  await record.update({
    isLive: false,
    liveStartedAt: null,
    livekitRoomName: null
  });

  const updated = await getClassById(id, user);

  return {
    classroom: updated,
    recordingFinalized: Boolean(finalizedRecording),
    recording: finalizedRecording
  };
};

const deleteClass = async (id, user) => {
  const academyId = ensureAcademyAccess(user);
  const classroom = await Classroom.findOne({ where: { id, academyId } });

  if (!classroom) {
    const error = new Error('Class not found');
    error.status = 404;
    throw error;
  }

  await ClassEnrollment.destroy({ where: { classId: classroom.id } });
  await db.classRecording.destroy({ where: { classId: classroom.id } });
  await db.classSession.destroy({ where: { classId: classroom.id } });
  await db.classAttendance.destroy({ where: { classId: classroom.id } });
  await classroom.destroy();
  return true;
};

const joinClassByCode = async (user, classCode) => {
  if (!user.academyId) {
    const error = new Error(
      'Your student account is not linked to an academy. Contact admin.'
    );
    error.status = 403;
    throw error;
  }

  const normalizedCode = classCode.trim().toUpperCase();
  const classroom = await Classroom.findOne({
    where: { classCode: normalizedCode },
    include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }]
  });

  if (!classroom) {
    const error = new Error('Invalid class code');
    error.status = 404;
    throw error;
  }

  if (classroom.status !== 'active') {
    const error = new Error('This class is not open for enrollment');
    error.status = 400;
    throw error;
  }

  if (classroom.academyId !== user.academyId) {
    const error = new Error('This class does not belong to your academy');
    error.status = 403;
    throw error;
  }

  const existing = await ClassEnrollment.findOne({
    where: { classId: classroom.id, studentId: user.id }
  });

  if (existing) {
    const error = new Error('You have already joined this class');
    error.status = 409;
    throw error;
  }

  if (classroom.maxStudents) {
    const currentCount = await ClassEnrollment.count({
      where: { classId: classroom.id }
    });

    if (currentCount >= classroom.maxStudents) {
      const error = new Error('This class is full');
      error.status = 400;
      throw error;
    }
  }

  await ClassEnrollment.create({
    classId: classroom.id,
    studentId: user.id,
    academyId: user.academyId
  });

  return classroom;
};

const getEnrolledClassById = async (id, user) => {
  const enrollment = await ClassEnrollment.findOne({
    where: { studentId: user.id, classId: id },
    include: [
      {
        model: Classroom,
        as: 'classroom',
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }]
      }
    ]
  });

  if (!enrollment?.classroom) {
    const error = new Error('Class not found or you are not enrolled');
    error.status = 404;
    throw error;
  }

  const plain = enrollment.classroom.toJSON();
  plain.joinedAt = enrollment.createdAt;
  plain.enrollmentId = enrollment.id;

  return plain;
};

const listStudentClasses = async (user) => {
  if (!user.academyId) {
    return [];
  }

  const enrollments = await ClassEnrollment.findAll({
    where: { studentId: user.id },
    include: [
      {
        model: Classroom,
        as: 'classroom',
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }]
      }
    ],
    order: [['createdAt', 'DESC']]
  });

  return enrollments.map((item) => {
    const plain = item.toJSON();
    return {
      enrollmentId: plain.id,
      joinedAt: plain.createdAt,
      ...plain.classroom
    };
  });
};

module.exports = {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  getLiveClassAccess,
  startLiveClass,
  endLiveClass,
  deleteClass,
  joinClassByCode,
  getEnrolledClassById,
  listStudentClasses
};
