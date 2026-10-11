const { errorResponse } = require('../utils/response');

/**
 * Centralized Express Error Handling Middleware
 * Catches asynchronous errors, Mongoose operational errors, authentication failures,
 * and database connection errors, returning structured, user-safe JSON responses.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'An unexpected error occurred';
  let errors = err.errors || null;
  let code = err.code || null;
  let recommendation = err.recommendation || null;
  let dataSaved = false;

  // 1. Handle MongoDB & Mongoose Network / Server Selection / Disconnection Errors
  if (
    err.name === 'MongooseServerSelectionError' ||
    err.name === 'MongoServerSelectionError' ||
    err.name === 'MongoNetworkError' ||
    err.name === 'MongoTimeoutError' ||
    err.name === 'MongoTopologyClosedError' ||
    err.name === 'MongoWaitQueueTimeoutError'
  ) {
    statusCode = 503;
    message = 'Database service is temporarily unavailable. Please retry in a few moments.';
    code = 'DB_UNAVAILABLE';
    recommendation = 'Check whether the MongoDB service is running and database network access is allowed.';
    dataSaved = false;
  }

  // 2. Handle Mongoose Duplicate Key Error (E11000)
  else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_RESOURCE';
    const field = Object.keys(err.keyValue || {})[0];
    const val = err.keyValue ? err.keyValue[field] : '';

    if (field === 'code') {
      message = `Subject code '${val}' already exists.`;
      recommendation = 'Enter a unique curricular subject code.';
    } else if (field === 'roomNumber') {
      message = `Room number '${val}' already exists.`;
      recommendation = 'Choose a unique classroom number.';
    } else if (field === 'labNumber') {
      message = `Lab number '${val}' already exists.`;
      recommendation = 'Choose a unique laboratory identifier.';
    } else if (field === 'auditoriumNumber') {
      message = `Auditorium number '${val}' already exists.`;
      recommendation = 'Choose a unique auditorium number.';
    } else if (field === 'email' || field === 'officialEmail') {
      message = `Email '${val}' is already registered in the system.`;
      recommendation = 'Use a distinct email address or sign in to the existing account.';
    } else if (field === 'facultyId') {
      message = `Faculty ID '${val}' is already assigned.`;
      recommendation = 'Provide a unique faculty identifier.';
    } else if (field === 'periodNumber') {
      message = `Period slot '${val}' already exists.`;
      recommendation = 'Choose a distinct period number or modify the existing slot.';
    } else {
      message = `Duplicate entry for ${field}: '${val}'. Must be unique.`;
      recommendation = `Provide a unique value for ${field}.`;
    }
  }

  // 3. Handle Mongoose CastError (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'.`;
    code = 'INVALID_IDENTIFIER';
    recommendation = 'Ensure the requested entity ID matches the required format.';
  }

  // 4. Handle Mongoose ValidationError
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    code = 'VALIDATION_FAILED';
    recommendation = 'Review the highlighted fields and correct the input format.';
    if (err.errors) {
      errors = Object.values(err.errors).map((e) => ({
        field: e.path,
        message: e.message
      }));
    }
  }

  // 5. Handle JWT Authentication Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid authentication token provided.';
    code = 'UNAUTHORIZED';
    recommendation = 'Please sign in again to obtain a valid session token.';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Authentication session has expired. Please log in again.';
    code = 'SESSION_EXPIRED';
    recommendation = 'Sign in with your credentials to refresh your session.';
  }

  // 6. Handle Document Not Found Error
  else if (err.name === 'DocumentNotFoundError') {
    statusCode = 404;
    message = 'Requested record was not found in the database.';
    code = 'NOT_FOUND';
    recommendation = 'The record may have been deleted or moved. Refresh the view to check current records.';
  }

  // 7. Handle Referential Integrity Deletion Block
  else if (statusCode === 400 && message && message.includes('currently referenced by')) {
    code = 'REFERENTIAL_INTEGRITY_VIOLATION';
    recommendation = 'Reassign or delete the associated dependent records before deleting this master record.';
  }

  // 8. Handle Timetable Conflicts
  else if (statusCode === 409) {
    code = code || 'RESOURCE_CONFLICT';
    recommendation = recommendation || 'Choose a different timetable period, room, or faculty member to avoid the scheduling collision.';
  }

  // 9. If unexpected 500 error, mark dataSaved as UNCERTAIN
  if (statusCode >= 500 && statusCode !== 503) {
    dataSaved = 'UNCERTAIN';
    if (!recommendation) {
      recommendation = 'Please check the current record or refresh the page before retrying.';
    }
  }

  // Structured server-side logging without leaking secrets or credentials
  if (process.env.NODE_ENV !== 'test') {
    const correlationId = req.id || 'N/A';
    const logPayload = {
      timestamp: new Date().toISOString(),
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      code,
      message
    };
    console.error(`[API Error ${statusCode}]`, JSON.stringify(logPayload));
  }

  return errorResponse(res, message, statusCode, errors, {
    code,
    recommendation,
    dataSaved
  });
};

/**
 * 404 handler for undefined API routes
 */
const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `API endpoint not found: ${req.method} ${req.originalUrl}`,
    404,
    null,
    {
      code: 'ROUTE_NOT_FOUND',
      recommendation: 'Check the requested URL and HTTP method.'
    }
  );
};

module.exports = {
  errorHandler,
  notFoundHandler
};
