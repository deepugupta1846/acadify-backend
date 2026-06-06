const db = require('../../connection');
const { USER_TYPES } = require('../auth/auth.constants');

const Classroom = db.classroom;
const ClassSession = db.classSession;
const ClassEnrollment = db.classEnrollment;
const ClassAttendance = db.classAttendance;
const User = db.user;

const markStudentPresent = async ({ sessionId, classId, studentId }) => {
  const [record] = await ClassAttendance.findOrCreate({
    where: { sessionId, studentId },
    defaults: {
      classId,
      status: 'present',
      joinedAt: new Date()
    }
  });

  return record.toJSON();
};

const resolveSession = async (classId, sessionId) => {
  if (sessionId) {
    const session = await ClassSession.findOne({
      where: { id: sessionId, classId }
    });

    if (!session) {
      const error = new Error('Session not found for this class');
      error.status = 404;
      throw error;
    }

    return session;
  }

  const session = await ClassSession.findOne({
    where: { classId },
    order: [['startedAt', 'DESC']]
  });

  if (!session) {
    const error = new Error('No sessions found for this class yet');
    error.status = 404;
    throw error;
  }

  return session;
};

const buildAttendanceList = async (classId, session) => {
  const enrollments = await ClassEnrollment.findAll({
    where: { classId },
    include: [
      {
        model: User,
        as: 'student',
        attributes: ['id', 'name', 'email', 'phone']
      }
    ],
    order: [[{ model: User, as: 'student' }, 'name', 'ASC']]
  });

  const presentRows = await ClassAttendance.findAll({
    where: { sessionId: session.id }
  });

  const presentMap = presentRows.reduce((acc, row) => {
    acc[row.studentId] = row.toJSON();
    return acc;
  }, {});

  const students = enrollments.map((enrollment) => {
    const student = enrollment.student?.toJSON();
    const present = presentMap[enrollment.studentId];

    return {
      studentId: enrollment.studentId,
      name: student?.name || 'Unknown',
      email: student?.email || '',
      phone: student?.phone || null,
      status: present ? 'present' : 'absent',
      joinedAt: present?.joinedAt || null
    };
  });

  const presentCount = students.filter((s) => s.status === 'present').length;

  return {
    session: {
      id: session.id,
      classId: session.classId,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      status: session.status
    },
    summary: {
      total: students.length,
      present: presentCount,
      absent: students.length - presentCount
    },
    students
  };
};

const getClassAttendance = async (classId, user, sessionId = null) => {
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

  const session = await resolveSession(classId, sessionId);
  return buildAttendanceList(classId, session);
};

const getStudentAttendanceSummary = async (user) => {
  if (!user.academyId) {
    return { summary: { present: 0, absent: 0, total: 0 }, records: [] };
  }

  const enrollments = await ClassEnrollment.findAll({
    where: { studentId: user.id },
    include: [
      {
        model: Classroom,
        as: 'classroom',
        attributes: ['id', 'name', 'classCode']
      }
    ]
  });

  const classIds = enrollments.map((e) => e.classId);
  if (classIds.length === 0) {
    return { summary: { present: 0, absent: 0, total: 0 }, records: [] };
  }

  const sessions = await ClassSession.findAll({
    where: { classId: classIds },
    order: [['startedAt', 'DESC']]
  });

  const attendanceRows = await ClassAttendance.findAll({
    where: { studentId: user.id }
  });

  const attendedSessionIds = new Set(attendanceRows.map((r) => r.sessionId));

  const enrollmentMap = enrollments.reduce((acc, item) => {
    acc[item.classId] = item.classroom?.toJSON();
    return acc;
  }, {});

  const records = sessions.map((session) => {
    const classroom = enrollmentMap[session.classId];
    const isPresent = attendedSessionIds.has(session.id);

    return {
      sessionId: session.id,
      classId: session.classId,
      className: classroom?.name || 'Class',
      classCode: classroom?.classCode || '',
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      sessionStatus: session.status,
      status: isPresent ? 'present' : 'absent'
    };
  });

  const present = records.filter((r) => r.status === 'present').length;
  const absent = records.filter((r) => r.status === 'absent').length;

  return {
    summary: {
      present,
      absent,
      total: records.length
    },
    records
  };
};

module.exports = {
  markStudentPresent,
  getClassAttendance,
  getStudentAttendanceSummary
};
