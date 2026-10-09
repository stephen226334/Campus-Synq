const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { CLIENT_URL, CORS_ORIGINS, NODE_ENV } = require('./config/env');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorMiddleware');
const { securityHeaders, noSqlSanitizer } = require('./middleware/securityMiddleware');

const app = express();

// Security HTTP headers & server signature hiding
app.disable('x-powered-by');
app.use(securityHeaders);

// Request parsing with safe payload limits
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// NoSQL operator injection sanitizer
app.use(noSqlSanitizer);

// CORS configuration
const allowedOrigins = [CLIENT_URL, ...CORS_ORIGINS].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // In development or test, allow requests with no origin, localhost, or configured origins
      if (NODE_ENV !== 'production') {
        if (
          !origin ||
          origin.startsWith('http://localhost:') ||
          origin.startsWith('http://127.0.0.1:') ||
          allowedOrigins.includes(origin)
        ) {
          return callback(null, true);
        }
      } else {
        // In production, strictly enforce allowed origins and trusted server-to-server calls
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
      }
      return callback(new Error(`Origin '${origin}' not permitted by CORS policy`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// Logging (non-sensitive format)
if (NODE_ENV !== 'test') {
  app.use(morgan(NODE_ENV === 'production' ? 'combined' : 'dev'));
}

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    product: 'Campus Synq',
    service: 'Academic Timetable Management API',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/v1', routes);

// 404 handler
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

module.exports = app;
