const express = require('express');
const router = express.Router();
const classroomController = require('../controllers/classroomController');
const { classroomCreateValidator, classroomUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', classroomController.getClassrooms);
router.get('/:id', idParamValidator, validateMiddleware, classroomController.getClassroomById);
router.post('/', classroomCreateValidator, validateMiddleware, classroomController.createClassroom);
router.put('/:id', idParamValidator, classroomUpdateValidator, validateMiddleware, classroomController.updateClassroom);
router.delete('/bulk', classroomController.bulkDeleteClassrooms);
router.delete('/:id', idParamValidator, validateMiddleware, classroomController.deleteClassroom);

module.exports = router;
