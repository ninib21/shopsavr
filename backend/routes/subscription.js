const express = require('express');
const SubscriptionController = require('../controllers/subscriptionController');
const { validateSubscriptionRequest, schemas } = require('../utils/subscriptionValidation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/plans', 
  SubscriptionController.getPlans
);

// Webhook endpoint (must be before auth middleware)
router.post('/webhook', 
  express.raw({ type: 'application/json' }), // Raw body for webhook signature verification
  validateSubscriptionRequest(schemas.webhook),
  SubscriptionController.handleWebhook
);

// All other routes require authentication
router.use(authMiddleware);

// Get current subscription
router.get('/current', 
  validateSubscriptionRequest(schemas.subscriptionQuery),
  SubscriptionController.getCurrentSubscription
);

// Create new subscription (upgrade)
router.post('/create', 
  validateSubscriptionRequest(schemas.createSubscription),
  SubscriptionController.createSubscription
);

// Change subscription plan
router.put('/change-plan', 
  validateSubscriptionRequest(schemas.changePlan),
  SubscriptionController.changePlan
);

// Cancel subscription
router.post('/cancel', 
  validateSubscriptionRequest(schemas.cancelSubscription),
  SubscriptionController.cancelSubscription
);

// Reactivate cancelled subscription
router.post('/reactivate', 
  SubscriptionController.reactivateSubscription
);

// Payment methods management
router.get('/payment-methods', 
  SubscriptionController.getPaymentMethods
);

router.post('/setup-intent', 
  SubscriptionController.createSetupIntent
);

module.exports = router;