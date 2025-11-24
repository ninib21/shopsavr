const Joi = require('joi');

// User registration validation schema
const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    })
});

// User login validation schema
const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Google OAuth validation schema
const googleAuthSchema = Joi.object({
  googleId: Joi.string()
    .required()
    .messages({
      'any.required': 'Google ID is required'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters',
      'any.required': 'Name is required'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow(null, '')
});

// Profile update validation schema
const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(50)
    .optional()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 50 characters'
    }),
  avatar: Joi.string()
    .uri()
    .optional()
    .allow(null, ''),
  settings: Joi.object({
    notifications: Joi.boolean().optional(),
    emailAlerts: Joi.boolean().optional()
  }).optional()
});

// Password change validation schema
const changePasswordSchema = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'any.required': 'Current password is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'New password must be at least 6 characters long',
      'string.max': 'New password cannot exceed 128 characters',
      'string.pattern.base': 'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'New password is required'
    })
});

// Password reset request validation schema
const passwordResetRequestSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
});

// Password reset validation schema
const passwordResetSchema = Joi.object({
  token: Joi.string()
    .required()
    .messages({
      'any.required': 'Reset token is required'
    }),
  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'string.max': 'Password cannot exceed 128 characters',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    })
});

// Validation middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
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
          message: 'Validation failed',
          details: errors
        }
      });
    }

    req.validatedBody = value;
    next();
  };
};

// Coupon search validation schema
const couponSearchSchema = Joi.object({
  domain: Joi.string()
    .domain()
    .required()
    .messages({
      'string.domain': 'Please provide a valid domain',
      'any.required': 'Domain is required'
    })
});

// Coupon validation schema
const couponValidationSchema = Joi.object({
  code: Joi.string()
    .trim()
    .uppercase()
    .required()
    .messages({
      'any.required': 'Coupon code is required'
    }),
  domain: Joi.string()
    .domain()
    .required()
    .messages({
      'string.domain': 'Please provide a valid domain',
      'any.required': 'Domain is required'
    }),
  orderData: Joi.object({
    amount: Joi.number()
      .positive()
      .required()
      .messages({
        'number.positive': 'Order amount must be positive',
        'any.required': 'Order amount is required'
      }),
    categories: Joi.array()
      .items(Joi.string())
      .default([]),
    isNewUser: Joi.boolean().default(false),
    userId: Joi.string().optional()
  }).required()
});

// Best coupon search schema
const bestCouponSchema = Joi.object({
  amount: Joi.number()
    .positive()
    .required()
    .messages({
      'number.positive': 'Order amount must be positive',
      'any.required': 'Order amount is required'
    }),
  categories: Joi.array()
    .items(Joi.string())
    .default([]),
  isNewUser: Joi.boolean().default(false),
  userId: Joi.string().optional()
});

// Validation middleware functions
const validateRegistration = validate(registerSchema);
const validateLogin = validate(loginSchema);
const validateGoogleAuth = validate(googleAuthSchema);
const validateUpdateProfile = validate(updateProfileSchema);
const validateChangePassword = validate(changePasswordSchema);
const validatePasswordResetRequest = validate(passwordResetRequestSchema);
const validatePasswordReset = validate(passwordResetSchema);

// Coupon validation middleware
const validateCouponSearch = (req, res, next) => {
  const { error } = couponSearchSchema.validate({ domain: req.params.domain });
  if (error) {
    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: error.details[0].message
      }
    });
  }
  next();
};

const validateCouponValidation = validate(couponValidationSchema);
const validateBestCoupon = validate(bestCouponSchema);

module.exports = {
  validate,
  validateRegistration,
  validateLogin,
  validateGoogleAuth,
  validateUpdateProfile,
  validateChangePassword,
  validatePasswordResetRequest,
  validatePasswordReset,
  validateCouponSearch,
  validateCouponValidation,
  validateBestCoupon,
  schemas: {
    register: registerSchema,
    login: loginSchema,
    googleAuth: googleAuthSchema,
    updateProfile: updateProfileSchema,
    changePassword: changePasswordSchema,
    passwordResetRequest: passwordResetRequestSchema,
    passwordReset: passwordResetSchema,
    couponSearch: couponSearchSchema,
    couponValidation: couponValidationSchema,
    bestCoupon: bestCouponSchema
  }
};