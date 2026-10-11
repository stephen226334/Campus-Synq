/**
 * Standard API response formatters with enhanced error metadata
 */

const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const getDefaultErrorCode = (statusCode) => {
  switch (statusCode) {
    case 400:
      return 'VALIDATION_FAILED';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'RESOURCE_CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'RATE_LIMITED';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
};

const getDefaultRecommendation = (statusCode, code) => {
  switch (statusCode) {
    case 400:
      return 'Check the required fields and verify the data format before retrying.';
    case 401:
      return 'Please sign in with valid credentials to continue.';
    case 403:
      return 'Your account lacks permission to perform this action.';
    case 404:
      return 'The requested resource was not found. Verify the identifier.';
    case 409:
      return 'A conflicting record already exists. Check existing records before proceeding.';
    case 422:
      return 'The submitted data could not be processed. Review any highlighted fields.';
    case 429:
      return 'Too many requests. Please wait a few moments before trying again.';
    case 503:
      return 'The database or backend service is temporarily unavailable. Please retry shortly.';
    default:
      return 'An unexpected problem occurred. Please retry or contact system administration.';
  }
};

const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null, options = {}) => {
  const code = options.code || getDefaultErrorCode(statusCode);
  const payload = {
    success: false,
    message,
    code,
    dataSaved: options.dataSaved !== undefined ? options.dataSaved : false,
    recommendation: options.recommendation || getDefaultRecommendation(statusCode, code)
  };

  if (errors) {
    payload.errors = errors;
  }

  if (options.details) {
    payload.details = options.details;
  }

  return res.status(statusCode).json(payload);
};

module.exports = {
  successResponse,
  errorResponse
};
