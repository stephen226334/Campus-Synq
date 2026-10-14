const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const Admin = require('../src/models/Admin');
const Semester = require('../src/models/Semester');
const Subject = require('../src/models/Subject');
const ClassSection = require('../src/models/ClassSection');
const Classroom = require('../src/models/Classroom');
const Faculty = require('../src/models/Faculty');
const Period = require('../src/models/Period');
const TimetableEntry = require('../src/models/TimetableEntry');

describe('Campus Synq — Combined Classes & Conflict Scheduling Test Suite', () => {
  let adminToken;
  let testSemesterId;
  let testSection1Id;
  let testSection2Id;
  let testSubject1Id;
  let testSubject2Id;
  let testClassroom1Id;
  let testClassroom2Id;
  let testPeriodP6Id;
  let testFacultyDrStephenId;
  let testFacultyOtherId;
  let initialEntryId;

  const testDay = 'Monday';

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    // Clean up previous test artifacts
    await Admin.deleteMany({ email: /combined_test_/i });
    await Semester.deleteMany({ name: /Combined Class Test/i });
    await Subject.deleteMany({ code: /^CC-/i });
    await ClassSection.deleteMany({ name: /^CC-Sec/i });
    await Classroom.deleteMany({ roomNumber: /^CC-B31/i });
    await Faculty.deleteMany({ facultyId: /^CC-FAC/i });
    await Period.deleteMany({ periodNumber: /^CC-P/i });
    await TimetableEntry.deleteMany({ day: testDay, roomType: 'Classroom' }).where('roomDetails.roomNumber').regex(/^CC-B31/i);

    // 1. Create Admin & Token
    const adminUser = new Admin({
      fullName: 'Combined Admin Tester',
      email: `combined_test_${Date.now()}@campussynq.com`,
      password: 'Password123'
    });
    await adminUser.save();

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: adminUser.email, password: 'Password123' });
    adminToken = loginRes.body.data.token;

    // 2. Create Semester
    const sem = new Semester({
      name: 'Combined Class Test Semester',
      academicYear: '2026-2027',
      startDate: new Date('2026-06-01'),
      endDate: new Date('2026-12-31')
    });
    await sem.save();
    testSemesterId = sem._id.toString();

    // 3. Create Sections: MSc CS & MSc DS
    const sec1 = new ClassSection({ name: 'CC-Sec-MSc-CS', semester: sem._id, capacity: 40 });
    await sec1.save();
    testSection1Id = sec1._id.toString();

    const sec2 = new ClassSection({ name: 'CC-Sec-MSc-DS', semester: sem._id, capacity: 40 });
    await sec2.save();
    testSection2Id = sec2._id.toString();

    // 4. Create Subjects: Open Elective & Core Subject
    const sub1 = new Subject({ name: 'Open Elective', code: 'CC-OE-501', semester: sem._id, credits: 3 });
    await sub1.save();
    testSubject1Id = sub1._id.toString();

    const sub2 = new Subject({ name: 'Advanced Algorithms', code: 'CC-CS-502', semester: sem._id, credits: 4 });
    await sub2.save();
    testSubject2Id = sub2._id.toString();

    // 5. Create Classrooms: B312 & B314
    const room1 = new Classroom({ roomNumber: 'CC-B312', floor: 3, block: 'B', capacity: 70 });
    await room1.save();
    testClassroom1Id = room1._id.toString();

    const room2 = new Classroom({ roomNumber: 'CC-B314', floor: 3, block: 'B', capacity: 60 });
    await room2.save();
    testClassroom2Id = room2._id.toString();

    // 6. Create Period: P6 (2:40 PM - 3:30 PM)
    const per = new Period({
      periodNumber: 'CC-P6',
      startTime: '2:40 PM',
      endTime: '3:30 PM',
      order: 6
    });
    await per.save();
    testPeriodP6Id = per._id.toString();

    // 7. Create Faculty: Dr. Stephen Deepak & Other Instructor
    const fac1 = new Faculty({
      fullName: 'Dr. Stephen Deepak',
      facultyId: 'CC-FAC-001',
      personalEmail: `stephen.personal.${Date.now()}@example.com`,
      officialEmail: `stephen_${Date.now()}@campussynq.com`,
      phone: '9876543210',
      department: 'Computer Science',
      designation: 'Professor',
      password: 'password@123'
    });
    await fac1.save();
    testFacultyDrStephenId = fac1._id.toString();

    const fac2 = new Faculty({
      fullName: 'Prof. Ada Lovelace',
      facultyId: 'CC-FAC-002',
      personalEmail: `ada.personal.${Date.now()}@example.com`,
      officialEmail: `ada_${Date.now()}@campussynq.com`,
      phone: '9876543211',
      department: 'Data Science',
      designation: 'Associate Professor',
      password: 'password@123'
    });
    await fac2.save();
    testFacultyOtherId = fac2._id.toString();
  });

  after(async () => {
    // Cleanup test records
    await Admin.deleteMany({ email: /combined_test_/i });
    await Semester.deleteMany({ name: /Combined Class Test/i });
    await Subject.deleteMany({ code: /^CC-/i });
    await ClassSection.deleteMany({ name: /^CC-Sec/i });
    await Classroom.deleteMany({ roomNumber: /^CC-B31/i });
    await Faculty.deleteMany({ facultyId: /^CC-FAC/i });
    await Period.deleteMany({ periodNumber: /^CC-P/i });
    await TimetableEntry.deleteMany({ day: testDay }).where('roomDetails.roomNumber').regex(/^CC-B31/i);
    await mongoose.disconnect();
  });

  test('1. Initial Session Creation: Dr. Stephen Deepak assigned to Open Elective (MSc CS) in B312', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection1Id,
        subject: testSubject1Id,
        faculty: testFacultyDrStephenId,
        roomType: 'Classroom',
        roomId: testClassroom1Id
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    initialEntryId = res.body.data._id;
  });

  test('2. Conflict Warning: Scheduling MSc DS with Dr. Stephen Deepak in B312 without override triggers 409 with canOverride: true', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection2Id, // Different section (MSc DS)
        subject: testSubject1Id, // Same subject (Open Elective)
        faculty: testFacultyDrStephenId, // Same faculty
        roomType: 'Classroom',
        roomId: testClassroom1Id // Same room (B312)
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'TIMETABLE_CONFLICT');
    assert.match(res.body.message, /Dr\. Stephen Deepak is already assigned to teach/i);
    assert.match(res.body.message, /CC-B312/);
    assert.match(res.body.message, /CC-P6/);

    // Verify overridable conflict metadata
    const details = res.body.details || res.body.errors;
    assert.equal(details.canOverride, true);
    assert.equal(details.conflictType, 'COMBINED_CLASS');
    assert.ok(details.existingEntry);
    assert.equal(details.existingEntry.facultyName, 'Dr. Stephen Deepak');
    assert.equal(details.existingEntry.roomNumber, 'CC-B312');
  });

  test('3. Confirmed Combined Class: Scheduling MSc DS with allowCombinedClass: true succeeds with 201', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection2Id,
        subject: testSubject1Id,
        faculty: testFacultyDrStephenId,
        roomType: 'Classroom',
        roomId: testClassroom1Id,
        allowCombinedClass: true,
        overrideConflict: true
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isCombinedClass, true);

    const secondEntryId = res.body.data._id;

    // Both records must exist simultaneously in MongoDB
    const allSessions = await TimetableEntry.find({
      day: testDay,
      period: testPeriodP6Id,
      faculty: testFacultyDrStephenId,
      status: 'ACTIVE'
    });

    assert.equal(allSessions.length, 2, 'Both MSc CS and MSc DS sessions must persist concurrently in the database');
    const sectionsStored = allSessions.map((s) => s.section.toString());
    assert.ok(sectionsStored.includes(testSection1Id));
    assert.ok(sectionsStored.includes(testSection2Id));
  });

  test('4. Prohibited Duplicate Session: Scheduling MSc CS for Open Elective AGAIN is rejected even with overrideConflict: true', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection1Id, // Same section: MSc CS
        subject: testSubject1Id, // Same subject: Open Elective
        faculty: testFacultyDrStephenId,
        roomType: 'Classroom',
        roomId: testClassroom1Id,
        overrideConflict: true,
        allowCombinedClass: true
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /Duplicate session/i);
    const details = res.body.details || res.body.errors;
    assert.equal(details.canOverride, false, 'Duplicate session must never be overridable');
    assert.equal(details.conflictType, 'DUPLICATE_SESSION');
  });

  test('5. Prohibited Section Conflict: MSc CS cannot attend two different courses at the same period', async () => {
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection1Id, // MSc CS
        subject: testSubject2Id, // Advanced Algorithms
        faculty: testFacultyOtherId,
        roomType: 'Classroom',
        roomId: testClassroom2Id,
        overrideConflict: true
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /Class section is already scheduled/i);
    const details = res.body.details || res.body.errors;
    assert.equal(details.canOverride, false, 'Section cohort collision must never be overridable');
    assert.equal(details.conflictType, 'SECTION');
  });

  test('6. Prohibited Room Conflict: Another faculty member cannot double-book Room B312', async () => {
    // Prof. Ada Lovelace trying to schedule in Room CC-B312 during P6
    const res = await request(app)
      .post('/api/v1/admin/timetable')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection2Id, // MSc DS
        subject: testSubject2Id, // Advanced Algorithms
        faculty: testFacultyOtherId, // Prof. Ada Lovelace (DIFFERENT faculty!)
        roomType: 'Classroom',
        roomId: testClassroom1Id, // Room CC-B312 (occupied!)
        overrideConflict: true
      });

    assert.equal(res.status, 409);
    assert.match(res.body.message, /already allocated to/i);
    assert.match(res.body.message, /CC-B312/);
    const details = res.body.details || res.body.errors;
    assert.equal(details.canOverride, false, 'Room collision with a different faculty must never be overridable');
    assert.equal(details.conflictType, 'ROOM');
  });

  test('7. Update Flow: Updating an entry with combined class override succeeds and updates database', async () => {
    const res = await request(app)
      .put(`/api/v1/admin/timetable/${initialEntryId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        day: testDay,
        period: testPeriodP6Id,
        semester: testSemesterId,
        section: testSection1Id,
        subject: testSubject1Id,
        faculty: testFacultyDrStephenId,
        roomType: 'Classroom',
        roomId: testClassroom1Id,
        overrideConflict: true,
        allowCombinedClass: true
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.isCombinedClass, true);
  });
});
