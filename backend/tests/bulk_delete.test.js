const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { MONGODB_URI, JWT_SECRET } = require('../src/config/env');
const { academicEvents, ACADEMIC_EVENTS } = require('../src/utils/eventEmitter');

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
let testAdminId = '';
let testFacultyId = '';
let testSemesterId = '';
let testSubjectId = '';
let testSectionId = '';
let testClassroomId = '';
let testPeriod1Id = '';
let testPeriod2Id = '';
let testPeriod3Id = '';

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }

  // Clean previous test data
  await Promise.all([
    Admin.deleteMany({ email: /bulktest.*@campussynq\.test/ }),
    Faculty.deleteMany({ officialEmail: /bulktest.*@campussynq\.com/ }),
    Semester.deleteMany({ name: /BulkTest Semester/ }),
    Subject.deleteMany({ code: /BLK-CS/ }),
    ClassSection.deleteMany({ name: /BulkTest Section/ }),
    Classroom.deleteMany({ roomNumber: /BLK-ROOM/ }),
    Period.deleteMany({ periodNumber: { $in: ['P81', 'P82', 'P83'] } }),
    TimetableEntry.deleteMany({ day: 'Friday', roomType: 'Classroom' })
  ]);

  // Seed Admin
  const admin = await Admin.create({
    fullName: 'Bulk Test Admin',
    email: 'bulktest-admin@campussynq.test',
    password: 'Password123!',
    role: 'ADMIN',
    status: 'ACTIVE'
  });
  testAdminId = admin._id.toString();
  adminToken = jwt.sign({ userId: admin._id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });

  // Seed Faculty
  const faculty = await Faculty.create({
    facultyId: 'BLK-FAC-01',
    fullName: 'Bulk Faculty User',
    officialEmail: 'bulktest.fac@campussynq.com',
    personalEmail: 'bulktest.fac.personal@gmail.com',
    phone: '9876543219',
    password: 'Password123!',
    department: 'Computer Science',
    designation: 'Assistant Professor',
    employmentType: 'PERMANENT',
    weeklyTargetHours: 16,
    assignedHours: 0,
    role: 'FACULTY',
    status: 'ACTIVE'
  });
  testFacultyId = faculty._id.toString();
  facultyToken = jwt.sign({ userId: faculty._id, role: 'FACULTY' }, JWT_SECRET, { expiresIn: '1h' });

  // Seed Master Data
  const sem = await Semester.create({
    name: 'BulkTest Semester 4',
    academicYear: '2026-2027',
    startDate: new Date('2026-07-01'),
    endDate: new Date('2026-12-31'),
    status: 'ACTIVE'
  });
  testSemesterId = sem._id.toString();

  const sec = await ClassSection.create({
    name: 'BulkTest Section B',
    semester: sem._id,
    capacity: 60,
    status: 'ACTIVE'
  });
  testSectionId = sec._id.toString();

  const sub = await Subject.create({
    name: 'Bulk Data Structures',
    code: 'BLK-CS201',
    semester: sem._id,
    type: 'THEORY',
    weeklyHours: 4,
    status: 'ACTIVE'
  });
  testSubjectId = sub._id.toString();

  const room = await Classroom.create({
    roomNumber: 'BLK-ROOM-301',
    capacity: 70,
    status: 'ACTIVE'
  });
  testClassroomId = room._id.toString();

  const p1 = await Period.create({
    periodNumber: 'P81',
    startTime: '09:00 AM',
    endTime: '10:00 AM',
    order: 81
  });
  testPeriod1Id = p1._id.toString();

  const p2 = await Period.create({
    periodNumber: 'P82',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    order: 82
  });
  testPeriod2Id = p2._id.toString();

  const p3 = await Period.create({
    periodNumber: 'P83',
    startTime: '11:00 AM',
    endTime: '12:00 PM',
    order: 83
  });
  testPeriod3Id = p3._id.toString();
});

test.after(async () => {
  await Promise.all([
    Admin.deleteMany({ email: /bulktest.*@campussynq\.test/ }),
    Faculty.deleteMany({ officialEmail: /bulktest.*@campussynq/ }),
    Semester.deleteMany({ name: /BulkTest Semester/ }),
    Subject.deleteMany({ code: /BLK-CS/ }),
    ClassSection.deleteMany({ name: /BulkTest Section/ }),
    Classroom.deleteMany({ roomNumber: /BLK-ROOM/ }),
    Period.deleteMany({ periodNumber: { $in: ['P81', 'P82', 'P83'] } }),
    TimetableEntry.deleteMany({ day: 'Friday' }),
    Substitution.deleteMany({ date: '2026-10-16' })
  ]);
  await mongoose.connection.close();
});

