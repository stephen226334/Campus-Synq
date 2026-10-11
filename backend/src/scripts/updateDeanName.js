const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Admin = require('../models/Admin');

async function updateDeanName() {
  try {
    await connectDB();
    console.log('[Script]: Connected to MongoDB.');

    const dean = await Admin.findOne({ email: 'dean@campussynq.com' });
    if (!dean) {
      console.error('[Script Error]: Dean account dean@campussynq.com not found!');
      process.exit(1);
    }

    console.log(`[Script]: Found existing Dean account.`);
    console.log(`  ID:          ${dean._id}`);
    console.log(`  Email:       ${dean.email}`);
    console.log(`  Role:        ${dean.role}`);
    console.log(`  Old Name:    ${dean.fullName}`);

    dean.fullName = 'Dr. R Kumar';
    await dean.save({ validateBeforeSave: false });

    const updated = await Admin.findOne({ email: 'dean@campussynq.com' });
    console.log(`[Script]: Dean account successfully updated.`);
    console.log(`  New Name:    ${updated.fullName}`);
    console.log(`  ID preserved: ${updated._id.toString() === dean._id.toString()}`);
    console.log(`  Role preserved: ${updated.role}`);

    await mongoose.connection.close();
    console.log('[Script]: Database connection closed.');
    process.exit(0);
  } catch (err) {
    console.error('[Script Error]:', err);
    process.exit(1);
  }
}

updateDeanName();
