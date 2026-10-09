const express = require('express');
const router = express.Router();
const subjectController = require('../controllers/subjectController');
const { subjectCreateValidator, subjectUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', subjectController.getSubjects);
router.get('/:id', idParamValidator, validateMiddleware, subjectController.getSubjectById);
router.post('/', subjectCreateValidator, validateMiddleware, subjectController.createSubject);
router.put('/:id', idParamValidator, subjectUpdateValidator, validateMiddleware, subjectController.updateSubject);
router.delete('/:id', idParamValidator, validateMiddleware, subjectController.deleteSubject);

module.exports = router;
