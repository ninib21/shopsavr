const express = require('express');
const SavingsController = require('../controllers/savingsController');
const { validateSavingsRequest, schemas } = require('../utils/savingsValidation');
const authMiddleware = require('../middleware/auth');
const { requireProFeatures } = require('../middleware/subscription');

const router = express.Router();

// Public route for applying coupons (can work without auth for guest users)
router.post('/apply', 
  validateSavingsRequest(schemas.applyCoupon),
  SavingsController.applyCoupon
);

// Protected routes (require authentication)
router.get('/summary', 
  authMiddleware,
  validateSavingsRequest(schemas.savingsSummary),
  SavingsController.getSavingsSummary
);

router.get('/history', 
  authMiddleware,
  validateSavingsRequest(schemas.usageHistory),
  SavingsController.getUsageHistory
);

// Pro feature routes
router.get('/leaderboard', 
  authMiddleware,
  requireProFeatures,
  validateSavingsRequest(schemas.leaderboard),
  SavingsController.getSavingsLeaderboard
);

// Admin routes (require authentication - additional admin check would be added later)
router.put('/update/:userId', 
  authMiddleware,
  validateSavingsRequest(schemas.updateSavings),
  SavingsController.updateSavings
);

module.exports = router;