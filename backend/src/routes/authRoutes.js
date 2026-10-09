const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { signupValidator, loginValidator } = require('../validators/authValidator');
const validateMiddleware = require('../middleware/validateMiddleware');
const authMiddleware = require('../middleware/authMiddleware');
const { authRateLimiter } = require('../middleware/securityMiddleware');

router.get('/status', authController.getAuthStatus);
router.post('/signup', authRateLimiter, signupValidator, validateMiddleware, authController.signup);
router.post('/login', authRateLimiter, loginValidator, validateMiddleware, authController.login);
router.get('/me', authMiddleware, authController.getCurrentUser);
router.post('/logout', authMiddleware, authController.logout);

module.exports = router;
