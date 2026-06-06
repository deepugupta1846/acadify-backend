const authService = require('./auth.service');
const { USER_TYPE_LIST, USER_TYPES } = require('./auth.constants');

const validateRegisterBody = (body) => {
  const required = ['email', 'password', 'type', 'name'];
  const missing = required.filter((field) => !body[field]?.trim?.());

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (body.password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.status = 400;
    throw error;
  }

  if (!USER_TYPE_LIST.includes(body.type)) {
    const error = new Error(`Invalid type. Allowed: ${USER_TYPE_LIST.join(', ')}`);
    error.status = 400;
    throw error;
  }
};

const validateLoginBody = (body) => {
  if (!body.email?.trim() || !body.password) {
    const error = new Error('Email and password are required');
    error.status = 400;
    throw error;
  }
};

const formatAuthData = (user, tokens) => ({
  user: {
    id: user.id,
    email: user.email,
    name: user.name,
    type: user.type,
    phone: user.phone,
    academyId: user.academyId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt
  },
  tokens: {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken
  }
});

const validateStudentRegisterBody = (body) => {
  const required = ['email', 'password', 'name', 'academyId'];
  const missing = required.filter((field) => {
    if (field === 'academyId') return !body.academyId;
    return !body[field]?.trim?.();
  });

  if (missing.length > 0) {
    const error = new Error(`Missing required fields: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  if (body.password.length < 6) {
    const error = new Error('Password must be at least 6 characters');
    error.status = 400;
    throw error;
  }
};

const registerStudent = async (req, res, next) => {
  try {
    validateStudentRegisterBody(req.body);

    const user = await authService.registerUser({
      email: req.body.email.trim().toLowerCase(),
      password: req.body.password,
      type: USER_TYPES.STUDENT,
      name: req.body.name.trim(),
      phone: req.body.phone?.trim(),
      academyId: Number(req.body.academyId)
    });

    const tokens = await authService.issueAuthTokens(user);

    return res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: formatAuthData(user, tokens)
    });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    validateRegisterBody(req.body);

    const user = await authService.registerUser({
      email: req.body.email.trim().toLowerCase(),
      password: req.body.password,
      type: req.body.type,
      name: req.body.name.trim(),
      phone: req.body.phone?.trim(),
      academyId: req.body.academyId ? Number(req.body.academyId) : null
    });

    const tokens = await authService.issueAuthTokens(user);

    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: formatAuthData(user, tokens)
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    validateLoginBody(req.body);

    const result = await authService.loginUser({
      email: req.body.email.trim().toLowerCase(),
      password: req.body.password
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: formatAuthData(result.user, result)
    });
  } catch (error) {
    return next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const error = new Error('Refresh token is required');
      error.status = 400;
      throw error;
    }

    const result = await authService.refreshSession(refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: formatAuthData(result.user, result)
    });
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logoutUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    return next(error);
  }
};

const profile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id);

    return res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  register,
  registerStudent,
  login,
  refresh,
  logout,
  profile
};
