const jwt = require('jsonwebtoken');
const db = require('../../connection');
const { TOKEN_TYPES } = require('./auth.constants');

const JWT_SECRET = process.env.JWT_SECRET || 'acadify-dev-secret';

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      const error = new Error('Authorization token is required');
      error.status = 401;
      throw error;
    }

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const storedToken = await db.authToken.findOne({
      where: {
        token,
        type: TOKEN_TYPES.ACCESS,
        userId: decoded.userId,
        revokedAt: null
      }
    });

    if (!storedToken || new Date(storedToken.expiresAt) < new Date()) {
      const error = new Error('Invalid or expired token');
      error.status = 401;
      throw error;
    }

    const user = await db.user.findByPk(decoded.userId);

    if (!user || !user.isActive) {
      const error = new Error('User account is inactive or not found');
      error.status = 401;
      throw error;
    }

    req.user = user;
    req.auth = decoded;
    return next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error.status = 401;
      error.message = 'Invalid or expired token';
    }
    return next(error);
  }
};

const authorize = (...allowedTypes) => (req, res, next) => {
  if (!req.user) {
    const error = new Error('Authentication required');
    error.status = 401;
    return next(error);
  }

  if (!allowedTypes.includes(req.user.type)) {
    const error = new Error('You do not have permission to access this resource');
    error.status = 403;
    return next(error);
  }

  return next();
};

module.exports = {
  authenticate,
  authorize,
  JWT_SECRET
};
