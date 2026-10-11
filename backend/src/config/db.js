const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

// Setup Mongoose connection lifecycle listeners
mongoose.connection.on('connected', () => {
  console.log('[MongoDB Lifecycle]: Connection established.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Lifecycle]: Database disconnected.');
});

mongoose.connection.on('reconnected', () => {
  console.log('[MongoDB Lifecycle]: Database re-connected successfully.');
});

mongoose.connection.on('error', (err) => {
  console.error('[MongoDB Lifecycle Error]:', err.message);
});

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI, {
      autoIndex: true
    });
    console.log(`[MongoDB Connected]: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error]: ${error.message}`);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    throw error;
  }
};

module.exports = connectDB;
