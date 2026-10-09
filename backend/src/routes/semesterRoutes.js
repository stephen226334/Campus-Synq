const express = require('express');
const router = express.Router();
const semesterController = require('../controllers/semesterController');
const { semesterCreateValidator, semesterUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', semesterController.getSemesters);
router.get('/:id', idParamValidator, validateMiddleware, semesterController.getSemesterById);
router.post('/', semesterCreateValidator, validateMiddleware, semesterController.createSemester);
router.put('/:id', idParamValidator, semesterUpdateValidator, validateMiddleware, semesterController.updateSemester);
router.delete('/:id', idParamValidator, validateMiddleware, semesterController.deleteSemester);

module.exports = router;
