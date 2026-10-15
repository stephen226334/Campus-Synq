const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const Faculty = require('../src/models/Faculty');
const Subject = require('../src/models/Subject');
const Classroom = require('../src/models/Classroom');
const Lab = require('../src/models/Lab');
const Auditorium = require('../src/models/Auditorium');
const Semester = require('../src/models/Semester');
const ClassSection = require('../src/models/ClassSection');
const Period = require('../src/models/Period');
const TimetableEntry = require('../src/models/TimetableEntry');

const seedFacultyPortalData = require('../src/utils/seedFacultyData');

describe('Campus Synq — Dynamic Search Dropdowns & Faculty Directory Suite', () => {
  let deanToken;
  let testSection;
  let testFaculty;
  let testClassroom;
  let testLab;
  let testAuditorium;
  let testPeriod;
  let testSubject;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    await seedFacultyPortalData();

    // Authenticate as Dean
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'Dean@campussynq.com',
        password: 'Password123'
      });

    assert.equal(loginRes.status, 200);
    deanToken = loginRes.body.data.token;

    // Fetch existing records from MongoDB
    testSection = await ClassSection.findOne().populate('semester').lean();
    testFaculty = await Faculty.findOne().lean();
    testClassroom = await Classroom.findOne().lean();
    testLab = await Lab.findOne().lean();
    testAuditorium = await Auditorium.findOne().lean();
    testPeriod = await Period.findOne({ status: 'ACTIVE' }).lean();
    testSubject = await Subject.findOne().lean();

    assert.ok(testSection, 'Class section fixture must exist');
    assert.ok(testFaculty, 'Faculty fixture must exist');
    assert.ok(testClassroom, 'Classroom fixture must exist');
  });

  after(async () => {
    await mongoose.disconnect();
  });

  test('1. Class Search by Section ID returns section meta, chronological timetable and venues', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/class-wise?sectionId=${testSection._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.section);
    assert.equal(res.body.data.section._id.toString(), testSection._id.toString());
    assert.equal(res.body.data.section.name, testSection.name);
    assert.ok(Array.isArray(res.body.data.timetable));

    if (res.body.data.timetable.length > 0) {
      const firstEntry = res.body.data.timetable[0];
      assert.ok(firstEntry.period, 'Entry must contain period');
      assert.ok(firstEntry.time, 'Entry must contain time');
      assert.ok(firstEntry.subject, 'Entry must contain subject');
      assert.ok(firstEntry.faculty, 'Entry must contain faculty');
      assert.ok(firstEntry.room, 'Entry must contain allocated room');
    }
  });

  test('2. Class Search with Day filter restricts schedule to that day', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/class-wise?sectionId=${testSection._id}&day=Monday`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.day, 'Monday');
    if (res.body.data.timetable.length > 0) {
      assert.ok(res.body.data.timetable.every((t) => t.day === 'Monday'));
    }
  });

  test('3. Faculty Search by ObjectId returns faculty profile and chronological timetable', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/faculty-wise?faculty=${testFaculty._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.faculty);
    assert.equal(res.body.data.faculty._id.toString(), testFaculty._id.toString());
    assert.equal(res.body.data.faculty.fullName, testFaculty.fullName);
    assert.ok(res.body.data.currentStatus);
    assert.ok(Array.isArray(res.body.data.schedule));
  });

  test('4. Faculty Search by Name matches correctly', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/faculty-wise?faculty=${encodeURIComponent(testFaculty.fullName)}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.faculty);
    assert.equal(res.body.data.faculty.fullName, testFaculty.fullName);
  });

  test('5. Room Search by Classroom ObjectId returns venue details and timetable', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/room-wise?roomId=${testClassroom._id}&day=Monday`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.room);
    assert.equal(res.body.data.room._id.toString(), testClassroom._id.toString());
    assert.equal(res.body.data.room.roomNumber, testClassroom.roomNumber);
    assert.ok(Array.isArray(res.body.data.timetable));
  });

  test('6. Room Search handles Lab ObjectId if lab exists', async () => {
    if (!testLab) return;
    const res = await request(app)
      .get(`/api/v1/dean/room-wise?roomId=${testLab._id}&day=Monday`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.room);
    assert.equal(res.body.data.room.roomType, 'Lab');
    assert.equal(res.body.data.room._id.toString(), testLab._id.toString());
  });

  test('7. Room Search handles Auditorium ObjectId if auditorium exists', async () => {
    if (!testAuditorium) return;
    const res = await request(app)
      .get(`/api/v1/dean/room-wise?roomId=${testAuditorium._id}&day=Monday`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.room);
    assert.equal(res.body.data.room.roomType, 'Auditorium');
    assert.equal(res.body.data.room._id.toString(), testAuditorium._id.toString());
  });

  test('8. Current Status search for Classroom ObjectId returns status', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/current-status?q=${testClassroom._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.entityType, 'ROOM');
    assert.equal(res.body.data.roomType, 'Classroom');
    assert.ok(res.body.data.status === 'FREE' || res.body.data.status === 'OCCUPIED');
    assert.ok(res.body.data.currentTime);
  });

  test('9. Current Status search for Faculty ObjectId returns teaching status', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/current-status?q=${testFaculty._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.entityType, 'FACULTY');
    assert.equal(res.body.data.title, testFaculty.fullName);
    assert.ok(res.body.data.currentTime);
  });

  test('10. Current Status search for Auditorium returns status', async () => {
    if (!testAuditorium) return;
    const res = await request(app)
      .get(`/api/v1/dean/current-status?q=${testAuditorium._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.entityType, 'ROOM');
    assert.equal(res.body.data.roomType, 'Auditorium');
  });

  test('11. Faculty Directory detail endpoint GET /api/v1/dean/faculty/:id returns full profile and weekly schedule', async () => {
    const res = await request(app)
      .get(`/api/v1/dean/faculty/${testFaculty._id}`)
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.faculty);
    assert.equal(res.body.data.faculty._id.toString(), testFaculty._id.toString());
    assert.ok(Array.isArray(res.body.data.assignedSubjects));
    assert.ok(Array.isArray(res.body.data.assignedSections));
    assert.ok(Array.isArray(res.body.data.assignedRooms));
    assert.ok(res.body.data.weeklySchedule);
    assert.ok(Array.isArray(res.body.data.weeklySchedule.Monday));
  });

  test('12. Backward Compatibility: Legacy class-wise search with room & time continues to pass', async () => {
    const res = await request(app)
      .get('/api/v1/dean/class-wise?room=B314&day=Monday&time=10:00 AM')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'OCCUPIED');
    assert.equal(res.body.data.roomNumber, 'B314');
  });
});
