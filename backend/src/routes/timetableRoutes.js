const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');
const {
  idParamValidator,
  timetableCreateValidator,
  timetableUpdateValidator
} = require('../validators/timetableValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', timetableController.getTimetableEntries);
router.get('/today', timetableController.getTodayClasses);
router.get('/:id', idParamValidator, validateMiddleware, timetableController.getTimetableEntryById);
router.post('/', timetableCreateValidator, validateMiddleware, timetableController.createTimetableEntry);
router.put('/:id', idParamValidator, timetableUpdateValidator, validateMiddleware, timetableController.updateTimetableEntry);
router.delete('/bulk', timetableController.bulkDeleteTimetableEntries);
router.delete('/:id', idParamValidator, validateMiddleware, timetableController.deleteTimetableEntry);

module.exports = router;
