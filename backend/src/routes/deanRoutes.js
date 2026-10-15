const express = require('express');
const router = express.Router();
const deanController = require('../controllers/deanController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Protect all Dean routes with Authentication & DEAN Role RBAC
router.use(authMiddleware);
router.use(roleMiddleware(['DEAN']));

// Dean Dashboard Overview & Live Academic Schedule
router.get('/dashboard', deanController.getDeanDashboard);

// Dedicated Live Academic Status Endpoints
router.get('/live-status', deanController.getLiveStatus);
router.get('/live-classes', deanController.getLiveClasses);
router.get('/venues-status', deanController.getVenuesStatus);
router.get('/faculty-status', deanController.getFacultyStatus);

// Five Dedicated Search Modes & Quick Search
router.get('/quick-search', deanController.getQuickSearchSuggestions);
router.get('/class-wise', deanController.getClassWiseSearch);
router.get('/room-wise', deanController.getRoomWiseSearch);
router.get('/faculty-wise', deanController.getFacultyWiseSearch);
router.get('/free-rooms', deanController.getFreeRoomsSearch);
router.get('/current-status', deanController.getCurrentStatusSearch);

// Global Multi-Entity Search
router.get('/search', deanController.globalSearch);

// Faculty Oversight & Inspection
router.get('/faculty', deanController.getFacultyList);
router.get('/faculty/:id', deanController.getFacultyDetails);

// Subjects Oversight
router.get('/subjects', deanController.getSubjectList);
router.get('/subjects/:id', deanController.getSubjectDetails);

// Classrooms Oversight
router.get('/classrooms', deanController.getClassroomList);
router.get('/classrooms/:id', deanController.getClassroomDetails);

// Labs Oversight
router.get('/labs', deanController.getLabList);
router.get('/labs/:id', deanController.getLabDetails);

// Auditoriums Oversight
router.get('/auditoriums', deanController.getAuditoriumList);
router.get('/auditoriums/:id', deanController.getAuditoriumDetails);

// Semesters Oversight
router.get('/semesters', deanController.getSemesterList);
router.get('/semesters/:id', deanController.getSemesterDetails);

// Sections Oversight
router.get('/sections', deanController.getSectionList);
router.get('/sections/:id', deanController.getSectionDetails);

// Master Timetable Oversight
router.get('/timetable', deanController.getMasterTimetable);

// Substitution Center
router.get('/substitutions', deanController.getSubstitutions);
router.get('/substitutions/:id', deanController.getSubstitutionById);
router.get('/available-substitutes', deanController.getAvailableSubstitutes);
router.put('/substitutions/:id', deanController.modifySubstitution);

// Real-time Event Stream (SSE)
router.get('/events', deanController.streamEvents);

module.exports = router;
