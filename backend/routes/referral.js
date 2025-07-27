const express = require('express');
const ReferralController = require('../controllers/referralController');
const authMiddleware = require('../middleware/auth');
const subscriptionMiddleware = require('../middleware/subscription');
const Joi = require('joi');

const router = express.Router();

// Validation schemas
const claimReferralSchema = Joi.object({
  referralCode: Joi.string()
    .required()
    .trim()
    .min(3)
    .max(20)
    .pattern(/^[a-zA-Z0-9_-]+$/)
    .messages({
      'string.pattern.base': 'Referral code can only contain letters, numbers, hyphens, and underscores',
      'string.min': 'Referral code must be at least 3 characters long',
      'string.max': 'Referral code cannot exceed 20 characters',
      'any.required': 'Referral code is required'
    }),
  source: Joi.string()
    .valid('direct_link', 'social_share', 'email', 'sms', 'other')
    .optional()
    .default('direct_link')
});

const processSubscriptionSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    })
});

const statsQuerySchema = Joi.object({
  dateFrom: Joi.date()
    .iso()
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)'
    }),
  dateTo: Joi.date()
    .iso()
    .min(Joi.ref('dateFrom'))
    .optional()
    .messages({
      'date.format': 'Date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'End date must be after start date'
    })
});

const leaderboardQuerySchema = Joi.object({
  period: Joi.string()
    .valid('all', 'week', 'month', 'year')
    .optional()
    .default('all'),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .optional()
    .default(10)
});

// Validation middleware
const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const data = source === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        }
      });
    }

    if (source === 'query') {
      req.validatedQuery = value;
    } else {
      req.validatedBody = value;
    }
    next();
  };
};

// Public routes (no authentication required)
router.get('/validate/:code', ReferralController.validateReferralCode);
router.get('/leaderboard', 
  validate(leaderboardQuerySchema, 'query'),
  ReferralController.getLeaderboard
);

// Protected routes (require authentication)
router.use(authMiddleware);

// User referral management
router.get('/code', ReferralController.getReferralCode);
router.post('/claim', 
  validate(claimReferralSchema),
  ReferralController.claimReferral
);
router.get('/stats', 
  validate(statsQuerySchema, 'query'),
  ReferralController.getReferralStats
);

// Internal/webhook routes (require authentication but not subscription)
router.post('/process-subscription', 
  validate(processSubscriptionSchema),
  ReferralController.processSubscriptionCompletion
);

// Admin routes (require Pro Max subscription for analytics)
router.get('/analytics', 
  subscriptionMiddleware.requireProMaxFeatures,
  validate(statsQuerySchema, 'query'),
  ReferralController.getAnalytics
);

module.exports = router;