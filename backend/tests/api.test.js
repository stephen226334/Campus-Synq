const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const { MONGODB_URI } = require('../src/config/env');

// Models
const Admin = require('../src/models/Admin');
const Semester = require('../src/models/Semester');
const Subject = require('../src/models/Subject');
const ClassSection = require('../src/models/ClassSection');
const Classroom = require('../src/models/Classroom');
const Lab = require('../src/models/Lab');
const Auditorium = require('../src/models/Auditorium');

let adminToken = '';
let testAdminId = '';
let testSemesterId = '';
let testSubjectId = '';
let testSectionId = '';
let testClassroomId = '';
let testLabId = '';
let testAuditoriumId = '';

test.before(async () => {
  // Connect to DB if not already connected
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGODB_URI);
  }
  // Clear any existing test data to start clean
  await Promise.all([
    Admin.deleteMany({ email: /test.*@campussynq\.test/ }),
    Semester.deleteMany({ name: /Test Semester/ }),
    Subject.deleteMany({ code: /TEST-CS/ }),
    ClassSection.deleteMany({ name: /Test Section/ }),
    Classroom.deleteMany({ roomNumber: /TEST-ROOM/ }),
    Lab.deleteMany({ labNumber: /TEST-LAB/ }),
    Auditorium.deleteMany({ auditoriumNumber: /TEST-AUD/ })
  ]);
});

test.after(async () => {
  // Clean up test records
  await Promise.all([
    Admin.deleteMany({ email: /test.*@campussynq\.test/ }),
    Semester.deleteMany({ name: /Test Semester/ }),
    Subject.deleteMany({ code: /TEST-CS/ }),
    ClassSection.deleteMany({ name: /Test Section/ }),
    Classroom.deleteMany({ roomNumber: /TEST-ROOM/ }),
    Lab.deleteMany({ labNumber: /TEST-LAB/ }),
    Auditorium.deleteMany({ auditoriumNumber: /TEST-AUD/ })
  ]);
  await mongoose.disconnect();
});

