const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Admin = require('../src/models/Admin');
const Faculty = require('../src/models/Faculty');
const Period = require('../src/models/Period');
const Semester = require('../src/models/Semester');
const ClassSection = require('../src/models/ClassSection');
const Subject = require('../src/models/Subject');
const Classroom = require('../src/models/Classroom');
const TimetableEntry = require('../src/models/TimetableEntry');
const Substitution = require('../src/models/Substitution');
const { academicEvents, ACADEMIC_EVENTS } = require('../src/utils/eventEmitter');
const { MONGODB_URI } = require('../src/config/env');

describe('Campus Synq — Faculty Portal & Substitution Test Suite', () => {
  let adminToken = '';
  let faculty1Token = '';
  let faculty2Token = '';
  let faculty1Doc = null;
  let faculty2Doc = null;
  let period1 = null;
  let period2 = null;
  let period3 = null;
  let semester = null;
  let sectionA = null;
  let sectionB = null;
  let subjectDS = null;
  let subjectDB = null;
  let classroom101 = null;
  let classroom201 = null;
  let faculty1Entry = null;
  let faculty2Entry = null;

  const TEST_PASSWORD = 'password@123';

  before(async () => {
    // Ensure DB connection
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGODB_URI);
    }

    // 1. Ensure Admin exists
    let admin = await Admin.findOne({ email: 'admin@campussynq.com' }).select('+password');
    if (!admin) {
      admin = await Admin.create({
        fullName: 'Department Admin',
        email: 'admin@campussynq.com',
        password: 'AdminPassword2026!',
        role: 'ADMIN',
        status: 'ACTIVE'
      });
    }

    const adminLoginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@campussynq.com', password: 'AdminPassword2026!' });
    adminToken = adminLoginRes.body.data.token;

    // 2. Setup Master Data entities
    semester = await Semester.findOneAndUpdate(
      { name: 'Semester 5', academicYear: '2026-2027' },
      { name: 'Semester 5', academicYear: '2026-2027' },
      { upsert: true, new: true }
    );

    sectionA = await ClassSection.findOneAndUpdate(
      { name: 'Section A', semester: semester._id },
      { name: 'Section A', semester: semester._id, capacity: 60 },
      { upsert: true, new: true }
    );

    sectionB = await ClassSection.findOneAndUpdate(
      { name: 'Section B', semester: semester._id },
      { name: 'Section B', semester: semester._id, capacity: 60 },
      { upsert: true, new: true }
    );

    subjectDS = await Subject.findOneAndUpdate(
      { code: 'CS-301-F' },
      { name: 'Data Structures', code: 'CS-301-F', semester: semester._id, credits: 4, type: 'THEORY' },
      { upsert: true, new: true }
    );

    subjectDB = await Subject.findOneAndUpdate(
      { code: 'CS-302-F' },
      { name: 'Database Systems', code: 'CS-302-F', semester: semester._id, credits: 4, type: 'THEORY' },
      { upsert: true, new: true }
    );

    classroom101 = await Classroom.findOneAndUpdate(
      { roomNumber: 'CS-101' },
      { roomNumber: 'CS-101', capacity: 60, floor: '1st Floor' },
      { upsert: true, new: true }
    );

    classroom201 = await Classroom.findOneAndUpdate(
      { roomNumber: 'CS-201' },
      { roomNumber: 'CS-201', capacity: 60, floor: '2nd Floor' },
      { upsert: true, new: true }
    );

    // Periods
    period1 = await Period.findOneAndUpdate(
      { periodNumber: 'P1' },
      { periodNumber: 'P1', startTime: '9:00 AM', endTime: '9:50 AM', order: 1 },
      { upsert: true, new: true }
    );

    period2 = await Period.findOneAndUpdate(
      { periodNumber: 'P2' },
      { periodNumber: 'P2', startTime: '10:00 AM', endTime: '10:50 AM', order: 2 },
      { upsert: true, new: true }
    );

    period3 = await Period.findOneAndUpdate(
      { periodNumber: 'P3' },
      { periodNumber: 'P3', startTime: '11:00 AM', endTime: '11:50 AM', order: 3 },
      { upsert: true, new: true }
    );

    // Clean up Monday test entries and substitutions
    await TimetableEntry.deleteMany({ day: 'Monday' });
    await Substitution.deleteMany({});
    await Faculty.deleteMany({
      $or: [
        { officialEmail: { $in: ['subu@campussynq.com', 'john@campussynq.com'] } },
        { facultyId: { $in: ['FAC-SUB-01', 'FAC-JHN-02'] } }
      ]
    });

    faculty1Doc = await Faculty.create({
      fullName: 'Subu',
      facultyId: 'FAC-SUB-01',
      officialEmail: 'subu@campussynq.com',
      personalEmail: 'subu.personal@example.com',
      phone: '9876543210',
      designation: 'Assistant Professor',
      department: 'Computer Science Department',
      password: TEST_PASSWORD,
      role: 'FACULTY',
      status: 'ACTIVE'
    });

    faculty2Doc = await Faculty.create({
      fullName: 'John',
      facultyId: 'FAC-JHN-02',
      officialEmail: 'john@campussynq.com',
      personalEmail: 'john.personal@example.com',
      phone: '9876543211',
      designation: 'Associate Professor',
      department: 'Computer Science Department',
      password: TEST_PASSWORD,
      role: 'FACULTY',
      status: 'ACTIVE'
    });
  });

  test('1. Faculty Login with invalid credentials returns 401', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'subu@campussynq.com', password: 'wrongpassword' });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  test('2. Faculty Login with official email and password succeeds and returns JWT with role FACULTY', async () => {
    const res1 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'subu@campussynq.com', password: TEST_PASSWORD });

    assert.equal(res1.status, 200);
    assert.equal(res1.body.success, true);
    assert.ok(res1.body.data.token);
    assert.equal(res1.body.data.user.fullName, 'Subu');
    assert.equal(res1.body.data.user.role, 'FACULTY');
    assert.equal(res1.body.data.user.officialEmail, 'subu@campussynq.com');
    assert.equal(res1.body.data.user.facultyId, 'FAC-SUB-01');
    faculty1Token = res1.body.data.token;

    const res2 = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'john@campussynq.com', password: TEST_PASSWORD });

    assert.equal(res2.status, 200);
    assert.ok(res2.body.data.token);
    faculty2Token = res2.body.data.token;
  });

  test('3. Backend Role Protection: Faculty token is REJECTED from all Admin endpoints (403)', async () => {
    // Attempt Admin Dashboard
    const res1 = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${faculty1Token}`);
    assert.equal(res1.status, 403);
    assert.equal(res1.body.success, false);

    // Attempt Admin Master Data (Subjects)
    const res2 = await request(app)
      .get('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${faculty1Token}`);
    assert.equal(res2.status, 403);

    // Attempt Admin Master Data (Classrooms)
    const res3 = await request(app)
      .get('/api/v1/admin/classrooms')
      .set('Authorization', `Bearer ${faculty1Token}`);
    assert.equal(res3.status, 403);

    // Attempt Admin Faculty management
    const res4 = await request(app)
      .get('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${faculty1Token}`);
    assert.equal(res4.status, 403);
  });

  test('4. Backend Protection: Unauthenticated requests to Faculty endpoints return 401', async () => {
    const res = await request(app).get('/api/v1/faculty/dashboard');
    assert.equal(res.status, 401);
  });

  test('5. Seed Timetable Sessions for Subu (Monday P1, P3) and John (Monday P2)', async () => {
    // Clear existing for this test day
    await TimetableEntry.deleteMany({ day: 'Monday', faculty: { $in: [faculty1Doc._id, faculty2Doc._id] } });

    // Subu Monday P3: Data Structures, Section A, CS-201
    faculty1Entry = await TimetableEntry.create({
      day: 'Monday',
      period: period3._id,
      semester: semester._id,
      section: sectionA._id,
      subject: subjectDS._id,
      faculty: faculty1Doc._id,
      roomType: 'Classroom',
      roomId: classroom201._id,
      roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 },
      status: 'ACTIVE'
    });

    // Subu Monday P1: Database Systems, Section A, CS-101
    await TimetableEntry.create({
      day: 'Monday',
      period: period1._id,
      semester: semester._id,
      section: sectionA._id,
      subject: subjectDB._id,
      faculty: faculty1Doc._id,
      roomType: 'Classroom',
      roomId: classroom101._id,
      roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 },
      status: 'ACTIVE'
    });

    // John Monday P2: Database Systems, Section B, CS-101
    faculty2Entry = await TimetableEntry.create({
      day: 'Monday',
      period: period2._id,
      semester: semester._id,
      section: sectionB._id,
      subject: subjectDB._id,
      faculty: faculty2Doc._id,
      roomType: 'Classroom',
      roomId: classroom101._id,
      roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 },
      status: 'ACTIVE'
    });

    assert.ok(faculty1Entry);
    assert.ok(faculty2Entry);
  });

  test('6. Faculty Dashboard returns 12-hour formatted time and dynamic metrics', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/dashboard')
      .set('Authorization', `Bearer ${faculty1Token}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    // Faculty information
    assert.equal(data.faculty.fullName, 'Subu');
    assert.equal(data.faculty.officialEmail, 'subu@campussynq.com');
    assert.equal(data.faculty.facultyId, 'FAC-SUB-01');

    // Time verification - 12-hour format strictly (e.g. 10:42 AM, never 10:42 or 14:00)
    assert.ok(data.time.currentTime12h);
    assert.match(data.time.currentTime12h, /^\d{1,2}:\d{2}\s+(AM|PM)$/);
    assert.ok(data.time.currentDay);
    assert.ok(data.time.currentDate);

    // Stats
    assert.ok(typeof data.stats.weeklyClassesCount === 'number');
    assert.ok(data.stats.weeklyClassesCount >= 2);
    assert.ok(data.stats.assignedSubjectsCount >= 1);
  });

  test('7. Faculty Weekly Timetable returns schedule for logged-in faculty only', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/timetable/weekly')
      .set('Authorization', `Bearer ${faculty1Token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    // Verify all returned sessions belong to Subu (faculty1Doc)
    res.body.data.forEach((entry) => {
      const isOwner = entry.faculty._id.toString() === faculty1Doc._id.toString();
      const isSubstitute = entry.substituteFaculty?._id?.toString() === faculty1Doc._id.toString();
      assert.ok(isOwner || isSubstitute, 'Entry should belong to authenticated faculty');
    });
  });

  test('8. Query available substitutes for Monday P3 returns John as available', async () => {
    const res = await request(app)
      .get(`/api/v1/faculty/available-substitutes?day=Monday&periodId=${period3._id}`)
      .set('Authorization', `Bearer ${faculty1Token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));

    const john = res.body.data.find((f) => f.officialEmail === 'john@campussynq.com');
    assert.ok(john, 'John should be listed');
    assert.equal(john.isAvailable, true, 'John should be free during Monday P3');
  });

  test('9. Substitution Security: Modifying another faculty timetable entry is BLOCKED (403)', async () => {
    // Subu tries to substitute John's class (faculty2Entry)
    const res = await request(app)
      .post('/api/v1/faculty/substitution')
      .set('Authorization', `Bearer ${faculty1Token}`)
      .send({
        timetableEntryId: faculty2Entry._id,
        substituteFacultyId: faculty1Doc._id,
        reason: 'Unauthorized attempt'
      });

    assert.equal(res.status, 403);
    assert.match(res.body.message, /Unauthorized/i);
  });

  test('10. Substitution Validation: Self-substitution is BLOCKED (400)', async () => {
    const res = await request(app)
      .post('/api/v1/faculty/substitution')
      .set('Authorization', `Bearer ${faculty1Token}`)
      .send({
        timetableEntryId: faculty1Entry._id,
        substituteFacultyId: faculty1Doc._id, // same as caller
        reason: 'Invalid self substitution'
      });

    assert.equal(res.status, 400);
  });

  test('11. CONFLICT DETECTION: If substitute faculty already has a class in that period, substitution is REJECTED (409)', async () => {
    // Schedule John on Monday P3 as well
    const johnConflictEntry = await TimetableEntry.create({
      day: 'Monday',
      period: period3._id,
      semester: semester._id,
      section: sectionB._id,
      subject: subjectDB._id,
      faculty: faculty2Doc._id,
      roomType: 'Classroom',
      roomId: classroom101._id,
      roomDetails: { roomNumber: 'CS-101', name: 'Classroom CS-101', capacity: 60 },
      status: 'ACTIVE'
    });

    // Subu tries to assign John as substitute for Subu's Monday P3 class
    const res = await request(app)
      .post('/api/v1/faculty/substitution')
      .set('Authorization', `Bearer ${faculty1Token}`)
      .send({
        timetableEntryId: faculty1Entry._id,
        substituteFacultyId: faculty2Doc._id,
        reason: 'Should fail due to faculty collision'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.message, 'Faculty is already assigned during this period.');

    // Cleanup conflict entry
    await johnConflictEntry.deleteOne();
  });

  test('12. Successful Substitution updates MongoDB, sets substituteFaculty, and emits real-time event', async () => {
    let eventFired = false;
    let eventData = null;

    const eventHandler = (data) => {
      eventFired = true;
      eventData = data;
    };
    academicEvents.once(ACADEMIC_EVENTS.SUBSTITUTION_UPDATED, eventHandler);

    // Subu delegates Monday P3 class to John
    const res = await request(app)
      .post('/api/v1/faculty/substitution')
      .set('Authorization', `Bearer ${faculty1Token}`)
      .send({
        timetableEntryId: faculty1Entry._id,
        substituteFacultyId: faculty2Doc._id,
        reason: 'Conference presentation attendance',
        date: '2026-10-05'
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, 'Substitution updated successfully.');

    // Verify DB entry updated
    const updated = await TimetableEntry.findById(faculty1Entry._id).populate('substituteFaculty');
    assert.equal(updated.isSubstituted, true);
    assert.equal(updated.substituteFaculty.fullName, 'John');
    assert.equal(updated.substitutionStatus, 'SUBSTITUTED');

    // Verify Substitution record created
    const subRecord = await Substitution.findOne({ timetableEntry: faculty1Entry._id });
    assert.ok(subRecord);
    assert.equal(subRecord.substituteFaculty.toString(), faculty2Doc._id.toString());
    assert.equal(subRecord.reason, 'Conference presentation attendance');

    // Verify real-time event was emitted
    assert.equal(eventFired, true);
    assert.ok(eventData.timetableEntry);
  });

  test('13. Substituted class reflects in John (substitute faculty) schedule query', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/timetable/weekly')
      .set('Authorization', `Bearer ${faculty2Token}`);

    assert.equal(res.status, 200);
    const subClass = res.body.data.find(
      (entry) => entry._id.toString() === faculty1Entry._id.toString()
    );
    assert.ok(subClass, 'Substituted class should appear in substitute faculty schedule');
    assert.equal(subClass.isSubstituted, true);
    assert.equal(subClass.substituteFaculty.fullName, 'John');
  });

  test('14. View Substitutions endpoint returns substitution history', async () => {
    const res = await request(app)
      .get('/api/v1/faculty/substitutions')
      .set('Authorization', `Bearer ${faculty1Token}`);

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.data.length >= 1);
    assert.equal(res.body.data[0].reason, 'Conference presentation attendance');
  });

  after(async () => {
    await mongoose.disconnect();
  });
});
