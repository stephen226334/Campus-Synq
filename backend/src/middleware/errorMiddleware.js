const { errorResponse } = require('../utils/response');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = null;

  // Handle Mongoose duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue || {})[0];
    const val = err.keyValue ? err.keyValue[field] : '';
    if (field === 'code') {
      message = `Subject code '${val}' already exists.`;
    } else if (field === 'roomNumber') {
      message = `Room number '${val}' already exists.`;
    } else if (field === 'labNumber') {
      message = `Lab number '${val}' already exists.`;
    } else if (field === 'auditoriumNumber') {
      message = `Auditorium number '${val}' already exists.`;
    } else if (field === 'email') {
      message = `Email '${val}' is already registered.`;
    } else {
      message = `Duplicate entry for ${field}: '${val}'. Must be unique.`;
    }
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'.`;
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
  }

  // Log error internally in development
  if (process.env.NODE_ENV !== 'test') {
    console.error(`[Error] ${statusCode} - ${message}`, err.stack ? err.stack.split('\n')[1] : '');
  }

  return errorResponse(res, message, statusCode, errors);
};

// 404 handler for undefined routes
const notFoundHandler = (req, res) => {
  return errorResponse(res, `API route not found: ${req.method} ${req.originalUrl}`, 404);
};

module.exports = {
  errorHandler,
  notFoundHandler
};
