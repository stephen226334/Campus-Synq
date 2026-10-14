const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { JWT_SECRET } = require('../src/config/env');
const connectDB = require('../src/config/db');

const {
  parseTimeToMinutes,
  parsePeriodNumber,
  sortPeriodsChronologically,
  sortTimetableEntries
} = require('../src/utils/timetableSort');

const Admin = require('../src/models/Admin');
const Period = require('../src/models/Period');
const TimetableEntry = require('../src/models/TimetableEntry');

let adminToken = '';
let deanToken = '';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Create or resolve admin token for test requests
  let admin = await Admin.findOne({ role: 'ADMIN' });
  if (!admin) {
    admin = await Admin.create({
      username: 'test_admin_sort',
      email: 'admin_sort@campussynq.com',
      password: 'password123',
      role: 'ADMIN',
      status: 'ACTIVE'
    });
  } else if (admin.status !== 'ACTIVE') {
    admin.status = 'ACTIVE';
    await admin.save();
  }

  adminToken = jwt.sign(
    { userId: admin._id, role: 'ADMIN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  let dean = await Admin.findOne({ role: 'DEAN' });
  if (!dean) {
    dean = await Admin.create({
      username: 'test_dean_sort',
      email: 'dean_sort@campussynq.com',
      password: 'password123',
      role: 'DEAN',
      status: 'ACTIVE'
    });
  } else if (dean.status !== 'ACTIVE') {
    dean.status = 'ACTIVE';
    await dean.save();
  }

  deanToken = jwt.sign(
    { userId: dean._id, role: 'DEAN' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
});

test.describe('Chronological Timetable & Period Sorting Suite', () => {

  test('1. Time Parser: accurately converts 12h times to minutes from midnight across noon and midnight', () => {
    assert.equal(parseTimeToMinutes('12:00 AM'), 0);
    assert.equal(parseTimeToMinutes('12:30 AM'), 30);
    assert.equal(parseTimeToMinutes('1:00 AM'), 60);
    assert.equal(parseTimeToMinutes('9:00 AM'), 540);
    assert.equal(parseTimeToMinutes('10:00 AM'), 600);
    assert.equal(parseTimeToMinutes('11:00 AM'), 660);
    assert.equal(parseTimeToMinutes('11:50 AM'), 710);
    assert.equal(parseTimeToMinutes('12:00 PM'), 720); // NOON
    assert.equal(parseTimeToMinutes('12:50 PM'), 770);
    assert.equal(parseTimeToMinutes('1:00 PM'), 780);
    assert.equal(parseTimeToMinutes('1:40 PM'), 820);
    assert.equal(parseTimeToMinutes('2:40 PM'), 880);
    assert.equal(parseTimeToMinutes('3:40 PM'), 940);
    assert.equal(parseTimeToMinutes('11:59 PM'), 1439);
  });

  test('2. Time Parser: handles missing, null, and invalid time strings safely by returning MAX_SAFE_INTEGER', () => {
    assert.equal(parseTimeToMinutes(null), Number.MAX_SAFE_INTEGER);
    assert.equal(parseTimeToMinutes(undefined), Number.MAX_SAFE_INTEGER);
    assert.equal(parseTimeToMinutes(''), Number.MAX_SAFE_INTEGER);
    assert.equal(parseTimeToMinutes('invalid-time'), Number.MAX_SAFE_INTEGER);
    assert.equal(parseTimeToMinutes('25:00 PM'), Number.MAX_SAFE_INTEGER);
  });

  test('3. Period Sorting: sorts periods chronologically regardless of creation order or sequence gaps', () => {
    // Simulate P4 created after P5 and P6
    const mockPeriods = [
      { periodNumber: 'P5', startTime: '1:40 PM', endTime: '2:30 PM', order: 5 },
      { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM', order: 2 },
      { periodNumber: 'P6', startTime: '2:40 PM', endTime: '3:30 PM', order: 6 },
      { periodNumber: 'P4', startTime: '12:00 PM', endTime: '12:50 PM', order: 4 },
      { periodNumber: 'P3', startTime: '11:00 AM', endTime: '11:50 AM', order: 3 },
      { periodNumber: 'P1', startTime: '9:00 AM', endTime: '9:50 AM', order: 1 },
      { periodNumber: 'P7', startTime: '3:40 PM', endTime: '4:30 PM', order: 7 }
    ];

    const sorted = sortPeriodsChronologically(mockPeriods);
    const resultOrder = sorted.map(p => p.periodNumber);

    assert.deepEqual(resultOrder, ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
  });

  test('4. Textual Label Immunity: P10 (4:40 PM) is NOT sorted before P2 (10:00 AM) alphabetically', () => {
    const mockPeriods = [
      { periodNumber: 'P10', startTime: '4:40 PM', endTime: '5:30 PM', order: 10 },
      { periodNumber: 'P1', startTime: '9:00 AM', endTime: '9:50 AM', order: 1 },
      { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM', order: 2 }
    ];

    const sorted = sortPeriodsChronologically(mockPeriods);
    const resultOrder = sorted.map(p => p.periodNumber);

    // Alphabetically P10 comes before P2, but chronologically P1 (9 AM) -> P2 (10 AM) -> P10 (4:40 PM)
    assert.deepEqual(resultOrder, ['P1', 'P2', 'P10']);
  });

  test('5. Period Sorting: Period created later with earlier start time appears in correct chronological position', () => {
    const periods = [
      { periodNumber: 'LateSlot', startTime: '11:00 AM', endTime: '11:50 AM', order: 1 },
      { periodNumber: 'EarlySlot', startTime: '8:00 AM', endTime: '8:50 AM', order: 2 } // order 2 but earlier time
    ];

    const sorted = sortPeriodsChronologically(periods);
    assert.equal(sorted[0].periodNumber, 'EarlySlot');
    assert.equal(sorted[1].periodNumber, 'LateSlot');
  });

  test('6. Timetable Entry Sorting: correctly places P4 (12:00 PM) between P3 (11:00 AM) and P5 (1:40 PM)', () => {
    const entries = [
      { _id: '1', day: 'Monday', period: { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM' } },
      { _id: '2', day: 'Monday', period: { periodNumber: 'P3', startTime: '11:00 AM', endTime: '11:50 AM' } },
      { _id: '3', day: 'Monday', period: { periodNumber: 'P5', startTime: '1:40 PM', endTime: '2:30 PM' } },
      { _id: '4', day: 'Monday', period: { periodNumber: 'P6', startTime: '2:40 PM', endTime: '3:30 PM' } },
      { _id: '5', day: 'Monday', period: { periodNumber: 'P4', startTime: '12:00 PM', endTime: '12:50 PM' } } // inserted last
    ];

    const sorted = sortTimetableEntries(entries);
    const labels = sorted.map(e => e.period.periodNumber);

    assert.deepEqual(labels, ['P2', 'P3', 'P4', 'P5', 'P6']);
  });

  test('7. Timetable Entry Sorting: handles All Days views by sorting Monday through Sunday, and chronologically within each day', () => {
    const entries = [
      { _id: '1', day: 'Wednesday', period: { periodNumber: 'P1', startTime: '9:00 AM', endTime: '9:50 AM' } },
      { _id: '2', day: 'Monday', period: { periodNumber: 'P5', startTime: '1:40 PM', endTime: '2:30 PM' } },
      { _id: '3', day: 'Monday', period: { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM' } },
      { _id: '4', day: 'Tuesday', period: { periodNumber: 'P3', startTime: '11:00 AM', endTime: '11:50 AM' } },
      { _id: '5', day: 'Monday', period: { periodNumber: 'P4', startTime: '12:00 PM', endTime: '12:50 PM' } }
    ];

    const sorted = sortTimetableEntries(entries);

    // Monday entries must come first, sorted P2 (10 AM) -> P4 (12 PM) -> P5 (1:40 PM)
    assert.equal(sorted[0].day, 'Monday');
    assert.equal(sorted[0].period.periodNumber, 'P2');
    assert.equal(sorted[1].day, 'Monday');
    assert.equal(sorted[1].period.periodNumber, 'P4');
    assert.equal(sorted[2].day, 'Monday');
    assert.equal(sorted[2].period.periodNumber, 'P5');

    // Tuesday then Wednesday
    assert.equal(sorted[3].day, 'Tuesday');
    assert.equal(sorted[4].day, 'Wednesday');
  });

  test('8. Missing / Invalid Period Safety: entries referencing missing periods sort safely at end without throwing', () => {
    const entries = [
      { _id: 'valid-2', day: 'Monday', period: { periodNumber: 'P2', startTime: '10:00 AM' } },
      { _id: 'missing-p', day: 'Monday', period: null },
      { _id: 'invalid-time', day: 'Monday', period: { periodNumber: 'PX', startTime: 'broken' } },
      { _id: 'valid-1', day: 'Monday', period: { periodNumber: 'P1', startTime: '9:00 AM' } }
    ];

    const sorted = sortTimetableEntries(entries);

    assert.equal(sorted[0]._id, 'valid-1'); // 9:00 AM
    assert.equal(sorted[1]._id, 'valid-2'); // 10:00 AM
    // Invalid & missing periods placed at the end
    assert.ok(sorted[2]._id === 'invalid-time' || sorted[2]._id === 'missing-p');
    assert.ok(sorted[3]._id === 'invalid-time' || sorted[3]._id === 'missing-p');
  });

  test('9. API Integration: GET /api/v1/admin/timetable returns Monday schedule in chronological period sequence', async () => {
    const res = await request(app)
      .get('/api/v1/admin/timetable?day=Monday')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const mondayEntries = res.body.data;
    if (mondayEntries.length >= 2) {
      for (let i = 0; i < mondayEntries.length - 1; i++) {
        const timeA = parseTimeToMinutes(mondayEntries[i].period?.startTime);
        const timeB = parseTimeToMinutes(mondayEntries[i + 1].period?.startTime);
        assert.ok(timeA <= timeB, `Entry ${i} (${mondayEntries[i].period?.periodNumber}: ${mondayEntries[i].period?.startTime}) must start <= Entry ${i + 1} (${mondayEntries[i + 1].period?.periodNumber}: ${mondayEntries[i + 1].period?.startTime})`);
      }
    }
  });

  test('10. API Integration: GET /api/v1/admin/periods returns all periods sorted chronologically by start time', async () => {
    const res = await request(app)
      .get('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const periods = res.body.data;
    for (let i = 0; i < periods.length - 1; i++) {
      const timeA = parseTimeToMinutes(periods[i].startTime);
      const timeB = parseTimeToMinutes(periods[i + 1].startTime);
      assert.ok(timeA <= timeB, `Period ${periods[i].periodNumber} (${periods[i].startTime}) must start <= Period ${periods[i + 1].periodNumber} (${periods[i + 1].startTime})`);
    }
  });

  test('11. API Integration: GET /api/v1/dean/timetable returns master timetable in strict chronological order', async () => {
    const res = await request(app)
      .get('/api/v1/dean/timetable')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const entries = res.body.data;
    // Check day sequence and time sequence within each day
    const DAY_INDEX = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
    for (let i = 0; i < entries.length - 1; i++) {
      const dayDiff = (DAY_INDEX[entries[i].day] ?? 999) - (DAY_INDEX[entries[i + 1].day] ?? 999);
      if (dayDiff === 0) {
        const timeA = parseTimeToMinutes(entries[i].period?.startTime);
        const timeB = parseTimeToMinutes(entries[i + 1].period?.startTime);
        assert.ok(timeA <= timeB, `Entries on ${entries[i].day} must be sorted chronologically by start time`);
      } else {
        assert.ok(dayDiff < 0, `Days must follow academic order Monday -> Sunday`);
      }
    }
  });

  after(async () => {
    await mongoose.disconnect();
  });
});
