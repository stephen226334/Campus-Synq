const mongoose = require('mongoose');
const { MONGODB_URI, DB_NAME, NODE_ENV } = require('./env');


/**
 * Masks sensitive credentials from connection strings for safe logging
 * @param {string} uri
 * @returns {string} Masked URI or target host
 */
const maskUri = (uri) => {
  if (!uri) return 'undefined';
  try {
    return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
  } catch {
    return '***masked***';
  }
};

// Setup Mongoose connection lifecycle listeners
mongoose.connection.on('connected', () => {
  const host = mongoose.connection.host || 'cluster';
  const name = mongoose.connection.name || DB_NAME || 'campus_synq';
  console.log(`[MongoDB Lifecycle]: Connected to ${host}/${name}`);
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

/**
 * Connect to MongoDB Atlas with enterprise safety options
 * @param {string} [customUri] Optional override URI
 * @returns {Promise<typeof mongoose>}
 */
const connectDB = async (customUri = null) => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  const targetUri = customUri || MONGODB_URI;

  if (!targetUri) {
    throw new Error(
      '[Database Error]: MONGODB_URI is not defined. Please configure MONGODB_URI in backend/.env.'
    );
  }

  const isAtlas = targetUri.includes('mongodb.net') || targetUri.startsWith('mongodb+srv://');
  const connectionType = isAtlas ? 'MongoDB Atlas (Cloud Cluster)' : 'Local MongoDB';

  console.log(`[Database] Initiating connection to ${connectionType}...`);

  const options = {
    autoIndex: NODE_ENV !== 'production',
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    dbName: DB_NAME || 'campus_synq'
  };

  try {
    const conn = await mongoose.connect(targetUri, options);
    const host = conn.connection.host || (isAtlas ? 'Cluster Host' : '127.0.0.1');
    const port = conn.connection.port || (isAtlas ? 27017 : 27017);
    const dbName = conn.connection.name || DB_NAME || 'campus_synq';

    if (isAtlas) {
      console.log('[Database] Connected to MongoDB Atlas successfully.');
      console.log(`[Database] Active Database: ${dbName} (Target: ${host})`);
    } else {
      console.log(`[Database] Connected to Local MongoDB successfully.`);
      console.log(`[Database] Active Database: ${dbName} (Target: ${host}:${port})`);
    }

    return conn;
  } catch (error) {
    console.error(`[Database Error]: Connection to ${connectionType} failed.`);

    if (isAtlas && (error.message.includes('SSL alert number 80') || error.name === 'MongooseServerSelectionError')) {
      console.error(
        `[Database Diagnostic]: MongoDB Atlas rejected the connection (${error.message}).\n` +
        `  Potential Cause: Current client IP address is not whitelisted in Atlas Network Access IP Access List.\n` +
        `  Action: Check the Atlas console -> Network Access -> IP Access List.`
      );
    } else if (!isAtlas) {
      console.error(
        `[Database Diagnostic]: Local MongoDB instance is not reachable (${error.message}).\n` +
        `  Action: Verify MongoDB service is running locally on port 27017 (e.g., net start MongoDB).`
      );
    } else {
      console.error(`[Database Diagnostic]: ${error.message}`);
    }

    // Do not silently fall back to an alternate database
    throw error;
  }
};

/**
 * Gracefully close database connection
 */
const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
    console.log('[MongoDB Lifecycle]: Database connection closed.');
  }
};

/**
 * Check if database is currently connected and ready
 * @returns {boolean}
 */
const isDbConnected = () => mongoose.connection.readyState === 1;

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.disconnectDB = disconnectDB;
module.exports.isDbConnected = isDbConnected;
module.exports.maskUri = maskUri;
