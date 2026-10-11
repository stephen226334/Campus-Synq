const { verifyToken } = require('../utils/jwt');
const Admin = require('../models/Admin');
const Faculty = require('../models/Faculty');
const { errorResponse } = require('../utils/response');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return errorResponse(res, 'Authentication required. No token provided.', 401, null, {
        code: 'UNAUTHORIZED',
        recommendation: 'Please provide a valid Bearer token in the Authorization header.'
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return errorResponse(res, 'Token expired. Please login again.', 401, null, {
          code: 'TOKEN_EXPIRED',
          recommendation: 'Your session has expired. Please sign in again with your credentials.'
        });
      }
      return errorResponse(res, 'Invalid token. Authorization denied.', 401, null, {
        code: 'INVALID_TOKEN',
        recommendation: 'Your security token is invalid or corrupt. Please sign in again.'
      });
    }

    if (!decoded || !decoded.userId) {
      return errorResponse(res, 'Malformed token payload.', 401, null, {
        code: 'UNAUTHORIZED',
        recommendation: 'Please obtain a new authentication token by signing in.'
      });
    }

    let user = null;
    if (decoded.role === 'ADMIN' || decoded.role === 'DEAN') {
      user = await Admin.findById(decoded.userId);
    } else if (decoded.role === 'FACULTY' || decoded.role === 'HOD_FACULTY') {
      user = await Faculty.findById(decoded.userId);
    } else {
      user = (await Admin.findById(decoded.userId)) || (await Faculty.findById(decoded.userId));
    }

    if (!user) {
      return errorResponse(res, 'Account not found or deleted.', 401);
    }

    if (user.status !== 'ACTIVE') {
      return errorResponse(res, 'Account is deactivated. Contact administrator.', 403);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Authentication error: ' + error.message, 500);
  }
};

module.exports = authMiddleware;
