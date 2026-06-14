const { Sequelize, DataTypes } = require('sequelize');
const config = require('./db.config.js');
require('dotenv').config();

const sequelize = new Sequelize(config.DB, config.USER, config.PASSORD, {
  host: config.HOST,
  port: config.PORT,
  dialect: config.dialect,
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: config.pool
});

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.academy = require('../@module/academic/academic.model')(sequelize, DataTypes);
db.user = require('../@module/auth/user.model')(sequelize, DataTypes);
db.authToken = require('../@module/auth/token.model')(sequelize, DataTypes);
db.passwordResetOtp = require('../@module/auth/password-reset-otp.model')(
  sequelize,
  DataTypes
);
db.course = require('../@module/course/course.model')(sequelize, DataTypes);
db.classroom = require('../@module/class/class.model')(sequelize, DataTypes);
db.classEnrollment = require('../@module/class/class-enrollment.model')(
  sequelize,
  DataTypes
);
db.classRecording = require('../@module/class/class-recording.model')(
  sequelize,
  DataTypes
);
db.classSession = require('../@module/class/class-session.model')(
  sequelize,
  DataTypes
);
db.classAttendance = require('../@module/class/class-attendance.model')(
  sequelize,
  DataTypes
);
db.classSessionMaterial = require('../@module/class/class-session-material.model')(
  sequelize,
  DataTypes
);
db.classSessionAssignment = require('../@module/class/class-session-assignment.model')(
  sequelize,
  DataTypes
);

db.academy.hasMany(db.user, { foreignKey: 'academy_id', as: 'users' });
db.user.belongsTo(db.academy, { foreignKey: 'academy_id', as: 'academy' });

db.academy.hasMany(db.course, { foreignKey: 'academy_id', as: 'courses' });
db.course.belongsTo(db.academy, { foreignKey: 'academy_id', as: 'academy' });

db.user.hasMany(db.course, { foreignKey: 'created_by', as: 'createdCourses' });
db.course.belongsTo(db.user, { foreignKey: 'created_by', as: 'creator' });

db.academy.hasMany(db.classroom, { foreignKey: 'academy_id', as: 'classes' });
db.classroom.belongsTo(db.academy, { foreignKey: 'academy_id', as: 'academy' });

db.course.hasMany(db.classroom, { foreignKey: 'course_id', as: 'classes' });
db.classroom.belongsTo(db.course, { foreignKey: 'course_id', as: 'course' });

db.user.hasMany(db.classroom, { foreignKey: 'created_by', as: 'createdClasses' });
db.classroom.belongsTo(db.user, { foreignKey: 'created_by', as: 'creator' });

db.classroom.hasMany(db.classEnrollment, {
  foreignKey: 'class_id',
  as: 'enrollments'
});

db.classroom.hasMany(db.classRecording, {
  foreignKey: 'class_id',
  as: 'recordings'
});
db.classRecording.belongsTo(db.classroom, {
  foreignKey: 'class_id',
  as: 'classroom'
});

db.classroom.hasMany(db.classSession, {
  foreignKey: 'class_id',
  as: 'sessions'
});
db.classSession.belongsTo(db.classroom, {
  foreignKey: 'class_id',
  as: 'classroom'
});

db.classSession.hasMany(db.classRecording, {
  foreignKey: 'session_id',
  as: 'recordings'
});
db.classRecording.belongsTo(db.classSession, {
  foreignKey: 'session_id',
  as: 'session'
});
db.classEnrollment.belongsTo(db.classroom, {
  foreignKey: 'class_id',
  as: 'classroom'
});

db.user.hasMany(db.classEnrollment, {
  foreignKey: 'student_id',
  as: 'classEnrollments'
});
db.classEnrollment.belongsTo(db.user, { foreignKey: 'student_id', as: 'student' });

db.classSession.hasMany(db.classAttendance, {
  foreignKey: 'session_id',
  as: 'attendance'
});
db.classAttendance.belongsTo(db.classSession, {
  foreignKey: 'session_id',
  as: 'session'
});
db.classAttendance.belongsTo(db.user, {
  foreignKey: 'student_id',
  as: 'student'
});
db.user.hasMany(db.classAttendance, {
  foreignKey: 'student_id',
  as: 'classAttendance'
});

db.classSession.hasMany(db.classSessionMaterial, {
  foreignKey: 'session_id',
  as: 'materials'
});
db.classSessionMaterial.belongsTo(db.classSession, {
  foreignKey: 'session_id',
  as: 'session'
});

db.classSession.hasMany(db.classSessionAssignment, {
  foreignKey: 'session_id',
  as: 'assignments'
});
db.classSessionAssignment.belongsTo(db.classSession, {
  foreignKey: 'session_id',
  as: 'session'
});

db.user.hasMany(db.classSessionMaterial, {
  foreignKey: 'created_by',
  as: 'sessionMaterials'
});
db.classSessionMaterial.belongsTo(db.user, {
  foreignKey: 'created_by',
  as: 'creator'
});

db.user.hasMany(db.classSessionAssignment, {
  foreignKey: 'created_by',
  as: 'sessionAssignments'
});
db.classSessionAssignment.belongsTo(db.user, {
  foreignKey: 'created_by',
  as: 'creator'
});

db.user.hasMany(db.authToken, { foreignKey: 'user_id', as: 'tokens' });
db.authToken.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

db.user.hasMany(db.passwordResetOtp, {
  foreignKey: 'user_id',
  as: 'passwordResetOtps'
});
db.passwordResetOtp.belongsTo(db.user, { foreignKey: 'user_id', as: 'user' });

module.exports = db;
