const crypto = require('crypto');

/**
 * Attaches a unique request correlation ID to incoming requests and response headers.
 */
const requestCorrelation = (req, res, next) => {
  const correlationId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = correlationId;
  res.setHeader('X-Request-Id', correlationId);
  next();
};

module.exports = requestCorrelation;