test('Suite 7: CampusSynq Bulk Timetable Selection & Deletion', async (t) => {
  // -------------------------------------------------------------
  // PART A: Frontend Selection Logic Unit Tests
  // -------------------------------------------------------------
  await t.test('A1. Row selection logic: selecting and deselecting single rows', () => {
    let selectedIds = [];
    const toggleRow = (id) => {
      if (selectedIds.includes(id)) {
        selectedIds = selectedIds.filter((item) => item !== id);
      } else {
        selectedIds = [...selectedIds, id];
      }
    };

    toggleRow('id_1');
    assert.deepEqual(selectedIds, ['id_1']);

    toggleRow('id_2');
    assert.deepEqual(selectedIds, ['id_1', 'id_2']);

    toggleRow('id_1');
    assert.deepEqual(selectedIds, ['id_2']);

    toggleRow('id_2');
    assert.deepEqual(selectedIds, []);
  });

  await t.test('A2. Select all and toggle all visible rows logic', () => {
    const visibleIds = ['id_1', 'id_2', 'id_3'];
    let selectedIds = [];

    // Select all visible
    const selectAllVisible = () => {
      const set = new Set(selectedIds);
      visibleIds.forEach((id) => set.add(id));
      selectedIds = Array.from(set);
    };

    selectAllVisible();
    assert.deepEqual(selectedIds, ['id_1', 'id_2', 'id_3']);

    // Check indeterminate calculation
    const getIndeterminate = () => {
      const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length;
      return selectedVisibleCount > 0 && selectedVisibleCount < visibleIds.length;
    };

    assert.equal(getIndeterminate(), false); // all visible selected, so indeterminate is false

    // Deselect one visible item
    selectedIds = ['id_1', 'id_2'];
    assert.equal(getIndeterminate(), true); // 2 of 3 visible selected -> indeterminate is true!

    // Deselect all
    selectedIds = [];
    assert.equal(getIndeterminate(), false); // 0 selected -> indeterminate is false
  });

  await t.test('A3. Selection preservation across day/filter switches', () => {
    // User selected id_1 on Monday
    let selectedIds = ['id_monday_1'];
    // Filter switches to Tuesday displaying id_tuesday_1, id_tuesday_2
    const tuesdayVisibleIds = ['id_tuesday_1', 'id_tuesday_2'];

    // Select visible Tuesday rows
    const set = new Set(selectedIds);
    tuesdayVisibleIds.forEach((id) => set.add(id));
    selectedIds = Array.from(set);

    // Monday selection must NOT be lost!
    assert.ok(selectedIds.includes('id_monday_1'));
    assert.ok(selectedIds.includes('id_tuesday_1'));
    assert.ok(selectedIds.includes('id_tuesday_2'));
    assert.equal(selectedIds.length, 3);
  });

  // -------------------------------------------------------------
  // PART B: Backend Bulk Delete API Security & RBAC
  // -------------------------------------------------------------
  await t.test('B1. RBAC: Reject unauthenticated request with 401', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .send({ ids: [new mongoose.Types.ObjectId().toString()] });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('B2. RBAC: Reject non-admin role (Faculty) with 403', async () => {
    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ ids: [new mongoose.Types.ObjectId().toString()] });

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.equal(res.body.code, 'FORBIDDEN');
  });

  // -------------------------------------------------------------
  // PART C: Backend Validation & Error Handling
  // -------------------------------------------------------------
  await t.test('C1. Validation: Reject missing or empty ids array with 400', async () => {
    // Missing body
    const res1 = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    assert.equal(res1.status, 400);
    assert.equal(res1.body.code, 'INVALID_REQUEST');

    // Empty array
    const res2 = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [] });

    assert.equal(res2.status, 400);
    assert.equal(res2.body.code, 'INVALID_REQUEST');
  });

  await t.test('C2. Validation: Reject malformed ObjectIds with 400 INVALID_RESOURCE_ID', async () => {
    const validId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [validId, 'invalid-id-xyz', '12345'] });

    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'INVALID_RESOURCE_ID');
    assert.ok(res.body.details?.invalidIds?.includes('invalid-id-xyz'));
  });

  await t.test('C3. Validation: Return 404 NOT_FOUND when all IDs are non-existent', async () => {
    const fakeId1 = new mongoose.Types.ObjectId().toString();
    const fakeId2 = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ids: [fakeId1, fakeId2] });

    assert.equal(res.status, 404);
    assert.equal(res.body.code, 'NOT_FOUND');
  });

  // -------------------------------------------------------------
  // PART D: Successful Bulk Deletion, Deduplication & Cascades
  // -------------------------------------------------------------
  await t.test('D1. Safe Bulk Deletion: deletes multiple entries, handles duplicates, cleans substitutions & emits SSE', async () => {
    // Create 3 timetable entries
    const [entry1, entry2, entry3] = await Promise.all([
      TimetableEntry.create({
        day: 'Friday',
        period: testPeriod1Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFacultyId,
        roomType: 'Classroom',
        roomId: testClassroomId,
        roomDetails: { roomNumber: 'BLK-ROOM-301' },
        status: 'ACTIVE'
      }),
      TimetableEntry.create({
        day: 'Friday',
        period: testPeriod2Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFacultyId,
        roomType: 'Classroom',
        roomId: testClassroomId,
        roomDetails: { roomNumber: 'BLK-ROOM-301' },
        status: 'ACTIVE'
      }),
      TimetableEntry.create({
        day: 'Friday',
        period: testPeriod3Id,
        semester: testSemesterId,
        section: testSectionId,
        subject: testSubjectId,
        faculty: testFacultyId,
        roomType: 'Classroom',
        roomId: testClassroomId,
        roomDetails: { roomNumber: 'BLK-ROOM-301' },
        status: 'ACTIVE'
      })
    ]);

    // Create a substitution linked to entry1
    const sub = await Substitution.create({
      timetableEntry: entry1._id,
      day: 'Friday',
      date: '2026-10-16',
      period: testPeriod1Id,
      originalFaculty: testFacultyId,
      substituteFaculty: testFacultyId,
      subject: testSubjectId,
      section: testSectionId,
      roomType: 'Classroom',
      roomId: testClassroomId,
      roomDetails: { roomNumber: 'BLK-ROOM-301' },
      status: 'PENDING',
      createdBy: testFacultyId
    });

    // Setup listener to verify SSE event emission
    let sseEmitted = false;
    let ssePayload = null;
    const eventHandler = (payload) => {
      sseEmitted = true;
      ssePayload = payload;
    };
    academicEvents.once(ACADEMIC_EVENTS.TIMETABLE_DELETED, eventHandler);

    // Call bulk delete with entry1 and entry2, including a duplicate of entry1
    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: [entry1._id.toString(), entry2._id.toString(), entry1._id.toString()]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deletedCount, 2);
    assert.equal(res.body.data.isPartial, false);

    // Verify entries were actually deleted from MongoDB
    const remainingEntry1 = await TimetableEntry.findById(entry1._id);
    const remainingEntry2 = await TimetableEntry.findById(entry2._id);
    const remainingEntry3 = await TimetableEntry.findById(entry3._id);

    assert.equal(remainingEntry1, null, 'Entry 1 should be deleted');
    assert.equal(remainingEntry2, null, 'Entry 2 should be deleted');
    assert.notEqual(remainingEntry3, null, 'Entry 3 was not selected and must NOT be deleted');

    // Verify linked substitution was cleaned up
    const remainingSub = await Substitution.findById(sub._id);
    assert.equal(remainingSub, null, 'Linked substitution must be cleaned up to avoid orphan records');

    // Verify SSE event was emitted
    assert.equal(sseEmitted, true, 'TIMETABLE_DELETED event should be emitted');
    assert.equal(ssePayload?.deletedCount, 2);

    // Master data must remain untouched!
    const subjectStillExists = await Subject.findById(testSubjectId);
    const classroomStillExists = await Classroom.findById(testClassroomId);
    assert.ok(subjectStillExists, 'Master data subject must not be deleted');
    assert.ok(classroomStillExists, 'Master data classroom must not be deleted');

    // Clean up remaining entry 3
    await TimetableEntry.deleteOne({ _id: entry3._id });
  });

  // -------------------------------------------------------------
  // PART E: Partial Deletion Behavior
  // -------------------------------------------------------------
  await t.test('E1. Partial deletion: handles mixed existing and non-existent IDs cleanly', async () => {
    // Create 1 valid entry
    const entry = await TimetableEntry.create({
      day: 'Friday',
      period: testPeriod1Id,
      semester: testSemesterId,
      section: testSectionId,
      subject: testSubjectId,
      faculty: testFacultyId,
      roomType: 'Classroom',
      roomId: testClassroomId,
      roomDetails: { roomNumber: 'BLK-ROOM-301' },
      status: 'ACTIVE'
    });

    const nonExistentId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .delete('/api/v1/admin/timetable/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        ids: [entry._id.toString(), nonExistentId]
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.deletedCount, 1);
    assert.equal(res.body.data.isPartial, true);
    assert.ok(res.body.data.missingIds?.includes(nonExistentId));

    const check = await TimetableEntry.findById(entry._id);
    assert.equal(check, null);
  });

  // -------------------------------------------------------------
  // PART F: Regression Testing: Single Deletion
  // -------------------------------------------------------------
  await t.test('F1. Regression: Single timetable entry deletion continues to work flawlessly', async () => {
    const entry = await TimetableEntry.create({
      day: 'Friday',
      period: testPeriod2Id,
      semester: testSemesterId,
      section: testSectionId,
      subject: testSubjectId,
      faculty: testFacultyId,
      roomType: 'Classroom',
      roomId: testClassroomId,
      roomDetails: { roomNumber: 'BLK-ROOM-301' },
      status: 'ACTIVE'
    });

    const res = await request(app)
      .delete(`/api/v1/admin/timetable/${entry._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);

    const check = await TimetableEntry.findById(entry._id);
    assert.equal(check, null);
  });
});
