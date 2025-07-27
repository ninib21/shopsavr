const Joi = require('joi');

// Coupon search validation schema
const couponSearchSchema = Joi.object({
  domain: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .messages({
      'string.pattern.base': 'Please provide a valid domain name',
      'any.required': 'Domain is required'
    }),
  categories: Joi.alternatives().try(
    Joi.array().items(Joi.string().trim().max(50)),
    Joi.string().trim().max(50)
  ).optional(),
  discountType: Joi.string()
    .valid('percentage', 'fixed', 'shipping', 'bogo', 'other')
    .optional(),
  minDiscount: Joi.number()
    .min(0)
    .max(1000)
    .optional(),
  maxDiscount: Joi.number()
    .min(0)
    .max(1000)
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  sortBy: Joi.string()
    .valid('success_rate', 'discount_value', 'recent')
    .default('success_rate')
    .optional()
});

// Coupon validation schema
const couponValidationSchema = Joi.object({
  code: Joi.string()
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
  orderData: Joi.object({
    amount: Joi.number()
      .min(0)
      .max(1000000)
      .default(0)
      .messages({
        'number.min': 'Order amount cannot be negative',
        'number.max': 'Order amount is too large'
      }),
    categories: Joi.array()
      .items(Joi.string().trim().max(50))
      .default([])
      .optional(),
    isNewUser: Joi.boolean()
      .default(false)
      .optional()
  }).optional().default({})
});

// Best coupon search schema
const bestCouponSchema = Joi.object({
  domain: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .messages({
      'string.pattern.base': 'Please provide a valid domain name',
      'any.required': 'Domain is required'
    }),
  amount: Joi.number()
    .required()
    .min(0)
    .max(1000000)
    .messages({
      'number.min': 'Amount cannot be negative',
      'number.max': 'Amount is too large',
      'any.required': 'Amount is required'
    }),
  categories: Joi.array()
    .items(Joi.string().trim().max(50))
    .default([])
    .optional(),
  isNewUser: Joi.boolean()
    .default(false)
    .optional()
});

// Coupon creation schema (for admin/system use)
const couponCreationSchema = Joi.object({
  code: Joi.string()
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
  title: Joi.string()
    .required()
    .trim()
    .max(200)
    .messages({
      'any.required': 'Title is required',
      'string.max': 'Title cannot exceed 200 characters'
    }),
  description: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow(''),
  discountType: Joi.string()
    .required()
    .valid('percentage', 'fixed', 'shipping', 'bogo', 'other')
    .messages({
      'any.required': 'Discount type is required',
      'any.only': 'Invalid discount type'
    }),
  discountValue: Joi.number()
    .when('discountType', {
      is: Joi.valid('percentage', 'fixed'),
      then: Joi.number().required().min(0),
      otherwise: Joi.number().optional()
    })
    .when('discountType', {
      is: 'percentage',
      then: Joi.number().max(100).messages({
        'number.max': 'Percentage discount cannot exceed 100%'
      }),
      otherwise: Joi.number().max(10000)
    }),
  minimumOrder: Joi.number()
    .min(0)
    .max(100000)
    .default(0)
    .optional(),
  maximumDiscount: Joi.number()
    .min(0)
    .max(10000)
    .optional()
    .allow(null),
  expiresAt: Joi.date()
    .required()
    .greater('now')
    .messages({
      'date.greater': 'Expiration date must be in the future',
      'any.required': 'Expiration date is required'
    }),
  categories: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .default([])
    .optional(),
  excludedCategories: Joi.array()
    .items(Joi.string().trim().lowercase().max(50))
    .default([])
    .optional(),
  terms: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow(''),
  userRestrictions: Joi.object({
    newUsersOnly: Joi.boolean().default(false),
    oneTimeUse: Joi.boolean().default(false),
    membershipRequired: Joi.boolean().default(false)
  }).optional().default({}),
  source: Joi.object({
    provider: Joi.string()
      .required()
      .trim()
      .max(100)
      .messages({
        'any.required': 'Source provider is required'
      }),
    sourceId: Joi.string()
      .trim()
      .max(100)
      .optional(),
    confidence: Joi.number()
      .min(0)
      .max(1)
      .default(0.5)
      .optional()
  }).required()
});

// Date range validation schema
const dateRangeSchema = Joi.object({
  dateFrom: Joi.date()
    .optional(),
  dateTo: Joi.date()
    .optional()
    .when('dateFrom', {
      is: Joi.exist(),
      then: Joi.date().greater(Joi.ref('dateFrom')).messages({
        'date.greater': 'End date must be after start date'
      })
    })
});

// Validation middleware factory
const validateCouponRequest = (schema) => {
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
const validateDomain = (domain) => {
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
  return domainRegex.test(domain);
};

const validateCouponCode = (code) => {
  const codeRegex = /^[A-Z0-9]+$/;
  return codeRegex.test(code) && code.length <= 50;
};

const sanitizeDomain = (domain) => {
  return domain.toLowerCase().trim();
};

const sanitizeCouponCode = (code) => {
  return code.toUpperCase().trim();
};

module.exports = {
  validateCouponRequest,
  schemas: {
    couponSearch: couponSearchSchema,
    couponValidation: couponValidationSchema,
    bestCoupon: bestCouponSchema,
    couponCreation: couponCreationSchema,
    dateRange: dateRangeSchema
  },
  validators: {
    validateDomain,
    validateCouponCode
  },
  sanitizers: {
    sanitizeDomain,
    sanitizeCouponCode
  }
};