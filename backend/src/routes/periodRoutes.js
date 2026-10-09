const express = require('express');
const router = express.Router();
const periodController = require('../controllers/periodController');
const {
  idParamValidator,
  periodCreateValidator,
  periodUpdateValidator
} = require('../validators/periodValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', periodController.getPeriods);
router.get('/:id', idParamValidator, validateMiddleware, periodController.getPeriodById);
router.post('/', periodCreateValidator, validateMiddleware, periodController.createPeriod);
router.put('/:id', idParamValidator, periodUpdateValidator, validateMiddleware, periodController.updatePeriod);
router.delete('/:id', idParamValidator, validateMiddleware, periodController.deletePeriod);

module.exports = router;
