const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
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

describe('Campus Synq Stage 3 — Master E2E Integration, Conflict & Security Test Suite', () => {
  let adminToken;
  let nonAdminToken;
  let adminUser;
  let testSemesterId;
  let testSectionId;
  let testSubjectId;
  let testClassroomId;
  let testLabId;
  let testAuditoriumId;
  let testPeriodP1Id;
  let testPeriodP2Id;
  let testFaculty1Id;
  let testFaculty2Id;
  let testTimetableId;

  const currentWeekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_synq');
    }

    // Clean up any test records from prior test runs
    await Admin.deleteMany({ email: /stage3_test/i });
    await Semester.deleteMany({ name: /Stage 3/i });
    await Subject.deleteMany({ code: /^S3-/i });
    await ClassSection.deleteMany({ name: /^S3-/i });
    await Classroom.deleteMany({ roomNumber: /^S3-/i });
    await Lab.deleteMany({ labNumber: /^S3-/i });
    await Auditorium.deleteMany({ auditoriumNumber: /^S3-/i });
    await Faculty.deleteMany({ facultyId: /^S3-/i });
    await Period.deleteMany({ periodNumber: /^S3-/i });
    await TimetableEntry.deleteMany({ 'roomDetails.roomNumber': /^S3-/i });
  });

  after(async () => {
    // Clean up created records
    await Admin.deleteMany({ email: /stage3_test/i });
    await Semester.deleteMany({ name: /Stage 3/i });
    await Subject.deleteMany({ code: /^S3-/i });
    await ClassSection.deleteMany({ name: /^S3-/i });
    await Classroom.deleteMany({ roomNumber: /^S3-/i });
    await Lab.deleteMany({ labNumber: /^S3-/i });
    await Auditorium.deleteMany({ auditoriumNumber: /^S3-/i });
    await Faculty.deleteMany({ facultyId: /^S3-/i });
    await Period.deleteMany({ periodNumber: /^S3-/i });
    await TimetableEntry.deleteMany({ 'roomDetails.roomNumber': /^S3-/i });
    await mongoose.disconnect();
  });

  // --- 1. AUTHENTICATION & SECURITY QA ---
  test('1. System status check & initial admin verification', async () => {
    const res = await request(app).get('/api/v1/auth/status');
    assert.equal(res.status, 200);
    assert.equal(typeof res.body.data.isInitialized, 'boolean');
    assert.equal(typeof res.body.data.adminCount, 'number');
  });

  test('2. Admin signup validation prevents weak passwords and mismatched confirmations', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({
        fullName: 'Test Admin',
        email: 'stage3_invalid_admin@campussynq.com',
        password: 'short',
        confirmPassword: 'mismatch'
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.ok(res.body.errors);
  });

  test('3. Admin authentication succeeds and returns JWT without exposing password hash', async () => {
    // If admin already exists in DB, login; otherwise create
    let res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@campussynq.com',
        password: 'AdminPassword2026!'
      });

    if (res.status !== 200) {
      // First-time signup
      res = await request(app)
        .post('/api/v1/auth/signup')
        .send({
          fullName: 'Campus Synq Root Admin',
          email: 'admin@campussynq.com',
          password: 'AdminPassword2026!',
          confirmPassword: 'AdminPassword2026!'
        });
    }

    assert.equal(res.status, 200);
    assert.ok(res.body.data.token);
    assert.ok(res.body.data.admin);
    assert.equal(res.body.data.admin.role, 'ADMIN');
    // Security check: password and passwordHash must not be exposed
    assert.equal(res.body.data.admin.password, undefined);
    assert.equal(res.body.data.admin.passwordHash, undefined);

    adminToken = res.body.data.token;
    adminUser = res.body.data.admin;
  });

  test('4. Security check: Unauthenticated requests to protected endpoints return 401', async () => {
    const endpoints = [
      '/api/v1/admin/dashboard',
      '/api/v1/admin/semesters',
      '/api/v1/admin/subjects',
      '/api/v1/admin/faculty',
      '/api/v1/admin/periods',
      '/api/v1/admin/timetable'
    ];

    for (const ep of endpoints) {
      const res = await request(app).get(ep);
      assert.equal(res.status, 401, `Expected 401 for ${ep}`);
      assert.match(res.body.message, /Authentication required/i);
    }
  });

  test('5. Security check: Tampered/invalid JWT tokens are rejected with 401', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', 'Bearer invalid_tampered_token_string');

    assert.equal(res.status, 401);
    assert.match(res.body.message, /Invalid token/i);
  });

  test('6. Current user profile (/auth/me) returns sanitized admin identity', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'ADMIN');
    assert.equal(res.body.data.email, adminUser.email);
    assert.equal(res.body.data.password, undefined);
  });

  // --- 2. MASTER DATA CRUD & INTEGRITY CHECKS ---
  test('7. Create Semester, Class Section, Subject, Classroom, Lab, Auditorium', async () => {
    // 1. Semester
    const semRes = await request(app)
      .post('/api/v1/admin/semesters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Stage 3 Semester',
        academicYear: '2026-2027',
        startDate: '2026-08-01',
        endDate: '2026-12-15'
      });
    assert.equal(semRes.status, 201);
    testSemesterId = semRes.body.data._id;

    // 2. Class Section
    const secRes = await request(app)
      .post('/api/v1/admin/class-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'S3-Section-A',
        semester: testSemesterId,
        capacity: 60
      });
    assert.equal(secRes.status, 201);
    testSectionId = secRes.body.data._id;

    // 3. Subject
    const subRes = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Stage 3 Cloud Architecture',
        code: 'S3-CS301',
        semester: testSemesterId
      });
    assert.equal(subRes.status, 201);
    testSubjectId = subRes.body.data._id;

    // 4. Classroom
    const roomRes = await request(app)
      .post('/api/v1/admin/classrooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomNumber: 'S3-301',
        capacity: 65
      });
    assert.equal(roomRes.status, 201);
    testClassroomId = roomRes.body.data._id;

    // 5. Lab
    const labRes = await request(app)
      .post('/api/v1/admin/labs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        labName: 'Stage 3 AI Systems Lab',
        labNumber: 'S3-LAB-01',
        capacity: 40
      });
    assert.equal(labRes.status, 201);
    testLabId = labRes.body.data._id;

    // 6. Auditorium
    const audRes = await request(app)
      .post('/api/v1/admin/auditoriums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        auditoriumName: 'Stage 3 Main Auditorium',
        auditoriumNumber: 'S3-AUD-01',
        capacity: 300
      });
    assert.equal(audRes.status, 201);
    testAuditoriumId = audRes.body.data._id;
  });

  test('8. Duplicate prevention: Master Data duplicates are blocked with 409', async () => {
    // Duplicate subject code
    const subDup = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Subject with same code',
        code: 'S3-CS301',
        semester: testSemesterId
      });
    assert.equal(subDup.status, 409);

    // Duplicate classroom number
    const roomDup = await request(app)
      .post('/api/v1/admin/classrooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomNumber: 'S3-301',
        capacity: 50
      });
    assert.equal(roomDup.status, 409);
  });

  test('9. Referential integrity guard prevents deleting semester with linked courses/sections', async () => {
    const delRes = await request(app)
      .delete(`/api/v1/admin/semesters/${testSemesterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(delRes.status, 400);
    assert.match(delRes.body.message, /Cannot delete/i);
    assert.match(delRes.body.message, /referenced by/i);
  });

  // --- 3. PERIOD SYSTEM & 12-HOUR FORMAT QA ---
  test('10. Create Period slots and verify 12-hour format presentation', async () => {
    const p1Res = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S3-P1',
        startTime: '9:00 AM',
        endTime: '9:50 AM',
        order: 10
      });
    assert.equal(p1Res.status, 201);
    assert.equal(p1Res.body.data.startTime, '9:00 AM');
    assert.equal(p1Res.body.data.endTime, '9:50 AM');
    assert.equal(p1Res.body.data.label, 'S3-P1 (9:00 AM - 9:50 AM)');
    testPeriodP1Id = p1Res.body.data._id;

    const p2Res = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S3-P2',
        startTime: '10:00 AM',
        endTime: '10:50 AM',
        order: 11
      });
    assert.equal(p2Res.status, 201);
    testPeriodP2Id = p2Res.body.data._id;
  });

  test('11. Duplicate Period Number is rejected with 409', async () => {
    const dupRes = await request(app)
      .post('/api/v1/admin/periods')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        periodNumber: 'S3-P1',
        startTime: '9:00 AM',
        endTime: '9:50 AM'
      });
    assert.equal(dupRes.status, 409);
    assert.match(dupRes.body.message, /already exists/i);
  });

  // --- 4. FACULTY CREDENTIALS & MANAGEMENT QA ---
  test('12. Create Faculty generates official @campussynq.com email and hashes default password', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Prof. Dennis Ritchie',
        personalEmail: 'dennis.ritchie.stage3@gmail.com',
        facultyId: 'S3-FAC001',
        phone: '+1-555-0301',
        designation: 'Professor',
        department: 'Computer Science',
        assignedSubjects: [testSubjectId],
        assignedSections: [testSectionId],
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.officialEmail, 'dennis@campussynq.com');
    assert.equal(res.body.data.personalEmail, 'dennis.ritchie.stage3@gmail.com');
    assert.equal(res.body.data.role, 'HOD_FACULTY');
    assert.equal(res.body.data.password, undefined);
    assert.equal(res.body.data.passwordHash, undefined);
    testFaculty1Id = res.body.data._id;
  });

  test('13. Collision handling: Second faculty with same first name gets numbered email', async () => {
    const res = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Dr. Dennis Gabor',
        personalEmail: 'dennis.gabor.stage3@gmail.com',
        facultyId: 'S3-FAC002',
        phone: '+1-555-0302',
        designation: 'Associate Professor',
        status: 'ACTIVE'
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.officialEmail, 'dennis01@campussynq.com');
    testFaculty2Id = res.body.data._id;
  });

  test('14. Unique constraints: Duplicate facultyId or personalEmail are blocked with 409', async () => {
    // Duplicate Faculty ID
    const dupId = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Unique Name',
        personalEmail: 'unique.person@gmail.com',
        facultyId: 'S3-FAC001', // duplicate
        phone: '1234567890',
        designation: 'Lecturer'
      });
    assert.equal(dupId.status, 409);
    assert.match(dupId.body.message, /already registered/i);

    // Duplicate Personal Email
    const dupEmail = await request(app)
      .post('/api/v1/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Another Name',
        personalEmail: 'dennis.ritchie.stage3@gmail.com', // duplicate
        facultyId: 'S3-FAC999',
        phone: '1234567890',
        designation: 'Lecturer'
      });
    assert.equal(dupEmail.status, 409);
    assert.match(dupEmail.body.message, /already associated/i);
  });

  test('15. Resend Credentials sends login details to personal email on demand', async () => {
    const res = await request(app)
      .post(`/api/v1/admin/faculty/${testFaculty1Id}/resend-credentials`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.personalEmail, 'dennis.ritchie.stage3@gmail.com');
    assert.equal(res.body.data.officialEmail, 'dennis@campussynq.com');
    assert.match(res.body.message, /credentials.*resent/i);
  });

  // --- 5. TIMETABLE SCHEDULING & TRI-CONFLICT VALIDATION ---
  test('16. Schedule Timetable session linking Day, Period, Semester, Section, Subject, Faculty, Room', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: currentWeekday,
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty1Id,
        roomType: 'Classroom',
        roomId: testClassroomId
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.day, currentWeekday);
    assert.equal(res.body.data.roomDetails.roomNumber, 'S3-301');
    testTimetableId = res.body.data._id;
  });

  test('17. CONFLICT CHECK: Faculty collision on same (Day, Period) is rejected with 409', async () => {
    // Dennis Ritchie is already teaching in P1 on currentWeekday
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: currentWeekday,
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty1Id, // Same faculty!
        roomType: 'Lab',
        roomId: testLabId
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /is already assigned to teach/i);
  });

  test('18. CONFLICT CHECK: Room double-booking on same (Day, Period) is rejected with 409', async () => {
    // Room S3-301 is already occupied in P1 on currentWeekday
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: currentWeekday,
        period: testPeriodP1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty2Id, // Different faculty
        roomType: 'Classroom',
        roomId: testClassroomId // Same room!
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /is already allocated to/i);
  });

  test('19. CONFLICT CHECK: Section cohort collision on same (Day, Period) is rejected with 409', async () => {
    // Section S3-Section-A is already scheduled in P1 on currentWeekday
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: currentWeekday,
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

  test('20. Non-conflicting session at Period P2 succeeds', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: currentWeekday,
        period: testPeriodP2Id, // P2 instead of P1
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFaculty2Id,
        roomType: 'Lab',
        roomId: testLabId
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.data.roomDetails.roomNumber, 'S3-LAB-01');
  });

  test('21. Deletion protection: Deleting Faculty with active timetable sessions is blocked with 400', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/faculty/${testFaculty1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Cannot delete faculty member/i);
    assert.match(res.body.message, /active timetable session/i);
  });

  test('22. Deletion protection: Deleting Period with active timetable sessions is blocked with 400', async () => {
    const res = await request(app)
      .delete(`/api/v1/admin/periods/${testPeriodP1Id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 400);
    assert.match(res.body.message, /Cannot delete period/i);
  });

  // --- 6. FACULTY TIMETABLE SCHEDULE & DASHBOARD REAL-DATA QA ---
  test('23. Faculty weekly timetable schedule endpoint returns assigned sessions', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/faculty/${testFaculty1Id}/timetable`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.faculty);
    assert.ok(Array.isArray(res.body.data.timetable));
    assert.ok(res.body.data.timetable.length >= 1);
    assert.equal(res.body.data.faculty._id, testFaculty1Id);
  });

  test('24. Admin Dashboard aggregates real DB counts and includes Today\'s live schedule', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    const { counts, todaySchedule, recentData } = res.body.data;

    // Stage 1 counts
    assert.ok(counts.subjects >= 1);
    assert.ok(counts.semesters >= 1);
    assert.ok(counts.classSections >= 1);
    assert.ok(counts.classrooms >= 1);
    assert.ok(counts.labs >= 1);
    assert.ok(counts.auditoriums >= 1);

    // Stage 2 counts
    assert.ok(counts.totalFaculty >= 2);
    assert.ok(counts.activeFaculty >= 2);
    assert.ok(counts.totalTimetableEntries >= 2);
    assert.ok(counts.todayClassesCount >= 2);

    // Live today schedule
    assert.equal(todaySchedule.weekday, currentWeekday);
    assert.ok(Array.isArray(todaySchedule.classes));
    assert.ok(todaySchedule.classes.length >= 2);

    // Verify 12-hour formatted period labels on today's classes
    const firstClass = todaySchedule.classes[0];
    assert.ok(firstClass.period.periodNumber);
    assert.ok(firstClass.period.startTime);
    assert.ok(firstClass.period.endTime);
    assert.ok(firstClass.roomDetails.roomNumber);
  });

  test('25. Admin Logout clears session cleanly', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.match(res.body.message, /Logged out successfully/i);
  });
});
