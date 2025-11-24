const Joi = require('joi');

// Coupon application validation schema
const applyCouponSchema = Joi.object({
  couponCode: Joi.string()
    .required()
    .trim()
    .uppercase()
    .max(50)
    .pattern(/^[A-Z0-9]+$/)
    .messages({
      'string.pattern.base': 'Coupon code can only contain letters and numbers',
      'any.required': 'Coupon code is required'
    }),
  domain: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .messages({
      'string.pattern.base': 'Please provide a valid domain name',
      'any.required': 'Domain is required'
    }),
  orderDetails: Joi.object({
    originalAmount: Joi.number()
      .required()
      .min(0)
      .max(1000000)
      .messages({
        'number.min': 'Original amount cannot be negative',
        'number.max': 'Original amount is too large',
        'any.required': 'Original amount is required'
      }),
    currency: Joi.string()
      .uppercase()
      .length(3)
      .default('USD')
      .optional(),
    categories: Joi.array()
      .items(Joi.string().trim().max(50))
      .default([])
      .optional(),
    isNewUser: Joi.boolean()
      .default(false)
      .optional()
  }).required(),
  metadata: Joi.object({
    userAgent: Joi.string().max(500).optional(),
    ipAddress: Joi.string().ip().optional(),
    sessionId: Joi.string().max(100).optional(),
    platform: Joi.string()
      .valid('web', 'mobile', 'extension')
      .default('web')
      .optional(),
    referrer: Joi.string().uri().optional(),
    deviceInfo: Joi.object().optional()
  }).optional().default({})
});

// Savings summary query validation schema
const savingsSummarySchema = Joi.object({
  dateFrom: Joi.date()
    .optional(),
  dateTo: Joi.date()
    .optional()
    .when('dateFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('dateFrom')).messages({
        'date.greater': 'End date must be after start date'
      })
    }),
  domain: Joi.string()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid domain name'
    })
});

// Usage history query validation schema
const usageHistorySchema = Joi.object({
  domain: Joi.string()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Please provide a valid domain name'
    }),
  status: Joi.string()
    .valid('attempted', 'successful', 'failed', 'expired')
    .optional(),
  dateFrom: Joi.date()
    .optional(),
  dateTo: Joi.date()
    .optional()
    .when('dateFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('dateFrom')).messages({
        'date.greater': 'End date must be after start date'
      })
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(50)
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
});

// Leaderboard query validation schema
const leaderboardSchema = Joi.object({
  period: Joi.string()
    .valid('all', 'week', 'month', 'year')
    .default('all')
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional()
});

// Manual savings update validation schema
const updateSavingsSchema = Joi.object({
  userId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid user ID format',
      'any.required': 'User ID is required'
    }),
  amount: Joi.number()
    .required()
    .positive()
    .max(100000)
    .messages({
      'number.positive': 'Amount must be positive',
      'number.max': 'Amount is too large',
      'any.required': 'Amount is required'
    }),
  operation: Joi.string()
    .valid('add', 'subtract')
    .default('add')
    .optional(),
  reason: Joi.string()
    .trim()
    .max(200)
    .optional()
    .messages({
      'string.max': 'Reason cannot exceed 200 characters'
    })
});

// Validation middleware factory
const validateSavingsRequest = (schema) => {
  return (req, res, next) => {
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
const validateOrderAmount = (amount) => {
  return typeof amount === 'number' && amount >= 0 && amount <= 1000000;
};

const validateCurrency = (currency) => {
  const validCurrencies = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
  return validCurrencies.includes(currency.toUpperCase());
};

const validateDateRange = (dateFrom, dateTo) => {
  if (!dateFrom && !dateTo) return true;
  if (dateFrom && dateTo) {
    return new Date(dateFrom) < new Date(dateTo);
  }
  return true;
};

// Sanitization functions
const sanitizeOrderDetails = (orderDetails) => {
  return {
    originalAmount: parseFloat(orderDetails.originalAmount),
    currency: (orderDetails.currency || 'USD').toUpperCase(),
    categories: Array.isArray(orderDetails.categories) 
      ? orderDetails.categories.map(cat => cat.toLowerCase().trim())
      : [],
    isNewUser: Boolean(orderDetails.isNewUser)
  };
};

const sanitizeMetadata = (metadata) => {
  const sanitized = { ...metadata };
  
  // Remove sensitive information
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.apiKey;
  
  // Limit string lengths
  if (sanitized.userAgent) {
    sanitized.userAgent = sanitized.userAgent.substring(0, 500);
  }
  
  if (sanitized.sessionId) {
    sanitized.sessionId = sanitized.sessionId.substring(0, 100);
  }
  
  return sanitized;
};

module.exports = {
  validateSavingsRequest,
  schemas: {
    applyCoupon: applyCouponSchema,
    savingsSummary: savingsSummarySchema,
    usageHistory: usageHistorySchema,
    leaderboard: leaderboardSchema,
    updateSavings: updateSavingsSchema
  },
  validators: {
    validateOrderAmount,
    validateCurrency,
    validateDateRange
  },
  sanitizers: {
    sanitizeOrderDetails,
    sanitizeMetadata
  }
};