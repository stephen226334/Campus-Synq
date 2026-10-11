const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { MONGODB_URI, JWT_SECRET } = require('../src/config/env');

// Models
const Admin = require('../src/models/Admin');
const Faculty = require('../src/models/Faculty');
const Semester = require('../src/models/Semester');
const Subject = require('../src/models/Subject');
const ClassSection = require('../src/models/ClassSection');
const Classroom = require('../src/models/Classroom');
const Period = require('../src/models/Period');
const TimetableEntry = require('../src/models/TimetableEntry');
const Substitution = require('../src/models/Substitution');

let adminToken = '';
let facultyToken = '';
let deanToken = '';
let testAdminId = '';
let testDeanId = '';
let testFacultyId = '';
let testSemesterId = '';
let testSubjectId = '';
let testSectionId = '';
let testClassroomId = '';
let testPeriodId = '';
let testTimetableId = '';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  // Clean previous test data
  await Promise.all([
    Admin.deleteMany({ email: /errortest.*@campussynq\.test/ }),
    Faculty.deleteMany({ officialEmail: /errortest.*@campussynq\.test/ }),
    Semester.deleteMany({ name: /ErrorTest Semester/ }),
    Subject.deleteMany({ code: /ERR-CS/ }),
    ClassSection.deleteMany({ name: /ErrorTest Section/ }),
    Classroom.deleteMany({ roomNumber: /ERR-ROOM/ }),
    Period.deleteMany({ periodNumber: 99 }),
    TimetableEntry.deleteMany({ day: 'Monday', roomType: 'Classroom' })
  ]);

  // Seed Admin
  const admin = await Admin.create({
    fullName: 'Error Test Admin',
    email: 'errortest-admin@campussynq.test',
    password: 'Password123!',
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  testAdminId = admin._id.toString();
  adminToken = jwt.sign({ userId: admin._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

  // Seed Dean
  const dean = await Admin.create({
    fullName: 'Error Test Dean',
    email: 'errortest-dean@campussynq.test',
    password: 'Password123!',
    role: 'DEAN',
    status: 'ACTIVE'
  });
  deanToken = jwt.sign({ userId: dean._id, role: 'DEAN' }, JWT_SECRET, { expiresIn: '1h' });

  // Seed Faculty
  const faculty = await Faculty.create({
    facultyId: 'ERR-FAC-01',
    fullName: 'Error Test Faculty',
    officialEmail: 'errortest.fac@campussynq.com',
    personalEmail: 'errortest-fac-personal@gmail.com',
    phone: '9876543210',
    password: 'Password123!',
    designation: 'Assistant Professor',
    department: 'Computer Science',
    role: 'FACULTY',
    status: 'ACTIVE'
  });
  testFacultyId = faculty._id.toString();
  facultyToken = jwt.sign({ userId: faculty._id, role: 'FACULTY' }, JWT_SECRET, { expiresIn: '1h' });

  // Seed Master Data
  const semester = await Semester.create({
    name: 'ErrorTest Semester 1',
    academicYear: '2026-2027',
    status: 'ACTIVE'
  });
  testSemesterId = semester._id.toString();

  const subject = await Subject.create({
    name: 'Error Handling Algorithms',
    code: 'ERR-CS101',
    semester: semester._id,
    status: 'ACTIVE'
  });
  testSubjectId = subject._id.toString();

  const section = await ClassSection.create({
    name: 'ErrorTest Section A',
    semester: semester._id,
    capacity: 60,
    status: 'ACTIVE'
  });
  testSectionId = section._id.toString();

  const classroom = await Classroom.create({
    roomNumber: 'ERR-ROOM-101',
    capacity: 70,
    status: 'ACTIVE'
  });
  testClassroomId = classroom._id.toString();

  const period = await Period.create({
    periodNumber: 'ERR-99',
    startTime: '07:00 AM',
    endTime: '07:50 AM',
    order: 99,
    type: 'THEORY',
    status: 'ACTIVE'
  });
  testPeriodId = period._id.toString();

  // Create an active timetable session
  const timetableEntry = await TimetableEntry.create({
    day: 'Monday',
    period: period._id,
    semester: semester._id,
    section: section._id,
    subject: subject._id,
    faculty: faculty._id,
    roomType: 'Classroom',
    roomId: classroom._id,
    roomDetails: { roomNumber: 'ERR-ROOM-101', capacity: 70 },
    status: 'ACTIVE'
  });
  testTimetableId = timetableEntry._id.toString();
});

test.after(async () => {
  const cleanup = [
    Admin.deleteMany({ email: /errortest.*@campussynq/ }),
    Faculty.deleteMany({ officialEmail: /errortest.*@campussynq/ }),
    Semester.deleteMany({ name: /ErrorTest Semester/ }),
    Subject.deleteMany({ code: /ERR-CS/ }),
    ClassSection.deleteMany({ name: /ErrorTest Section/ }),
    Classroom.deleteMany({ roomNumber: /ERR-ROOM/ }),
    Period.deleteMany({ periodNumber: 'ERR-99' })
  ];
  if (testTimetableId) {
    cleanup.push(TimetableEntry.deleteMany({ _id: testTimetableId }));
    cleanup.push(Substitution.deleteMany({ timetableEntry: testTimetableId }));
  }
  await Promise.all(cleanup);
  await mongoose.disconnect();
});

test('CampusSynq Comprehensive Error Handling & Observability Suite', async (t) => {
  await t.test('1. Request Correlation: Request ID is echoed and attached', async () => {
    const customReqId = 'req-test-uuid-12345';
    const res = await request(app)
      .get('/api/v1/health')
      .set('X-Request-Id', customReqId);

    assert.equal(res.status, 200);
    assert.equal(res.headers['x-request-id'], customReqId);
  });

  await t.test('2. 404 Route Not Found returns structured code and clear message', async () => {
    const res = await request(app).get('/api/v1/non-existent-endpoint-xyz');
    assert.equal(res.status, 404);
    assert.equal(res.body.success, false);
    assert.ok(['NOT_FOUND', 'ROUTE_NOT_FOUND'].includes(res.body.code));
    assert.match(res.body.message, /not found/i);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('3. 401 Unauthorized: Missing token returns standard unauthorized payload', async () => {
    const res = await request(app).get('/api/v1/admin/semesters');
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'UNAUTHORIZED');
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('4. 401 Unauthorized: Expired/Malformed token returns actionable recommendation', async () => {
    const res = await request(app)
      .get('/api/v1/admin/semesters')
      .set('Authorization', 'Bearer invalid.token.value');

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.ok(['UNAUTHORIZED', 'INVALID_TOKEN'].includes(res.body.code));
    assert.ok(res.body.recommendation, 'Expected recommendation in expired/invalid token response');
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('5. 403 Forbidden: Faculty role attempting Admin-only endpoint', async () => {
    const res = await request(app)
      .post('/api/v1/admin/semesters')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ name: 'Hacked Semester', academicYear: '2026-2027' });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
    assert.equal(res.body.dataSaved, false);
    assert.match(res.body.message, /Access denied/);
  });

  await t.test('6. 400 Bad Request: Mongoose CastError on invalid ObjectId', async () => {
    const res = await request(app)
      .get('/api/v1/admin/semesters/invalid-not-an-object-id')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(['INVALID_IDENTIFIER', 'VALIDATION_FAILED'].includes(res.body.code));
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('7. 400 Bad Request: Missing required fields validation error', async () => {
    const res = await request(app)
      .post('/api/v1/admin/semesters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({}); // Empty payload

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors || res.body.message);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('8. 409 Conflict: Duplicate key violation on unique resource', async () => {
    // Attempt to create duplicate subject code
    const res = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Algo Class',
        code: 'ERR-CS101', // Already exists in before hook
        semester: testSemesterId
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'RESOURCE_CONFLICT');
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('9. 400 Referential Integrity: Deleting semester referenced by timetable blocks delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/semesters/${testSemesterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'REFERENTIAL_INTEGRITY_VIOLATION');
    assert.match(res.body.message, /Cannot delete/);
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('10. 400 Referential Integrity: Deleting classroom referenced by timetable blocks delete', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/classrooms/${testClassroomId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'REFERENTIAL_INTEGRITY_VIOLATION');
    assert.match(res.body.message, /Cannot delete classroom/);
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('11. 409 Conflict: Tri-Conflict Engine catches faculty double booking', async () => {
    // Attempt to schedule same faculty at the exact same day & period
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: 'Monday',
        period: testPeriodId,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFacultyId, // already teaching at this period
        roomType: 'Classroom',
        roomId: testClassroomId,
        status: 'ACTIVE'
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.success, false);
    assert.ok(['RESOURCE_CONFLICT', 'TIMETABLE_CONFLICT'].includes(res.body.code));
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);
  });

  await t.test('12. 400 Bad Request: Substitution invalid status transition', async () => {
    // Create a substitution record
    const sub = await Substitution.create({
      timetableEntry: testTimetableId,
      day: 'Monday',
      date: '2026-10-12',
      period: testPeriodId,
      originalFaculty: testFacultyId,
      substituteFaculty: testFacultyId,
      subject: testSubjectId,
      section: testSectionId,
      roomType: 'Classroom',
      roomId: testClassroomId,
      roomDetails: { roomNumber: 'ERR-ROOM-101' },
      status: 'CANCELLED',
      createdBy: testFacultyId
    });

    // Dean portal modify substitution with invalid status
    const res = await request(app)
      .put(`/api/v1/dean/substitutions/${sub._id}`)
      .set('Authorization', `Bearer ${deanToken}`)
      .send({ status: 'INVALID_STATUS_VALUE' });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'INVALID_STATUS_TRANSITION');
    assert.ok(res.body.recommendation);
    assert.equal(res.body.dataSaved, false);

    await Substitution.deleteOne({ _id: sub._id });
  });

  await t.test('13. Observability & Security: No stack traces, secrets, or passwords leaked in response', async () => {
    const res = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Trigger Error' }); // missing code and semester

    assert.equal(res.status, 400);
    const bodyStr = JSON.stringify(res.body);
    assert.doesNotMatch(bodyStr, /mongodb\+srv/i, 'Database URI leaked!');
    assert.doesNotMatch(bodyStr, /at (Function|Module|processTicksAndRejections)/i, 'Stack trace leaked!');
    assert.doesNotMatch(bodyStr, /JWT_SECRET/i, 'JWT secret leaked!');
  });
});
