const express = require('express');
const router = express.Router();
const savingsController = require('../controllers/savingsController');
const authMiddleware = require('../middleware/auth');

// Public routes (no auth required)
router.post('/apply', savingsController.applyCoupon);
router.get('/leaderboard', savingsController.getSavingsLeaderboard);

// Protected routes (require authentication)
router.get('/', authMiddleware, savingsController.getSavingsSummary);
router.get('/summary', authMiddleware, savingsController.getSavingsSummary);
router.get('/history', authMiddleware, savingsController.getUsageHistory);
router.put('/:userId', authMiddleware, savingsController.updateSavings);

module.exports = router;