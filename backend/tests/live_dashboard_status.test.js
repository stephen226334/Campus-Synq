const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const seedFacultyPortalData = require('../src/utils/seedFacultyData');
const { calculateLiveAcademicStatus } = require('../src/services/liveAcademicStatusService');

describe('Campus Synq — Live Classes, Room Occupancy & Faculty Availability Status Suite', () => {
  let deanToken;

  before(async () => {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }
    await seedFacultyPortalData();

    // Authenticate Dean
    const deanRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'dean@campussynq.com', password: 'Password123' });

    assert.equal(deanRes.status, 200);
    deanToken = deanRes.body.data.token;

    // Ensure dedicated test conflict scenario in CS-201 for Thursday P2 with unassigned faculty
    const Period = require('../src/models/Period');
    const Classroom = require('../src/models/Classroom');
    const ClassSection = require('../src/models/ClassSection');
    const Subject = require('../src/models/Subject');
    const Semester = require('../src/models/Semester');

    const p2Doc = await Period.findOne({ periodNumber: 'P2' });
    const cs201Doc = await Classroom.findOne({ roomNumber: 'CS-201' });
    const secDoc = await ClassSection.findOne({ name: 'Section B' }) || await ClassSection.findOne();
    const subDoc = await Subject.findOne({ code: 'CS-302' }) || await Subject.findOne();
    const semDoc = await Semester.findOne();

    if (p2Doc && cs201Doc) {
      await mongoose.connection.db.collection('timetableEntries').deleteMany({ isTestConflict: true });
      await mongoose.connection.db.collection('timetableEntries').insertOne({
        day: 'Thursday',
        period: p2Doc._id,
        roomType: 'Classroom',
        roomId: cs201Doc._id,
        roomDetails: { roomNumber: 'CS-201', name: 'Classroom CS-201', capacity: 60 },
        section: secDoc?._id,
        subject: subDoc?._id,
        semester: semDoc?._id,
        faculty: null,
        isTestConflict: true,
        status: 'ACTIVE',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  });

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.db.collection('timetableEntries').deleteMany({ isTestConflict: true });
      await mongoose.disconnect();
    }
  });

  test('1. Time-based status: Class is live ONLY when current time falls within configured period interval', async () => {
    // 10:15 AM on Thursday is within P2 (10:00 AM - 10:50 AM)
    const p2Status = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    assert.equal(p2Status.currentPeriod, 'P2');
    assert.equal(p2Status.todayDay, 'Thursday');
    assert.ok(p2Status.liveClasses.length > 0, 'Should find live classes during P2');

    // Verify all live classes have period P2 and correct start/end times
    for (const c of p2Status.liveClasses) {
      assert.equal(c.period, 'P2');
      assert.equal(c.startTime, '10:00 AM');
      assert.equal(c.endTime, '10:50 AM');
      assert.equal(c.status, 'LIVE');
      assert.ok(c.subject, 'Must have subject name');
      assert.ok(c.room, 'Must have room identifier');
      assert.ok(c.section, 'Must have class section');
    }

    // 12:15 PM on Thursday is during lunch break (11:50 AM - 1:00 PM)
    const breakStatus = await calculateLiveAcademicStatus({
      timeOverride: '12:15 PM',
      dayOverride: 'Thursday'
    });

    assert.equal(breakStatus.currentPeriod, null, 'No period active during lunch break');
    assert.equal(breakStatus.liveClasses.length, 0, '0 classes running during lunch break');
    assert.equal(breakStatus.liveStats.classesRunningNow, 0);
  });

  test('2. Room occupancy calculation: Only counts room as occupied when actual class is running now', async () => {
    // Active period (P2 at 10:15 AM)
    const liveStatus = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    assert.ok(liveStatus.occupiedVenues.length > 0);
    assert.ok(liveStatus.availableVenues.length > 0);
    assert.equal(
      liveStatus.occupiedVenues.length + liveStatus.availableVenues.length,
      liveStatus.liveStats.totalRooms,
      'Occupied + Available must equal total rooms'
    );

    // Each occupied venue must have runningClass details populated
    for (const v of liveStatus.occupiedVenues) {
      assert.equal(v.status, 'OCCUPIED');
      assert.ok(v.runningClass, 'Occupied venue must include running class details');
      assert.ok(v.runningClass.subject, 'Must include subject');
      assert.ok(v.runningClass.section, 'Must include section');
      assert.ok(v.runningClass.faculty, 'Must include faculty');
      assert.ok(v.runningClass.period, 'Must include current period');
      assert.ok(v.identifier, 'Must include room identifier');
      assert.ok(v.venueType, 'Must include venue type');
    }

    // During break: 0 rooms occupied, all rooms available
    const breakStatus = await calculateLiveAcademicStatus({
      timeOverride: '12:15 PM',
      dayOverride: 'Thursday'
    });

    assert.equal(breakStatus.occupiedVenues.length, 0, '0 occupied rooms during break');
    assert.equal(breakStatus.availableVenues.length, breakStatus.liveStats.totalRooms);
    assert.equal(breakStatus.liveStats.occupiedRooms, 0);
    assert.equal(breakStatus.liveStats.freeRooms, breakStatus.liveStats.totalRooms);
  });

  test('3. Deduplication: Multiple timetable sessions in the same venue or faculty do not inflate KPI counts', async () => {
    const statusData = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    // In Thursday P2, there are entries across 3 distinct rooms (CS-201, B315, B316)
    assert.ok(statusData.liveClasses.length >= 3);
    assert.equal(statusData.occupiedVenues.length, 3, 'Must deduplicate to 3 occupied rooms');
    assert.equal(statusData.liveStats.occupiedRooms, 3);
    assert.equal(statusData.liveStats.freeRooms, statusData.liveStats.totalRooms - 3);
    assert.equal(statusData.liveStats.totalRooms, 30);

    // Distinct faculty teaching count must equal distinct teaching faculty
    assert.equal(statusData.teachingFaculty.length, 3, 'Must deduplicate to 3 teaching faculty');
    assert.equal(statusData.liveStats.facultyInClass, 3);
  });

  test('4. Conflict surfacing: Concurrent sessions sharing a room or faculty surface the conflict', async () => {
    const statusData = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    assert.ok(statusData.conflicts.length > 0, 'Must surface scheduling conflicts');
    const roomConflict = statusData.conflicts.find(c => c.type === 'ROOM_CONFLICT');
    assert.ok(roomConflict, 'Must detect ROOM_CONFLICT for CS-201');
    assert.equal(roomConflict.room, 'CS-201');

    // The live classes in CS-201 must have hasConflict: true
    const cs201Classes = statusData.liveClasses.filter(c => c.room === 'CS-201');
    assert.ok(cs201Classes.length > 1);
    for (const c of cs201Classes) {
      assert.equal(c.hasConflict, true);
      assert.equal(c.conflictType, 'ROOM_CONFLICT');
    }

    // The occupied venue CS-201 must also flag hasConflict: true
    const cs201Venue = statusData.occupiedVenues.find(v => v.identifier === 'CS-201');
    assert.ok(cs201Venue);
    assert.equal(cs201Venue.hasConflict, true);
    assert.ok(cs201Venue.conflictingClasses.length > 1);
  });

  test('5. Faculty status classification: Strictly distinguishes 4 categories', async () => {
    const statusData = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    const categories = new Set(statusData.availableFaculty.map(f => f.category));
    assert.ok(categories.has('TEACHING_NOW'), 'Must have TEACHING_NOW category');
    assert.ok(categories.has('AVAILABLE_NOW'), 'Must have AVAILABLE_NOW category');
    assert.ok(categories.has('NOT_SCHEDULED_TODAY'), 'Must have NOT_SCHEDULED_TODAY category');

    const teachingNow = statusData.availableFaculty.filter(f => f.category === 'TEACHING_NOW');
    const availableNow = statusData.availableFaculty.filter(f => f.category === 'AVAILABLE_NOW');
    const notScheduled = statusData.availableFaculty.filter(f => f.category === 'NOT_SCHEDULED_TODAY');
    const unknown = statusData.availableFaculty.filter(f => f.category === 'STATUS_UNKNOWN');

    // Totals must sum to total faculty
    assert.equal(
      teachingNow.length + availableNow.length + notScheduled.length + unknown.length,
      statusData.liveStats.totalFaculty,
      'All faculty must be categorized without duplicates or gaps'
    );

    // Teaching now faculty must have currentClass populated
    for (const f of teachingNow) {
      assert.ok(f.currentClass, 'Teaching faculty must have currentClass');
      assert.ok(f.currentClass.subject);
      assert.ok(f.currentClass.room);
    }

    // Available now faculty must not be currently in class
    for (const f of availableNow) {
      assert.ok(f.todayClassesCount > 0, 'Available faculty has scheduled classes today but is free now');
    }

    // Not scheduled faculty must have 0 classes today
    for (const f of notScheduled) {
      assert.equal(f.todayClassesCount, 0);
    }
  });

  test('6. Missing faculty or venue assignments do not crash the system', async () => {
    const statusData = await calculateLiveAcademicStatus({
      timeOverride: '10:15 AM',
      dayOverride: 'Thursday'
    });

    // Look for classes where faculty is unassigned
    const unassignedClasses = statusData.liveClasses.filter(c => c.facultyDocId === null);
    assert.ok(unassignedClasses.length > 0, 'CS-201 has classes without faculty');
    for (const c of unassignedClasses) {
      assert.equal(c.faculty, 'Faculty Not Assigned');
      assert.equal(c.status, 'LIVE');
    }
  });

  test('7. API: GET /api/v1/dean/dashboard returns unified liveStats and live breakdown', async () => {
    const res = await request(app)
      .get('/api/v1/dean/dashboard')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    const data = res.body.data;

    assert.ok(data.liveStats);
    assert.ok(Array.isArray(data.currentlyActiveClasses));
    assert.ok(Array.isArray(data.occupiedVenues));
    assert.ok(Array.isArray(data.availableVenues));
    assert.ok(Array.isArray(data.teachingFaculty));
    assert.ok(Array.isArray(data.availableFaculty));
    assert.ok(Array.isArray(data.conflicts));

    // KPI consistency
    assert.equal(data.liveStats.classesRunningNow, data.currentlyActiveClasses.length);
    assert.equal(data.liveStats.occupiedRooms, data.occupiedVenues.length);
    assert.equal(data.liveStats.freeRooms, data.availableVenues.length);
    assert.equal(data.liveStats.facultyInClass, data.teachingFaculty.length);
  });

  test('8. Dedicated Endpoint: GET /api/v1/dean/live-status returns full status and accepts simulated time', async () => {
    const res = await request(app)
      .get('/api/v1/dean/live-status?time=10:15%20AM&day=Thursday')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.currentPeriod, 'P2');
    assert.ok(res.body.data.liveClasses.length >= 3);
    assert.equal(res.body.data.occupiedVenues.length, 3);
    assert.equal(res.body.data.availableVenues.length, 27);
  });

  test('9. Dedicated Endpoint: GET /api/v1/dean/live-classes returns active classes running now', async () => {
    const res = await request(app)
      .get('/api/v1/dean/live-classes?time=10:15%20AM&day=Thursday')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.count >= 3);
    assert.ok(Array.isArray(res.body.data.liveClasses));
    assert.equal(res.body.data.currentPeriod, 'P2');
  });

  test('10. Dedicated Endpoint: GET /api/v1/dean/venues-status returns filtered venue lists', async () => {
    const res = await request(app)
      .get('/api/v1/dean/venues-status?time=10:15%20AM&day=Thursday&type=Classroom')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.data.occupiedVenues));
    assert.ok(Array.isArray(res.body.data.availableVenues));

    // All returned venues must be Classrooms
    for (const v of res.body.data.occupiedVenues) {
      assert.equal(v.venueType, 'Classroom');
    }
    for (const v of res.body.data.availableVenues) {
      assert.equal(v.venueType, 'Classroom');
    }
  });

  test('11. Dedicated Endpoint: GET /api/v1/dean/faculty-status returns 4-way categorized faculty', async () => {
    const res = await request(app)
      .get('/api/v1/dean/faculty-status?time=10:15%20AM&day=Thursday')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.teachingCount, 3);
    assert.equal(res.body.data.availableNowCount, 5);
    assert.equal(res.body.data.notScheduledTodayCount, 7);
    assert.equal(res.body.data.totalFaculty, 15);
  });

  test('12. Existing Endpoint: GET /api/v1/dean/free-rooms agrees with live status logic', async () => {
    const res = await request(app)
      .get('/api/v1/dean/free-rooms?time=10:15%20AM&day=Thursday')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.data.totalOccupied, 3);
    assert.equal(res.body.data.totalAvailable, 27);
    assert.equal(res.body.data.totalRooms, 30);
  });

  test('13. Security: Unauthenticated requests to live endpoints return 401 Unauthorized', async () => {
    const res1 = await request(app).get('/api/v1/dean/live-status');
    assert.equal(res1.status, 401);

    const res2 = await request(app).get('/api/v1/dean/live-classes');
    assert.equal(res2.status, 401);

    const res3 = await request(app).get('/api/v1/dean/venues-status');
    assert.equal(res3.status, 401);

    const res4 = await request(app).get('/api/v1/dean/faculty-status');
    assert.equal(res4.status, 401);
  });
});
