const Joi = require('joi');

// Create subscription validation schema
const createSubscriptionSchema = Joi.object({
  planType: Joi.string()
    .required()
    .valid('pro', 'pro_max')
    .messages({
      'any.required': 'Plan type is required',
      'any.only': 'Plan type must be either "pro" or "pro_max"'
    }),
  paymentMethodId: Joi.string()
    .optional()
    .pattern(/^pm_[a-zA-Z0-9]+$/)
    .messages({
      'string.pattern.base': 'Invalid payment method ID format'
    })
});

// Change plan validation schema
const changePlanSchema = Joi.object({
  newPlanType: Joi.string()
    .required()
    .valid('pro', 'pro_max')
    .messages({
      'any.required': 'New plan type is required',
      'any.only': 'New plan type must be either "pro" or "pro_max"'
    })
});

// Cancel subscription validation schema
const cancelSubscriptionSchema = Joi.object({
  cancelAtPeriodEnd: Joi.boolean()
    .default(true)
    .optional()
    .messages({
      'boolean.base': 'cancelAtPeriodEnd must be a boolean value'
    })
});

// Payment method validation schema
const paymentMethodSchema = Joi.object({
  paymentMethodId: Joi.string()
    .required()
    .pattern(/^pm_[a-zA-Z0-9]+$/)
    .messages({
      'any.required': 'Payment method ID is required',
      'string.pattern.base': 'Invalid payment method ID format'
    })
});

// Webhook validation (for raw body)
const webhookSchema = Joi.object({
  signature: Joi.string()
    .required()
    .messages({
      'any.required': 'Stripe signature is required'
    })
});

// Subscription query parameters validation
const subscriptionQuerySchema = Joi.object({
  includePaymentMethods: Joi.boolean()
    .default(false)
    .optional(),
  includeInvoices: Joi.boolean()
    .default(false)
    .optional()
});

// Validation middleware factory
const validateSubscriptionRequest = (schema) => {
  return (req, res, next) => {
    // For webhook, validate headers instead of body
    if (schema === webhookSchema) {
      const { error } = schema.validate({
        signature: req.headers['stripe-signature']
      });

      if (error) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid webhook signature',
            details: error.details.map(detail => ({
              field: detail.path.join('.'),
              message: detail.message
            }))
          }
        });
      }

      return next();
    }

    // Combine params, query, and body for validation
    const dataToValidate = {
      ...req.params,
      ...req.query,
      ...req.body
    };

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: errors
        }
      });
    }

    // Update request objects with validated data
    Object.assign(req.params, value);
    Object.assign(req.query, value);
    Object.assign(req.body, value);

    next();
  };
};

// Custom validation functions
const validatePlanType = (planType) => {
  const validPlans = ['pro', 'pro_max'];
  return validPlans.includes(planType);
};

const validateStripeId = (id, type) => {
  const patterns = {
    customer: /^cus_[a-zA-Z0-9]+$/,
    subscription: /^sub_[a-zA-Z0-9]+$/,
    paymentMethod: /^pm_[a-zA-Z0-9]+$/,
    paymentIntent: /^pi_[a-zA-Z0-9]+$/,
    setupIntent: /^seti_[a-zA-Z0-9]+$/,
    invoice: /^in_[a-zA-Z0-9]+$/
  };

  return patterns[type] ? patterns[type].test(id) : false;
};

const validateWebhookSignature = (signature) => {
  // Stripe webhook signatures start with 't=' followed by timestamp and 'v1=' followed by signature
  return /^t=\d+,v1=[a-f0-9]+/.test(signature);
};

// Sanitization functions
const sanitizePlanType = (planType) => {
  return planType?.toLowerCase().trim();
};

const sanitizeStripeId = (id) => {
  return id?.trim();
};

// Business logic validation
const validateSubscriptionTransition = (currentTier, newTier) => {
  const tierHierarchy = {
    'free': 0,
    'pro': 1,
    'pro_max': 2
  };

  const currentLevel = tierHierarchy[currentTier] || 0;
  const newLevel = tierHierarchy[newTier] || 0;

  return {
    isValid: true, // Allow all transitions for flexibility
    isUpgrade: newLevel > currentLevel,
    isDowngrade: newLevel < currentLevel,
    isSameTier: newLevel === currentLevel
  };
};

const validateSubscriptionLimits = (user, action) => {
  const limits = {
    free: {
      wishlistItems: 50,
      priceChecksPerDay: 10,
      apiCallsPerMonth: 0
    },
    pro: {
      wishlistItems: 1000,
      priceChecksPerDay: 100,
      apiCallsPerMonth: 1000
    },
    pro_max: {
      wishlistItems: -1, // Unlimited
      priceChecksPerDay: -1, // Unlimited
      apiCallsPerMonth: 10000
    }
  };

  const userLimits = limits[user.subscription.tier] || limits.free;
  
  switch (action) {
    case 'add_wishlist_item':
      return userLimits.wishlistItems === -1 || 
             (user.wishlistItemCount || 0) < userLimits.wishlistItems;
    
    case 'price_check':
      return userLimits.priceChecksPerDay === -1 || 
             (user.dailyPriceChecks || 0) < userLimits.priceChecksPerDay;
    
    case 'api_call':
      return userLimits.apiCallsPerMonth === -1 || 
             (user.monthlyApiCalls || 0) < userLimits.apiCallsPerMonth;
    
    default:
      return true;
  }
};

// Plan comparison helper
const comparePlans = (planA, planB) => {
  const plans = {
    pro: {
      price: 299, // cents
      features: ['unlimited_wishlist', 'advanced_alerts', 'priority_support']
    },
    pro_max: {
      price: 699, // cents
      features: ['unlimited_wishlist', 'advanced_alerts', 'priority_support', '2x_cashback', 'api_access']
    }
  };

  return {
    planA: plans[planA],
    planB: plans[planB],
    priceDifference: (plans[planB]?.price || 0) - (plans[planA]?.price || 0),
    additionalFeatures: plans[planB]?.features.filter(f => !plans[planA]?.features.includes(f)) || []
  };
};

module.exports = {
  validateSubscriptionRequest,
  schemas: {
    createSubscription: createSubscriptionSchema,
    changePlan: changePlanSchema,
    cancelSubscription: cancelSubscriptionSchema,
    paymentMethod: paymentMethodSchema,
    webhook: webhookSchema,
    subscriptionQuery: subscriptionQuerySchema
  },
  validators: {
    validatePlanType,
    validateStripeId,
    validateWebhookSignature,
    validateSubscriptionTransition,
    validateSubscriptionLimits
  },
  sanitizers: {
    sanitizePlanType,
    sanitizeStripeId
  },
  helpers: {
    comparePlans
  }
};