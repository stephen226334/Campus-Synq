const express = require('express');
const router = express.Router();
const facultyPortalController = require('../controllers/facultyPortalController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protect all Faculty routes with Authentication & Faculty Role RBAC
router.use(authMiddleware);
router.use(roleMiddleware(['FACULTY', 'HOD_FACULTY']));

// Faculty Dashboard Summary
router.get('/dashboard', facultyPortalController.getFacultyDashboard);

// Personal Today's Timetable
router.get('/timetable/today', facultyPortalController.getTodaySchedule);

// Personal Weekly Timetable
router.get('/timetable/weekly', facultyPortalController.getWeeklySchedule);

// Available Substitute Faculty query
router.get('/available-substitutes', facultyPortalController.getAvailableSubstitutes);

// Substitution management
router.get('/substitutions', facultyPortalController.getFacultySubstitutions);
router.post('/substitution', facultyPortalController.createSubstitution);

// Real-time Event Stream (SSE)
router.get('/events', facultyPortalController.streamEvents);

module.exports = router;
