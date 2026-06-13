const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../../connection');
const { USER_TYPES, TOKEN_TYPES, USER_TYPE_LIST } = require('./auth.constants');
const { JWT_SECRET } = require('./auth.middleware');

const User = db.user;
const AuthToken = db.authToken;
const Academy = db.academy;

const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';

const parseExpiryToDate = (expiry) => {
  const match = expiry.match(/^(\d+)([dhms])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }

  const value = Number(match[1]);
  const unit = match[2];
  const multipliers = { s: 1000, m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
  return new Date(Date.now() + value * multipliers[unit]);
};

const hashPassword = async (password) => bcrypt.hash(password, 10);

const comparePassword = async (password, hash) => bcrypt.compare(password, hash);

const buildTokenPayload = (user) => ({
  userId: user.id,
  email: user.email,
  type: user.type,
  academyId: user.academyId || null
});

const createAccessToken = (user) =>
  jwt.sign(buildTokenPayload(user), JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

const createRefreshToken = () => crypto.randomBytes(48).toString('hex');

const saveToken = async ({ userId, token, type, expiresAt }) =>
  AuthToken.create({
    userId,
    token,
    type,
    expiresAt
  });

const revokeUserTokens = async (userId, type = null) => {
  const where = { userId, revokedAt: null };
  if (type) where.type = type;

  await AuthToken.update({ revokedAt: new Date() }, { where });
};

const validateUserTypeRules = async ({ type, academyId }) => {
  if (!USER_TYPE_LIST.includes(type)) {
    const error = new Error(`Invalid user type. Allowed: ${USER_TYPE_LIST.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (type === USER_TYPES.ADMIN && academyId) {
    const error = new Error('Admin accounts cannot be linked to an academy');
    error.status = 400;
    throw error;
  }

  if ([USER_TYPES.ACADEMIC, USER_TYPES.STUDENT, USER_TYPES.TEACHER].includes(type)) {
    if (!academyId) {
      const error = new Error('academyId is required for academic, student, and teacher accounts');
      error.status = 400;
      throw error;
    }

    const academy = await Academy.findByPk(academyId);
    if (!academy) {
      const error = new Error('Academy not found');
      error.status = 404;
      throw error;
    }

    if (type === USER_TYPES.STUDENT && academy.status !== 'active') {
      const error = new Error(
        'Selected academy is not active. Choose an approved academy.'
      );
      error.status = 400;
      throw error;
    }
  }
};

const registerUser = async (payload) => {
  await validateUserTypeRules(payload);

  const existingUser = await User.scope('withPassword').findOne({
    where: { email: payload.email }
  });

  if (existingUser) {
    const error = new Error('A user with this email already exists');
    error.status = 409;
    throw error;
  }

  const hashedPassword = await hashPassword(payload.password);

  return User.create({
    email: payload.email,
    password: hashedPassword,
    type: payload.type,
    name: payload.name,
    phone: payload.phone || null,
    academyId: payload.academyId || null
  });
};

const issueAuthTokens = async (user) => {
  await revokeUserTokens(user.id);

  const accessToken = createAccessToken(user);
  const refreshToken = createRefreshToken();

  await saveToken({
    userId: user.id,
    token: accessToken,
    type: TOKEN_TYPES.ACCESS,
    expiresAt: parseExpiryToDate(ACCESS_TOKEN_EXPIRY)
  });

  await saveToken({
    userId: user.id,
    token: refreshToken,
    type: TOKEN_TYPES.REFRESH,
    expiresAt: parseExpiryToDate(REFRESH_TOKEN_EXPIRY)
  });

  await User.update({ lastLoginAt: new Date() }, { where: { id: user.id } });

  return { accessToken, refreshToken };
};

const loginUser = async ({ email, password }) => {
  const user = await User.scope('withPassword').findOne({
    where: { email }
  });

  if (!user) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  if (!user.isActive) {
    const error = new Error('Your account is inactive. Contact support.');
    error.status = 403;
    throw error;
  }

  const isValid = await comparePassword(password, user.password);

  if (!isValid) {
    const error = new Error('Invalid email or password');
    error.status = 401;
    throw error;
  }

  const tokens = await issueAuthTokens(user);
  const safeUser = await User.findByPk(user.id);

  return { user: safeUser, ...tokens };
};

const refreshSession = async (refreshToken) => {
  const storedToken = await AuthToken.findOne({
    where: {
      token: refreshToken,
      type: TOKEN_TYPES.REFRESH,
      revokedAt: null
    }
  });

  if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
    const error = new Error('Invalid or expired refresh token');
    error.status = 401;
    throw error;
  }

  const user = await User.findByPk(storedToken.userId);

  if (!user || !user.isActive) {
    const error = new Error('User account is inactive or not found');
    error.status = 401;
    throw error;
  }

  const tokens = await issueAuthTokens(user);
  return { user, ...tokens };
};

const logoutUser = async (userId) => {
  await revokeUserTokens(userId);
  return true;
};

const getProfile = async (userId) =>
  User.findByPk(userId, {
    include: [
      {
        model: Academy,
        as: 'academy',
        attributes: [
          'id',
          'name',
          'slug',
          'email',
          'phone',
          'address',
          'city',
          'state',
          'country',
          'postalCode',
          'website',
          'description',
          'status'
        ]
      }
    ]
  });

const updateProfile = async (userId, payload) => {
  const user = await User.findByPk(userId);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  const updates = {};

  if (payload.name !== undefined) {
    const trimmedName = payload.name.trim();
    if (!trimmedName) {
      const error = new Error('Name is required');
      error.status = 400;
      throw error;
    }
    updates.name = trimmedName;
  }

  if (payload.phone !== undefined) {
    updates.phone = payload.phone?.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    const error = new Error('No profile fields provided to update');
    error.status = 400;
    throw error;
  }

  await user.update(updates);
  return getProfile(userId);
};

const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.scope('withPassword').findByPk(userId);

  if (!user) {
    const error = new Error('User not found');
    error.status = 404;
    throw error;
  }

  if (!currentPassword) {
    const error = new Error('Current password is required');
    error.status = 400;
    throw error;
  }

  if (!newPassword || newPassword.length < 6) {
    const error = new Error('New password must be at least 6 characters');
    error.status = 400;
    throw error;
  }

  const isValid = await comparePassword(currentPassword, user.password);

  if (!isValid) {
    const error = new Error('Current password is incorrect');
    error.status = 400;
    throw error;
  }

  const hashedPassword = await hashPassword(newPassword);
  await user.update({ password: hashedPassword });

  return true;
};

module.exports = {
  registerUser,
  loginUser,
  refreshSession,
  logoutUser,
  getProfile,
  updateProfile,
  changePassword,
  issueAuthTokens,
  USER_TYPES
};
