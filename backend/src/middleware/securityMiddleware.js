const { errorResponse } = require('../utils/response');

/**
 * Lightweight in-memory rate limiter for sensitive endpoints (login, signup)
 */
const rateLimits = new Map();

// Periodic cleanup of expired rate limit entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimits.entries()) {
    if (now > record.resetTime) {
      rateLimits.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 25,
  message = 'Too many requests. Please try again later.'
} = {}) => {
  return (req, res, next) => {
    // Skip rate limiting during automated tests
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip = req.ip || req.connection?.remoteAddress || 'unknown-ip';
    const key = `${req.path}:${ip}`;
    const now = Date.now();

    const current = rateLimits.get(key) || { count: 0, resetTime: now + windowMs };

    if (now > current.resetTime) {
      current.count = 0;
      current.resetTime = now + windowMs;
    }

    current.count += 1;
    rateLimits.set(key, current);

    const remaining = Math.max(0, max - current.count);
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));

    if (current.count > max) {
      const retryAfterSec = Math.ceil((current.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSec);
      return errorResponse(res, message, 429);
    }

    next();
  };
};

/**
 * NoSQL Injection Protection
 * Recursively inspects object keys and strips or blocks MongoDB query operators (starting with '$')
 */
const sanitizeNoSql = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeNoSql);
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) {
      // Disallow MongoDB operators in user inputs
      continue;
    }
    clean[key] = sanitizeNoSql(value);
  }
  return clean;
};

const noSqlSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeNoSql(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeNoSql(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeNoSql(req.params);
  }
  next();
};

/**
 * Security HTTP Headers middleware
 */
const securityHeaders = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  next();
};

module.exports = {
  authRateLimiter: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 25,
    message: 'Too many authentication attempts from this IP. Please try again after 15 minutes.'
  }),
  noSqlSanitizer,
  securityHeaders
};