test('Campus Synq Backend API Test Suite', async (t) => {
  await t.test('1. Health check endpoint responds OK', async () => {
    const res = await request(app).get('/api/v1/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.product, 'Campus Synq');
  });

  await t.test('2. Auth Status returns initialization state', async () => {
    const res = await request(app).get('/api/v1/auth/status');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(typeof res.body.data.isInitialized === 'boolean');
  });

  await t.test('3. Admin Signup validation catches errors', async () => {
    const res = await request(app).post('/api/v1/auth/signup').send({
      fullName: 'A',
      email: 'invalid-email',
      password: '123',
      confirmPassword: '456'
    });
    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test('4. Admin registration or login with test admin', async () => {
    // If no admin exists, signup. If admin exists, check registration lock.
    const statusRes = await request(app).get('/api/v1/auth/status');
    if (!statusRes.body.data.isInitialized) {
      const res = await request(app).post('/api/v1/auth/signup').send({
        fullName: 'Test Administrator',
        email: 'testadmin@campussynq.test',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      assert.equal(res.status, 201);
      assert.ok(res.body.data.token);
      assert.equal(res.body.data.admin.role, 'ADMIN');
      adminToken = res.body.data.token;
      testAdminId = res.body.data.admin.id;

      // Now verify public signup is locked
      const lockedRes = await request(app).post('/api/v1/auth/signup').send({
        fullName: 'Second Admin',
        email: 'second@campussynq.test',
        password: 'Password123!',
        confirmPassword: 'Password123!'
      });
      assert.equal(lockedRes.status, 403);
    } else {
      // Create a test admin directly in DB for testing
      const testAdmin = await Admin.create({
        fullName: 'Test Administrator',
        email: 'testadmin@campussynq.test',
        password: 'Password123!',
        role: 'ADMIN',
        status: 'ACTIVE'
      });
      testAdminId = testAdmin._id.toString();

      // Test login
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: 'testadmin@campussynq.test',
        password: 'Password123!'
      });
      assert.equal(loginRes.status, 200);
      assert.ok(loginRes.body.data.token);
      adminToken = loginRes.body.data.token;
    }
  });

  await t.test('5. Auth Login with invalid credentials returns 401', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({
      email: 'testadmin@campussynq.test',
      password: 'WrongPassword999!'
    });
    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
  });

  await t.test('6. Protected route without token returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    assert.equal(res.status, 401);
  });

  await t.test('7. Protected route with valid token returns current admin profile', async () => {
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.equal(res.body.data.role, 'ADMIN');
    assert.equal(res.body.data.department, 'Computer Science');
    // Ensure password is not exposed
    assert.equal(res.body.data.password, undefined);
  });

  await t.test('8. Dashboard API returns database counts', async () => {
    const res = await request(app)
      .get('/api/v1/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(res.status, 200);
    assert.ok(res.body.data.counts);
    assert.ok(typeof res.body.data.counts.subjects === 'number');
    assert.ok(typeof res.body.data.counts.semesters === 'number');
  });

  await t.test('9. Semesters CRUD operations', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/v1/admin/semesters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Semester 1',
        academicYear: '2026-2027',
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.data.name, 'Test Semester 1');
    testSemesterId = createRes.body.data._id;

    // Duplicate check
    const dupRes = await request(app)
      .post('/api/v1/admin/semesters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Semester 1',
        academicYear: '2026-2027',
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);

    // List & Search
    const listRes = await request(app)
      .get('/api/v1/admin/semesters?search=Test Semester')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);

    // Update
    const updateRes = await request(app)
      .put(`/api/v1/admin/semesters/${testSemesterId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Semester 1 (Updated)'
      });
    assert.equal(updateRes.status, 200);
    assert.equal(updateRes.body.data.name, 'Test Semester 1 (Updated)');
  });

  await t.test('10. Subjects CRUD and duplicate validation', async () => {
    // Create
    const createRes = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Data Structures',
        code: 'TEST-CS201',
        semester: testSemesterId,
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.data.code, 'TEST-CS201');
    testSubjectId = createRes.body.data._id;

    // Duplicate code check
    const dupRes = await request(app)
      .post('/api/v1/admin/subjects')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Another Subject',
        code: 'TEST-CS201',
        semester: testSemesterId,
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);

    // Read by ID
    const getRes = await request(app)
      .get(`/api/v1/admin/subjects/${testSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.data.code, 'TEST-CS201');
  });

  await t.test('11. Class Sections CRUD', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/class-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Section A',
        semester: testSemesterId,
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    testSectionId = createRes.body.data._id;

    // Duplicate in same semester blocked
    const dupRes = await request(app)
      .post('/api/v1/admin/class-sections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Section A',
        semester: testSemesterId,
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);
  });

  await t.test('12. Classrooms CRUD', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/classrooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomNumber: 'TEST-ROOM-101',
        capacity: 65,
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    testClassroomId = createRes.body.data._id;

    // Duplicate check
    const dupRes = await request(app)
      .post('/api/v1/admin/classrooms')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        roomNumber: 'TEST-ROOM-101',
        capacity: 40,
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);
  });

  await t.test('13. Labs CRUD', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/labs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        labName: 'Test Systems Lab',
        labNumber: 'TEST-LAB-01',
        capacity: 35,
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    testLabId = createRes.body.data._id;

    // Duplicate check
    const dupRes = await request(app)
      .post('/api/v1/admin/labs')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        labName: 'Another Lab',
        labNumber: 'TEST-LAB-01',
        capacity: 30,
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);
  });

  await t.test('14. Auditoriums CRUD', async () => {
    const createRes = await request(app)
      .post('/api/v1/admin/auditoriums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        auditoriumName: 'Test Grand Hall',
        auditoriumNumber: 'TEST-AUD-01',
        capacity: 400,
        status: 'ACTIVE'
      });
    assert.equal(createRes.status, 201);
    testAuditoriumId = createRes.body.data._id;

    // Duplicate check
    const dupRes = await request(app)
      .post('/api/v1/admin/auditoriums')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        auditoriumName: 'Second Hall',
        auditoriumNumber: 'TEST-AUD-01',
        capacity: 250,
        status: 'ACTIVE'
      });
    assert.equal(dupRes.status, 409);
  });

  await t.test('15. Referential integrity check prevents deleting referenced semester', async () => {
    // Semester is referenced by testSubjectId and testSectionId
    const delRes = await request(app)
      .delete(`/api/v1/admin/semesters/${testSemesterId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delRes.status, 400);
    assert.match(delRes.body.message, /currently referenced by/);
  });

  await t.test('16. Clean deletion after dependencies are removed', async () => {
    // Delete subject and section first
    const delSubRes = await request(app)
      .delete(`/api/v1/admin/subjects/${testSubjectId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delSubRes.status, 200);

    const delSecRes = await request(app)
      .delete(`/api/v1/admin/class-sections/${testSectionId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delSecRes.status, 200);

    // Now delete semester should succeed!
    const delSemRes = await request(app)
      .delete(`/api/v1/admin/semesters/${testSemesterId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delSemRes.status, 200);

    // Delete classroom, lab, auditorium
    const delRoom = await request(app)
      .delete(`/api/v1/admin/classrooms/${testClassroomId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delRoom.status, 200);

    const delLab = await request(app)
      .delete(`/api/v1/admin/labs/${testLabId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delLab.status, 200);

    const delAud = await request(app)
      .delete(`/api/v1/admin/auditoriums/${testAuditoriumId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(delAud.status, 200);
  });
});
