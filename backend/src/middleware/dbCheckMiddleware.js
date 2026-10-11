const mongoose = require('mongoose');
const { errorResponse } = require('../utils/response');

/**
 * Middleware that checks MongoDB connectivity before executing database-dependent operations.
 * Prevents requests from hanging in Mongoose buffer queue when database is offline.
 */
const dbCheckMiddleware = (req, res, next) => {
  // Allow health endpoint to respond regardless of DB state
  if (req.path === '/health' || req.originalUrl === '/api/v1/health') {
    return next();
  }

  // readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  const readyState = mongoose.connection.readyState;

  if (readyState !== 1) {
    return errorResponse(
      res,
      'Database service is currently unavailable or disconnected. Please retry in a few moments.',
      503,
      null,
      {
        code: 'DB_UNAVAILABLE',
        dataSaved: false,
        recommendation: 'Check that the MongoDB database service is running and accessible.'
      }
    );
  }

  next();
};

module.exports = dbCheckMiddleware;
