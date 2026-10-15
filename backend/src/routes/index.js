const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const semesterRoutes = require('./semesterRoutes');
const subjectRoutes = require('./subjectRoutes');
const classSectionRoutes = require('./classSectionRoutes');
const classroomRoutes = require('./classroomRoutes');
const labRoutes = require('./labRoutes');
const auditoriumRoutes = require('./auditoriumRoutes');
const facultyRoutes = require('./facultyRoutes');
const periodRoutes = require('./periodRoutes');
const timetableRoutes = require('./timetableRoutes');

// Mount routes
router.use('/auth', authRoutes);
router.use('/admin/dashboard', dashboardRoutes);
router.use('/admin/semesters', semesterRoutes);
router.use('/admin/subjects', subjectRoutes);
router.use('/admin/class-sections', classSectionRoutes);
router.use('/admin/classrooms', classroomRoutes);
router.use('/admin/labs', labRoutes);
router.use('/admin/auditoriums', auditoriumRoutes);

// Stage 2 routes
router.use('/admin/faculty', facultyRoutes);
router.use('/admin/periods', periodRoutes);
router.use('/admin/timetable', timetableRoutes);

// Faculty Portal routes (FACULTY & HOD_FACULTY)
const facultyPortalRoutes = require('./facultyPortalRoutes');
router.use('/faculty', facultyPortalRoutes);

// Dean Oversight Portal routes (DEAN role)
const deanRoutes = require('./deanRoutes');
router.use('/dean', deanRoutes);

// Unified Academic Smart Search endpoint (for all authenticated roles)
const deanController = require('../controllers/deanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.get(
  '/search',
  authMiddleware,
  roleMiddleware(['ADMIN', 'DEAN', 'FACULTY', 'HOD_FACULTY']),
  deanController.globalSearch
);

module.exports = router;
