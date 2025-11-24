const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authMiddleware = require('../middleware/auth');
const { validateCouponSearch, validateCouponValidation, validateBestCoupon } = require('../utils/validation');

// Public routes
router.get('/search/:domain', validateCouponSearch, couponController.searchCoupons);
router.post('/validate', validateCouponValidation, couponController.validateCoupon);
router.post('/best/:domain', validateBestCoupon, couponController.findBestCoupon);

// Protected routes (require authentication)
router.get('/stats/:couponId', authMiddleware, couponController.getCouponStats);
router.get('/domain-stats/:domain', authMiddleware, couponController.getDomainStats);
router.delete('/cache/:domain', authMiddleware, couponController.clearCache);

// Admin routes (require admin privileges)
router.post('/admin/create', authMiddleware, couponController.createCoupon);
router.put('/admin/:couponId', authMiddleware, couponController.updateCoupon);
router.delete('/admin/:couponId', authMiddleware, couponController.deleteCoupon);
router.post('/admin/bulk-import', authMiddleware, couponController.bulkImport);

module.exports = router;