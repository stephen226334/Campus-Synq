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
const Lab = require('../src/models/Lab');
const Auditorium = require('../src/models/Auditorium');
const TimetableEntry = require('../src/models/TimetableEntry');
const Substitution = require('../src/models/Substitution');
const connectDB = require('../src/config/db');
const seedFacultyPortalData = require('../src/utils/seedFacultyData');

describe('Campus Synq — Dean Oversight Portal Test Suite', () => {
  let deanToken;
  let facultyToken;
  let testSubstitution;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    await seedFacultyPortalData();

    // 1. Authenticate Dean
    const deanRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'Dean@campussynq.com', password: 'Password123' });

    assert.equal(deanRes.status, 200);
    assert.equal(deanRes.body.data.user.role, 'DEAN');
    deanToken = deanRes.body.data.token;

    // 2. Authenticate Faculty
    const facRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'subu@campussynq.com', password: 'password@123' });

    assert.equal(facRes.status, 200);
    assert.equal(facRes.body.data.user.role, 'FACULTY');
    facultyToken = facRes.body.data.token;
  });

  describe('1. Dean Authentication & RBAC Protection', () => {
    test('Dean login succeeds with valid credentials and returns DEAN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'dean@campussynq.com', password: 'Password123' });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.user.role, 'DEAN');
      assert.equal(res.body.data.user.email, 'dean@campussynq.com');
    });

    test('Dean login fails with invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'dean@campussynq.com', password: 'WrongPassword' });

      assert.equal(res.status, 401);
    });

    test('Unauthenticated access to /api/v1/dean/dashboard returns 401', async () => {
      const res = await request(app).get('/api/v1/dean/dashboard');
      assert.equal(res.status, 401);
    });

    test('Faculty user attempting to access /api/v1/dean/dashboard returns 403 Forbidden', async () => {
      const res = await request(app)
        .get('/api/v1/dean/dashboard')
        .set('Authorization', `Bearer ${facultyToken}`);

      assert.equal(res.status, 403);
      assert.ok(res.body.message.includes('Access denied'));
    });
  });

  describe('2. Dean Dashboard & Real MongoDB Metrics', () => {
    test('GET /api/v1/dean/dashboard returns 200 with all 11 summary metrics and today schedule', async () => {
      const res = await request(app)
        .get('/api/v1/dean/dashboard')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      const metrics = res.body.data.metrics;

      assert.ok(metrics.totalFaculty >= 1);
      assert.ok(metrics.activeFaculty >= 1);
      assert.ok(metrics.totalSubjects >= 1);
      assert.ok(metrics.totalClassrooms >= 1);
      assert.ok(metrics.totalSemesters >= 1);
      assert.ok(metrics.totalSections >= 1);
      assert.ok(metrics.totalLabs >= 1);
      assert.ok(metrics.totalAuditoriums >= 1);
      assert.ok(metrics.activeTimetableSessions >= 1);
      assert.ok(typeof metrics.todayClassesCount === 'number');
      assert.ok(typeof metrics.pendingSubstitutionsCount === 'number');

      assert.ok(res.body.data.currentAcademicContext);
      assert.equal(res.body.data.currentAcademicContext.department, 'Computer Science Department');
      assert.ok(Array.isArray(res.body.data.todaySchedule));
    });
  });

  describe('3. Global Multi-Entity Search', () => {
    test('Search for faculty "Subu" returns FACULTY category result', async () => {
      const res = await request(app)
        .get('/api/v1/dean/search?q=Subu')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.categorized.FACULTY.length >= 1);
      assert.ok(res.body.data.categorized.FACULTY[0].title.includes('Subu'));
    });

    test('Search for classroom "CS-101" returns CLASSROOM category result', async () => {
      const res = await request(app)
        .get('/api/v1/dean/search?q=CS-101')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.categorized.CLASSROOMS.length >= 1);
      assert.equal(res.body.data.categorized.CLASSROOMS[0].title, 'CS-101');
    });

    test('Search for subject "Database" returns SUBJECT category result', async () => {
      const res = await request(app)
        .get('/api/v1/dean/search?q=Database')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.categorized.SUBJECTS.length >= 1);
      assert.ok(res.body.data.categorized.SUBJECTS[0].title.includes('Database'));
    });

    test('Search for lab "LAB-01" returns LAB category result', async () => {
      const res = await request(app)
        .get('/api/v1/dean/search?q=LAB-01')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.categorized.LABS.length >= 1);
    });
  });

  describe('4. Academic Directory Inspection Endpoints', () => {
    test('GET /api/v1/dean/faculty returns full faculty list', async () => {
      const res = await request(app)
        .get('/api/v1/dean/faculty')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(res.body.data.length >= 1);
    });

    test('GET /api/v1/dean/faculty/:id returns faculty with weekly timetable and assigned rooms', async () => {
      const faculty = await Faculty.findOne({ officialEmail: 'subu@campussynq.com' });
      assert.ok(faculty);

      const res = await request(app)
        .get(`/api/v1/dean/faculty/${faculty._id}`)
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.faculty.fullName, 'Subu');
      assert.ok(res.body.data.weeklySchedule);
      assert.ok(res.body.data.weeklySchedule.Monday);
      assert.ok(res.body.data.assignedRooms);
    });

    test('GET /api/v1/dean/subjects returns all curriculum subjects', async () => {
      const res = await request(app)
        .get('/api/v1/dean/subjects')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('GET /api/v1/dean/classrooms returns classrooms with weekly session count', async () => {
      const res = await request(app)
        .get('/api/v1/dean/classrooms')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
      assert.ok(typeof res.body.data[0].assignedSessionsCount === 'number');
    });

    test('GET /api/v1/dean/labs returns labs with associated subjects', async () => {
      const res = await request(app)
        .get('/api/v1/dean/labs')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('GET /api/v1/dean/auditoriums returns auditoriums', async () => {
      const res = await request(app)
        .get('/api/v1/dean/auditoriums')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('GET /api/v1/dean/semesters returns semesters list', async () => {
      const res = await request(app)
        .get('/api/v1/dean/semesters')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('GET /api/v1/dean/sections returns class sections', async () => {
      const res = await request(app)
        .get('/api/v1/dean/sections')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('GET /api/v1/dean/timetable returns master timetable entries', async () => {
      const res = await request(app)
        .get('/api/v1/dean/timetable?day=Monday')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });
  });

  describe('5. Five Dedicated Search Modes & Quick Search', () => {
    test('Quick Search suggestions returns matches for B314', async () => {
      const res = await request(app)
        .get('/api/v1/dean/quick-search?q=B314')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.suggestions));
      assert.ok(res.body.data.suggestions.some(s => s.title.includes('B314')));
    });

    test('Mode 1: Class-Wise search (B314 + Monday + 10:00 AM) returns OCCUPIED with Prof. Ravi', async () => {
      const res = await request(app)
        .get('/api/v1/dean/class-wise?room=B314&day=Monday&time=10:00 AM')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'OCCUPIED');
      assert.equal(res.body.data.roomNumber, 'B314');
      assert.ok(res.body.data.faculty.includes('Ravi'));
      assert.ok(res.body.data.subject.includes('Database'));
      assert.equal(res.body.data.className, 'MSc Computer Science A');
    });

    test('Mode 1: Class-Wise search for unscheduled period returns FREE', async () => {
      const res = await request(app)
        .get('/api/v1/dean/class-wise?room=B201&day=Monday&time=10:00 AM')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.status, 'FREE');
      assert.ok(res.body.data.message.includes('No class is scheduled'));
    });

    test('Mode 2: Room-Wise search for B314 returns complete Monday timetable with OCCUPIED and FREE slots', async () => {
      const res = await request(app)
        .get('/api/v1/dean/room-wise?room=B314&day=Monday')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.room.roomNumber, 'B314');
      assert.equal(res.body.data.day, 'Monday');
      assert.ok(Array.isArray(res.body.data.timetable));
      assert.ok(res.body.data.timetable.length >= 6);

      const occupiedSlots = res.body.data.timetable.filter(t => t.status === 'OCCUPIED');
      const freeSlots = res.body.data.timetable.filter(t => t.status === 'FREE');
      assert.ok(occupiedSlots.length >= 2);
      assert.ok(freeSlots.length >= 1);
    });

    test('Mode 3: Faculty-Wise search for Prof. Ravi returns timetable and live status indicator', async () => {
      const res = await request(app)
        .get('/api/v1/dean/faculty-wise?faculty=Ravi')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.faculty.fullName.includes('Ravi'));
      assert.ok(res.body.data.currentStatus);
      assert.ok(res.body.data.currentStatusBadge);
      assert.ok(Array.isArray(res.body.data.schedule));
      assert.ok(res.body.data.schedule.length >= 1);
    });

    test('Mode 4: Free Rooms search for Monday 10:00 AM returns AVAILABLE and OCCUPIED sections', async () => {
      const res = await request(app)
        .get('/api/v1/dean/free-rooms?day=Monday&time=10:00 AM')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data.availableRooms));
      assert.ok(Array.isArray(res.body.data.occupiedRooms));
      assert.ok(res.body.data.totalAvailable >= 1);
      assert.ok(res.body.data.totalOccupied >= 1);

      // Verify B314 is in occupied list and B201 is in available list
      const isB314Occupied = res.body.data.occupiedRooms.some(r => r.roomNumber === 'B314');
      assert.ok(isB314Occupied, 'B314 should be occupied at Mon 10am');
    });

    test('Mode 5: Current Status search for B314 returns real-time status with next status change', async () => {
      const res = await request(app)
        .get('/api/v1/dean/current-status?q=B314')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.entityType, 'ROOM');
      assert.ok(res.body.data.status);
      assert.ok(res.body.data.nextStatusChange);
    });

    test('Mode 5: Current Status search for Prof. Ravi returns calculated faculty status', async () => {
      const res = await request(app)
        .get('/api/v1/dean/current-status?q=Prof.%20Ravi')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.equal(res.body.data.entityType, 'FACULTY');
      assert.ok(res.body.data.status);
      assert.ok(res.body.data.nextStatusChange);
    });
  });

  describe('5. Substitution Center & Modification with Real-Time Events', () => {
    test('GET /api/v1/dean/substitutions returns list with status metrics', async () => {
      const res = await request(app)
        .get('/api/v1/dean/substitutions')
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(res.body.data.metrics);
      assert.ok(res.body.data.substitutions);
      assert.ok(res.body.data.substitutions.length >= 1);

      testSubstitution = res.body.data.substitutions[0];
    });

    test('GET /api/v1/dean/available-substitutes returns eligible faculty for given day & period', async () => {
      assert.ok(testSubstitution);
      const periodId = testSubstitution.period?._id || testSubstitution.period;

      const res = await request(app)
        .get(`/api/v1/dean/available-substitutes?day=${testSubstitution.day}&periodId=${periodId}`)
        .set('Authorization', `Bearer ${deanToken}`);

      assert.equal(res.status, 200);
      assert.ok(Array.isArray(res.body.data));
    });

    test('Dean modifies substitution status and updates record in MongoDB', async () => {
      assert.ok(testSubstitution);

      const res = await request(app)
        .put(`/api/v1/dean/substitutions/${testSubstitution._id}`)
        .set('Authorization', `Bearer ${deanToken}`)
        .send({
          status: 'CONFIRMED',
          reason: 'Authorized and reviewed by Dean of Computer Science'
        });

      assert.equal(res.status, 200);
      assert.equal(res.body.success, true);
      assert.ok(res.body.message.includes('Substitution updated successfully'));
      assert.equal(res.body.data.substitution.status, 'CONFIRMED');
    });
  });

  after(async () => {
    await mongoose.disconnect();
  });
});

