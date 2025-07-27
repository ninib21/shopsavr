const express = require('express');
const AuthController = require('../controllers/authController');
const { validate, schemas } = require('../utils/validation');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// Public routes with auth rate limiting
router.post('/register', authLimiter, validate(schemas.register), AuthController.register);
router.post('/login', authLimiter, validate(schemas.login), AuthController.login);
router.post('/google', authLimiter, validate(schemas.googleAuth), AuthController.googleAuth);
router.post('/refresh', authLimiter, AuthController.refresh);

// Protected routes
router.post('/logout', authMiddleware, AuthController.logout);
router.get('/profile', authMiddleware, AuthController.getProfile);

module.exports = router;