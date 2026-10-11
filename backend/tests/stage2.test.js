const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { MONGODB_URI } = require('../src/config/env');
const connectDB = require('../src/config/db');

// Models
const Admin = require('../src/models/Admin');
const Semester = require('../src/models/Semester');
const Subject = require('../src/models/Subject');
const ClassSection = require('../src/models/ClassSection');
const Classroom = require('../src/models/Classroom');
const Lab = require('../src/models/Lab');
const Auditorium = require('../src/models/Auditorium');
const Faculty = require('../src/models/Faculty');
const Period = require('../src/models/Period');
const TimetableEntry = require('../src/models/TimetableEntry');

let adminToken = '';
let testSemesterId = '';
let testSubjectId = '';
let testSectionId = '';
let testClassroomId = '';
let testLabId = '';
let testPeriodP1Id = '';
let testPeriodP2Id = '';
let testFaculty1Id = '';
let testFaculty2Id = '';
let testTimetableId = '';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Ensure an admin exists for auth
  let admin = await Admin.findOne({ email: 'stage2admin@campussynq.test' });
  if (!admin) {
    admin = await Admin.create({
      fullName: 'Stage 2 Admin',
      email: 'stage2admin@campussynq.test',
      password: 'AdminPassword2026!',
      role: 'ADMIN',
      status: 'ACTIVE'
    });
  }

  // Login to get token
  const loginRes = await request(app).post('/api/v1/auth/login').send({
    email: 'stage2admin@campussynq.test',
    password: 'AdminPassword2026!'
  });
  adminToken = loginRes.body.data.token;

  // Clean up prior S2 test fixtures if left over from a previous interrupted run
  await Promise.all([
    TimetableEntry.deleteMany({ day: 'Monday' }),
    Faculty.deleteMany({ facultyId: /^S2-FAC/ }),
    Period.deleteMany({ periodNumber: /^S2-P/ }),
    Semester.deleteMany({ name: 'S2 Test Semester' }),
    Subject.deleteMany({ code: 'S2-CS401' }),
    ClassSection.deleteMany({ name: 'S2 Section Alpha' }),
    Classroom.deleteMany({ roomNumber: 'S2-CS-501' }),
    Lab.deleteMany({ labNumber: 'S2-LAB-99' })
  ]);

  // Setup Master Data fixtures for timetable testing
  const sem = await Semester.create({
    name: 'S2 Test Semester',
    academicYear: '2026-2027',
    status: 'ACTIVE'
  });
  testSemesterId = sem._id.toString();

  const sub = await Subject.create({
    name: 'S2 Compiler Design',
    code: 'S2-CS401',
    semester: sem._id,
    status: 'ACTIVE'
  });
  testSubjectId = sub._id.toString();

  const sec = await ClassSection.create({
    name: 'S2 Section Alpha',
    semester: sem._id,
    status: 'ACTIVE'
  });
  testSectionId = sec._id.toString();

  const room = await Classroom.create({
    roomNumber: 'S2-CS-501',
    capacity: 70,
    status: 'ACTIVE'
  });
  testClassroomId = room._id.toString();

  const lab = await Lab.create({
    labName: 'S2 Systems Lab',
    labNumber: 'S2-LAB-99',
    capacity: 40,
    status: 'ACTIVE'
  });
  testLabId = lab._id.toString();
});

test.after(async () => {
  if (mongoose.connection.readyState !== 1) {
    return;
  }
  // Clean up all Stage 2 test records
  await Promise.all([
    TimetableEntry.deleteMany({ day: 'Monday' }),
    Faculty.deleteMany({ facultyId: /^S2-FAC/ }),
    Period.deleteMany({ periodNumber: /^S2-P/ }),
    Semester.deleteMany({ name: 'S2 Test Semester' }),
    Subject.deleteMany({ code: 'S2-CS401' }),
    ClassSection.deleteMany({ name: 'S2 Section Alpha' }),
    Classroom.deleteMany({ roomNumber: 'S2-CS-501' }),
    Lab.deleteMany({ labNumber: 'S2-LAB-99' }),
    Admin.deleteMany({ email: 'stage2admin@campussynq.test' })
  ]);
  await mongoose.disconnect();
});

