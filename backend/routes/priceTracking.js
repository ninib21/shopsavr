const express = require('express');
const PriceTrackingController = require('../controllers/priceTrackingController');
const authMiddleware = require('../middleware/auth');
const { requireProFeatures } = require('../middleware/subscription');
const { priceTrackingLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// All price tracking routes require authentication
router.use(authMiddleware);

// Get price tracking service status
router.get('/status', 
  PriceTrackingController.getStatus
);

// Manual price check for specific item
router.post('/check/:itemId', 
  priceTrackingLimiter,
  PriceTrackingController.checkItemPrice
);

// Bulk price check for user's wishlist
router.post('/check-wishlist', 
  priceTrackingLimiter,
  PriceTrackingController.checkUserWishlist
);

// Get user's price alerts
router.get('/alerts', 
  PriceTrackingController.getUserAlerts
);

// Get alert statistics
router.get('/alerts/stats', 
  PriceTrackingController.getAlertStats
);

// Mark alert as read
router.put('/alerts/:alertId/read', 
  PriceTrackingController.markAlertAsRead
);

// Dismiss alert
router.delete('/alerts/:alertId', 
  PriceTrackingController.dismissAlert
);

// Admin routes (require pro features for now - would add proper admin check later)
router.post('/service/control', 
  requireProFeatures,
  PriceTrackingController.controlService
);

router.post('/notifications/process', 
  requireProFeatures,
  PriceTrackingController.processPendingNotifications
);

module.exports = router;