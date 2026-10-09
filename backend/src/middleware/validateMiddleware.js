const { validationResult } = require('express-validator');
const { errorResponse } = require('../utils/response');

const validateMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return errorResponse(res, formattedErrors[0].message, 400, formattedErrors);
  }
  next();
};

module.exports = validateMiddleware;
