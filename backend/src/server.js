const app = require('./app');
const connectDB = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');
const seedFacultyPortalData = require('./utils/seedFacultyData');
const mongoose = require('mongoose');

const startServer = async () => {
  try {
    // 1. Establish database connection before starting HTTP listener
    await connectDB();

    // 2. Verify or seed demo accounts in development
    if (NODE_ENV !== 'production' && NODE_ENV !== 'test') {
      await seedFacultyPortalData();
    } else if (NODE_ENV === 'production' && process.env.SEED_DEMO_DATA === 'true') {
      console.warn('[SEED NOTICE]: Explicit SEED_DEMO_DATA requested in production.');
      await seedFacultyPortalData();
    }

    // 3. Start Express HTTP Server
    const server = app.listen(PORT, () => {
      console.log(`===============================================`);
      console.log(` Campus Synq Server running on port ${PORT}`);
      console.log(` Environment: ${NODE_ENV}`);
      console.log(` API Endpoint: http://localhost:${PORT}/api/v1`);
      console.log(` Health Check: http://localhost:${PORT}/api/v1/health`);
      console.log(`===============================================`);
    });

    // 4. Handle Server-level startup errors (specifically EADDRINUSE)
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(
          `\n==============================================================\n` +
          ` [Server Startup Error]: Port ${PORT} is already in use (EADDRINUSE)\n` +
          `==============================================================\n` +
          ` Another instance of Campus Synq backend or another application is\n` +
          ` already listening on port ${PORT}.\n\n` +
          ` Safe solutions:\n` +
          `   1. Stop the existing process using port ${PORT}.\n` +
          `   2. Or run: Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n` +
          `   3. Or configure a different PORT in backend/.env if needed.\n` +
          `==============================================================\n`
        );
        process.exit(1);
      } else {
        console.error(`[Server Error]: Server failed to start:`, error.message);
        process.exit(1);
      }
    });

    // 5. Graceful shutdown handler
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

    process.on('uncaughtException', (err) => {
      console.error('[UNCAUGHT EXCEPTION]:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('[UNHANDLED REJECTION]:', reason);
    });

    process.on('exit', (code) => {
      console.log(`[PROCESS EXIT]: Process exited with code ${code}`);
    });

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('[Server Startup Failure]:', error.message || error);
    process.exit(1);
  }
};

startServer();
