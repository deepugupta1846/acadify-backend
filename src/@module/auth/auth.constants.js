const USER_TYPES = Object.freeze({
  ADMIN: 'admin',
  ACADEMIC: 'academic',
  STUDENT: 'student',
  TEACHER: 'teacher'
});

const TOKEN_TYPES = Object.freeze({
  ACCESS: 'access',
  REFRESH: 'refresh'
});

const USER_TYPE_LIST = Object.values(USER_TYPES);

module.exports = {
  USER_TYPES,
  TOKEN_TYPES,
  USER_TYPE_LIST
};
