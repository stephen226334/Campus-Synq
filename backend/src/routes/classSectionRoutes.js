const express = require('express');
const router = express.Router();
const classSectionController = require('../controllers/classSectionController');
const { classSectionCreateValidator, classSectionUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', classSectionController.getClassSections);
router.get('/:id', idParamValidator, validateMiddleware, classSectionController.getClassSectionById);
router.post('/', classSectionCreateValidator, validateMiddleware, classSectionController.createClassSection);
router.put('/:id', idParamValidator, classSectionUpdateValidator, validateMiddleware, classSectionController.updateClassSection);
router.delete('/bulk', classSectionController.bulkDeleteClassSections);
router.delete('/:id', idParamValidator, validateMiddleware, classSectionController.deleteClassSection);

module.exports = router;
