const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');
const {
  idParamValidator,
  facultyCreateValidator,
  facultyUpdateValidator
} = require('../validators/facultyValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', facultyController.getFacultyList);
router.get('/:id', idParamValidator, validateMiddleware, facultyController.getFacultyById);
router.post('/', facultyCreateValidator, validateMiddleware, facultyController.createFaculty);
router.put('/:id', idParamValidator, facultyUpdateValidator, validateMiddleware, facultyController.updateFaculty);
router.delete('/:id', idParamValidator, validateMiddleware, facultyController.deleteFaculty);
router.post('/:id/resend-credentials', idParamValidator, validateMiddleware, facultyController.resendCredentials);
router.get('/:id/timetable', idParamValidator, validateMiddleware, facultyController.getFacultyTimetable);

module.exports = router;
