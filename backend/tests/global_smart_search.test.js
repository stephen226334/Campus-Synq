const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const connectDB = require('../src/config/db');
const seedFacultyPortalData = require('../src/utils/seedFacultyData');

describe('Campus Synq — Global Smart Search Academic Suite', () => {
  let deanToken;

  after(async () => {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

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
  });

  test('1. Partial faculty name "Satheesh" returns Dr. S Sateesh Kumar with faculty profile navigationUrl', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=Satheesh')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.categories.facultyCount >= 1);
    const faculty = res.body.data.categorized.FACULTY.find((f) =>
      f.title.toLowerCase().includes('sateesh') || f.title.toLowerCase().includes('satheesh')
    );
    assert.ok(faculty, 'Should find Dr. S Sateesh Kumar');
    assert.ok(faculty.navigationUrl.startsWith('/dean/faculty/'));
    assert.equal(faculty.type, 'Faculty');
  });

  test('2. Searching a faculty ID returns the exact faculty member', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=KJ26F0831')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.facultyCount >= 1);
    const faculty = res.body.data.categorized.FACULTY[0];
    assert.ok(faculty.badge.includes('KJ26F0831') || faculty.subtitle.includes('KJ26F0831'));
  });

  test('3. Searching a class name or section returns the matching ClassSection', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=Section')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.sectionsCount >= 1);
    const sec = res.body.data.categorized.SECTIONS[0];
    assert.ok(sec.title.toLowerCase().includes('section'));
    assert.ok(sec.navigationUrl.startsWith('/dean/class-search?section='));
  });

  test('4. Searching a subject code returns the matching Subject', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=CS-301')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.subjectsCount >= 1);
    const sub = res.body.data.categorized.SUBJECTS[0];
    assert.ok(sub.badge.includes('CS-301') || sub.subtitle.includes('CS-301'));
    assert.ok(sub.navigationUrl.startsWith('/dean/subjects?id='));
  });

  test('5. Searching "B314" returns both the Classroom AND matching Timetable sessions', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=B314')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.classroomsCount >= 1, 'Should find classroom B314');
    assert.equal(res.body.data.categorized.CLASSROOMS[0].title, 'B314');
    assert.equal(res.body.data.categorized.CLASSROOMS[0].navigationUrl, '/dean/room-search?room=B314');

    assert.ok(res.body.data.categories.timetableCount >= 1, 'Should find timetable entries in room B314');
    const tt = res.body.data.categorized.TIMETABLE[0];
    assert.ok(tt.subtitle.includes('B314') || tt.badge === 'B314');
    assert.ok(tt.navigationUrl.includes('/dean/class-search?section='));
  });

  test('6. Searching for an existing lab returns the Laboratory with navigationUrl', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=LAB-01')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.labsCount >= 1);
    const lab = res.body.data.categorized.LABS[0];
    assert.equal(lab.title, 'LAB-01');
    assert.equal(lab.navigationUrl, '/dean/room-search?room=LAB-01');
  });

  test('7. Searching for an existing auditorium returns the Auditorium with navigationUrl', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=Turing')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.categories.auditoriumsCount >= 1);
    const aud = res.body.data.categorized.AUDITORIUMS[0];
    assert.ok(aud.subtitle.toLowerCase().includes('turing') || aud.title.toLowerCase().includes('turing'));
    assert.ok(aud.navigationUrl.startsWith('/dean/room-search?room='));
  });

  test('8. Empty searches and unmatched queries are handled safely without 500 error', async () => {
    const emptyRes = await request(app)
      .get('/api/v1/dean/search?q=   ')
      .set('Authorization', `Bearer ${deanToken}`);
    assert.equal(emptyRes.status, 200);
    assert.equal(emptyRes.body.data.totalCount, 0);

    const nonExistentRes = await request(app)
      .get('/api/v1/dean/search?q=XYZNonExistentRecord998877')
      .set('Authorization', `Bearer ${deanToken}`);
    assert.equal(nonExistentRes.status, 200);
    assert.equal(nonExistentRes.body.data.totalCount, 0);
  });

  test('9. Security & Projection: Password hashes are NEVER returned in search results', async () => {
    const res = await request(app)
      .get('/api/v1/dean/search?q=Lovelace')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    if (res.body.data.categorized.FACULTY.length > 0) {
      const fac = res.body.data.categorized.FACULTY[0];
      assert.equal(fac.password, undefined);
      assert.equal(fac.raw.password, undefined);
    }
  });

  test('10. RBAC: Unauthenticated requests to /api/v1/dean/search return 401 Unauthorized', async () => {
    const res = await request(app).get('/api/v1/dean/search?q=Satheesh');
    assert.equal(res.status, 401);
  });

  test('11. Unified endpoint GET /api/v1/search works for authenticated users', async () => {
    const res = await request(app)
      .get('/api/v1/search?q=CS-101')
      .set('Authorization', `Bearer ${deanToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.data.totalCount >= 1);
    assert.ok(res.body.data.categorized.CLASSROOMS.length >= 1);
  });
});
