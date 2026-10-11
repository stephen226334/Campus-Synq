/**
 * CampusSynq — Non-Destructive Data Migration Utility: Local MongoDB -> MongoDB Atlas
 *
 * Safely copies existing collections and documents from local MongoDB to Atlas
 * using idempotent upserts ($setOnInsert) to protect existing Atlas records.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');

const COLLECTIONS = [
  'admins',
  'faculties',
  'semesters',
  'classSections',
  'classrooms',
  'labs',
  'auditoriums',
  'periods',
  'substitutions',
  'subjects',
  'timetableEntries'
];

async function migrateData() {
  const localUri = process.env.LOCAL_MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_synq';
  const atlasUri = process.env.MONGODB_URI;

  if (!atlasUri) {
    console.error('[Migration Error]: MONGODB_URI is not defined in environment.');
    process.exit(1);
  }

  console.log('==============================================================');
  console.log(' CampusSynq — Database Migration: Local MongoDB -> Atlas');
  console.log('==============================================================');

  let localConn = null;
  let atlasConn = null;

  try {
    // 1. Connect to Local MongoDB Source
    console.log('\n[1/3] Connecting to local MongoDB source (127.0.0.1:27017)...');
    localConn = await mongoose.createConnection(localUri, {
      serverSelectionTimeoutMS: 3000
    }).asPromise();
    console.log('✔ Connected to local source database:', localConn.name);

    // 2. Connect to Atlas Destination
    console.log('\n[2/3] Connecting to MongoDB Atlas destination...');
    atlasConn = await mongoose.createConnection(atlasUri, {
      serverSelectionTimeoutMS: 8000,
      dbName: process.env.DB_NAME || 'campus_synq'
    }).asPromise();
    console.log(`✔ Connected to Atlas cluster: ${atlasConn.host}/${atlasConn.name}`);

    // 3. Migrate Collections
    console.log('\n[3/3] Migrating collections with non-destructive upserts...');
    let totalMigrated = 0;
    let totalSkipped = 0;

    for (const colName of COLLECTIONS) {
      const sourceCol = localConn.db.collection(colName);
      const destCol = atlasConn.db.collection(colName);

      const docs = await sourceCol.find({}).toArray();
      if (docs.length === 0) {
        console.log(`  - ${colName}: 0 records in local source (skipped)`);
        continue;
      }

      let insertedCount = 0;
      let existingCount = 0;

      for (const doc of docs) {
        const res = await destCol.updateOne(
          { _id: doc._id },
          { $setOnInsert: doc },
          { upsert: true }
        );

        if (res.upsertedCount > 0) {
          insertedCount++;
        } else {
          existingCount++;
        }
      }

      totalMigrated += insertedCount;
      totalSkipped += existingCount;

      console.log(
        `  - ${colName}: ${docs.length} local records -> ${insertedCount} inserted to Atlas, ${existingCount} already present`
      );
    }

    console.log('\n==============================================================');
    console.log(`✔ Migration Summary: ${totalMigrated} new records inserted, ${totalSkipped} existing records preserved.`);
    console.log('==============================================================\n');
  } catch (error) {
    console.error('\n✖ [Migration Failed]:', error.message);
    if (error.message.includes('SSL alert number 80') || error.message.includes('whitelist')) {
      console.error(
        '\n[Root Cause]: MongoDB Atlas Network Access rejected the connection (TLS Alert 80).' +
        '\nEnsure your current public IP is added to the Atlas IP Access List under Network Access.'
      );
    }
  } finally {
    if (localConn) await localConn.close();
    if (atlasConn) await atlasConn.close();
  }
}

if (require.main === module) {
  migrateData();
}

module.exports = migrateData;
