const express = require('express');
const router = express.Router();
const labController = require('../controllers/labController');
const { labCreateValidator, labUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', labController.getLabs);
router.get('/:id', idParamValidator, validateMiddleware, labController.getLabById);
router.post('/', labCreateValidator, validateMiddleware, labController.createLab);
router.put('/:id', idParamValidator, labUpdateValidator, validateMiddleware, labController.updateLab);
router.delete('/bulk', labController.bulkDeleteLabs);
router.delete('/:id', idParamValidator, validateMiddleware, labController.deleteLab);

module.exports = router;
