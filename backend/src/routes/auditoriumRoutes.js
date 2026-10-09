const express = require('express');
const router = express.Router();
const auditoriumController = require('../controllers/auditoriumController');
const { auditoriumCreateValidator, auditoriumUpdateValidator, idParamValidator } = require('../validators/masterDataValidators');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

router.use(authMiddleware);
router.use(roleMiddleware(['ADMIN']));

router.get('/', auditoriumController.getAuditoriums);
router.get('/:id', idParamValidator, validateMiddleware, auditoriumController.getAuditoriumById);
router.post('/', auditoriumCreateValidator, validateMiddleware, auditoriumController.createAuditorium);
router.put('/:id', idParamValidator, auditoriumUpdateValidator, validateMiddleware, auditoriumController.updateAuditorium);
router.delete('/:id', idParamValidator, validateMiddleware, auditoriumController.deleteAuditorium);

module.exports = router;
