const app = require('./app');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');
const seedFacultyPortalData = require('./utils/seedFacultyData');
const mongoose = require('mongoose');

const startServer = async () => {
  try {
    await connectDB();

    // Development seed accounts must be clearly separated from production initialization
    if (NODE_ENV !== 'production' && NODE_ENV !== 'test') {
      await seedFacultyPortalData();
    } else if (NODE_ENV === 'production' && process.env.SEED_DEMO_DATA === 'true') {
      console.warn('[SEED NOTICE]: Explicit SEED_DEMO_DATA requested in production.');
      await seedFacultyPortalData();
    }

    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` Campus Synq Admin Server running on port ${PORT}`);
      console.log(` Environment: ${NODE_ENV}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api/v1`);
      console.log(`===============================================`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('\nShutting down Campus Synq server gracefully...');
      server.close(async () => {
        try {
          await mongoose.connection.close();
          console.log('MongoDB connection closed.');
        } catch (err) {
          console.error('Error closing MongoDB connection:', err);
        }
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