test('Campus Synq Stage 2 — Faculty, Credentials, Periods & Timetable Test Suite', async (t) => {
  // --- 1. PERIODS MANAGEMENT ---
  await t.test('1. Create Period with 12-hour format', async () => {
    const res = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S2-P1',
        startTime: '9:00 AM',
        endTime: '9:50 AM',
        order: 1,
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.periodNumber, 'S2-P1');
    assert.equal(res.body.data.startTime, '9:00 AM');
    assert.equal(res.body.data.endTime, '9:50 AM');
    testPeriodP1Id = res.body.data._id;

    // Create Period P2
    const res2 = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S2-P2',
        startTime: '10:00 AM',
        endTime: '10:50 AM',
        order: 2,
        status: 'ACTIVE'
      });
    assert.equal(res2.status, 201);
    testPeriodP2Id = res2.body.data._id;
  });

  await t.test('2. Duplicate Period number blocked with 409', async () => {
    const res = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S2-P1',
        startTime: '9:00 AM',
        endTime: '9:50 AM'
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already exists/i);
  });

  // --- 2. FACULTY CREATION & CREDENTIAL GENERATION ---
  await t.test('3. Create Faculty generates official email and hashes password', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Dr. Stephen Turing',
        personalEmail: 'stephen.turing.test@gmail.com',
        facultyId: 'S2-FAC001',
        phone: '+1-555-0199',
        designation: 'Professor',
        department: 'Computer Science',
        assignedSubjects: [testSubjectId],
        assignedSections: [testSectionId],
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.fullName, 'Dr. Stephen Turing');
    // Verify auto-generated official email
    assert.equal(res.body.data.officialEmail, 'stephen@campussynq.com');
    assert.equal(res.body.data.role, 'HOD_FACULTY');
    assert.ok(res.body.data.assignedSubjects.length === 1);
    // Ensure password is not exposed in response
    assert.equal(res.body.data.password, undefined);
    testFaculty1Id = res.body.data._id;

    // Verify in DB that password is saved and hashed
    const inDb = await Faculty.findById(testFaculty1Id).select('+password');
    assert.ok(inDb.password);
    assert.notEqual(inDb.password, 'password@123');
    // Verify password compares successfully against default password
    const isMatch = await inDb.comparePassword('password@123');
    assert.equal(isMatch, true);
  });

  await t.test('4. Safe official email collision handling for same faculty name', async () => {
    // Another faculty named Stephen
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Prof. Stephen Strange',
        personalEmail: 'stephen.strange.test@gmail.com',
        facultyId: 'S2-FAC002',
        phone: '+1-555-0200',
        designation: 'Associate Professor',
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    // Collision handled: stephen01@campussynq.com
    assert.equal(res.body.data.officialEmail, 'stephen01@campussynq.com');
    testFaculty2Id = res.body.data._id;
  });

  await t.test('5. Duplicate Faculty ID blocked with 409', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Duplicate ID Faculty',
        personalEmail: 'another.unique@gmail.com',
        facultyId: 'S2-FAC001',
        phone: '1234567890',
        designation: 'Lecturer'
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /Faculty ID .* already registered/i);
  });

  await t.test('6. Resend Credentials endpoint dispatches to personal email', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/faculty/${testFaculty1Id}/resend-credentials`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.personalEmail, 'stephen.turing.test@gmail.com');
    assert.equal(res.body.data.officialEmail, 'stephen@campussynq.com');
  });

  // --- 3. TIMETABLE CREATION & CONFLICT CHECKS ---
  await t.test('7. Create Timetable Session with Classroom reference', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty1Id,
        roomType: 'Classroom',
        roomId: testClassroomId,
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.day, 'Monday');
    assert.equal(res.body.data.roomDetails.roomNumber, 'S2-CS-501');
    testTimetableId = res.body.data._id;
  });

  await t.test('8. CONFLICT: Faculty conflict detected and rejected with 409', async () => {
    // Attempt to schedule testFaculty1 at the same Monday + P1 with a different class & lab
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty1Id, // Same faculty!
        roomType: 'Lab',
        roomId: testLabId
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already assigned to teach/i);
  });

  await t.test('9. CONFLICT: Room conflict detected and rejected with 409', async () => {
    // Attempt to allocate testClassroomId to testFaculty2 at the same Monday + P1
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty2Id, // Different faculty
        roomType: 'Classroom',
        roomId: testClassroomId // Same room!
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already allocated to/i);
  });

  await t.test('10. CONFLICT: Class section conflict detected and rejected with 409', async () => {
    // Attempt to allocate testSectionId to another class at the same Monday + P1
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId, // Same section!
        subject: testSubjectId,
        faculty: testFaculty2Id, // Different faculty
        roomType: 'Lab',
        roomId: testLabId // Different room
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /Class section is already scheduled/i);
  });

  await t.test('11. Scheduling another session at a DIFFERENT period (P2) succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodP2Id, // P2 (No conflict!)
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty1Id,
        roomType: 'Classroom',
        roomId: testClassroomId,
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
  });

  // --- 4. REFERENTIAL INTEGRITY GUARDS ---
  await t.test('12. Deleting Faculty referenced in Timetable is BLOCKED (400)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/faculty/${testFaculty1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Cannot delete faculty member .* currently assigned to/i);
  });

  await t.test('13. Deleting Period referenced in Timetable is BLOCKED (400)', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/periods/${testPeriodP1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Cannot delete period .* currently used in/i);
  });

  // --- 5. FACULTY TIMETABLE VIEW ---
  await t.test('14. View Faculty Timetable returns schedule', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/faculty/${testFaculty1Id}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.timetable.length >= 2);
    assert.equal(res.body.data.faculty.fullName, 'Dr. Stephen Turing');
  });

  // --- 6. EXTENDED DASHBOARD WITH STAGE 2 METRICS ---
  await t.test('15. Extended Dashboard returns real Stage 2 metrics and Today classes', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(typeof res.body.data.counts.totalFaculty === 'number');
    assert.ok(typeof res.body.data.counts.activeFaculty === 'number');
    assert.ok(typeof res.body.data.counts.totalTimetableEntries === 'number');
    assert.ok(typeof res.body.data.counts.todayClassesCount === 'number');
    assert.ok(res.body.data.todaySchedule);
    assert.ok(Array.isArray(res.body.data.todaySchedule.classes));
  });
});
