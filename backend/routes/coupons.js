const express = require('express');
const CouponController = require('../controllers/couponController');
const { validateCouponRequest, schemas } = require('../utils/couponValidation');
const authMiddleware = require('../middleware/auth');
const { couponSearchLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// Public routes (with rate limiting)
router.get('/search/:domain', 
  couponSearchLimiter,
  validateCouponRequest(schemas.couponSearch),
  CouponController.searchCoupons
);

router.post('/validate', 
  couponSearchLimiter,
  validateCouponRequest(schemas.couponValidation),
  CouponController.validateCoupon
);

router.post('/best/:domain', 
  couponSearchLimiter,
  validateCouponRequest(schemas.bestCoupon),
  CouponController.getBestCoupon
);

// Protected routes (require authentication)
router.get('/stats/:couponId', 
  authMiddleware,
  validateCouponRequest(schemas.dateRange),
  CouponController.getCouponStats
);

router.get('/domain-stats/:domain', 
  authMiddleware,
  CouponController.getDomainStats
);

// Admin routes (require authentication - additional admin check would be added later)
router.delete('/cache/:domain', 
  authMiddleware,
  CouponController.clearCache
);

module.exports = router;