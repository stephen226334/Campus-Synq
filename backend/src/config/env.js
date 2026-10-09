require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Validate mandatory configuration in production
if (isProduction) {
  if (
    !process.env.JWT_SECRET ||
    process.env.JWT_SECRET === 'campus_synq_super_secret_jwt_key_2026_cs_department' ||
    process.env.JWT_SECRET.length < 32
  ) {
    throw new Error(
      '[CRITICAL CONFIG ERROR]: JWT_SECRET must be explicitly configured with a secure key of at least 32 characters in production.'
    );
  }
  if (!process.env.MONGODB_URI) {
    throw new Error(
      '[CRITICAL CONFIG ERROR]: MONGODB_URI environment variable is required in production.'
    );
  }
}

const JWT_SECRET =
  process.env.JWT_SECRET ||
  (isProduction ? '' : 'campus_synq_dev_jwt_key_2026_computer_science_dept');

module.exports = {
  PORT: parseInt(process.env.PORT, 10) || 5000,
  NODE_ENV,
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_synq',
  JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CORS_ORIGINS: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim())
    : [],
  // Mail configuration
  MAIL_HOST: process.env.MAIL_HOST || 'smtp.ethereal.email',
  MAIL_PORT: process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587,
  MAIL_USER: process.env.MAIL_USER || '',
  MAIL_PASSWORD: process.env.MAIL_PASSWORD || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Campus Synq Administration <admin@campussynq.com>'
};
