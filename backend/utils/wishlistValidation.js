const Joi = require('joi');

// Product validation schema
const productSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .max(200)
    .messages({
      'any.required': 'Product name is required',
      'string.max': 'Product name cannot exceed 200 characters'
    }),
  brand: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  model: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  barcode: Joi.string()
    .trim()
    .pattern(/^[0-9]{8,14}$/)
    .optional()
    .messages({
      'string.pattern.base': 'Barcode must be 8-14 digits'
    }),
  sku: Joi.string()
    .trim()
    .max(100)
    .optional()
    .allow(''),
  image: Joi.string()
    .uri()
    .optional()
    .allow(''),
  images: Joi.array()
    .items(Joi.string().uri())
    .max(10)
    .optional()
    .default([]),
  category: Joi.string()
    .trim()
    .lowercase()
    .max(50)
    .optional()
    .allow(''),
  subcategory: Joi.string()
    .trim()
    .lowercase()
    .max(50)
    .optional()
    .allow(''),
  description: Joi.string()
    .trim()
    .max(1000)
    .optional()
    .allow(''),
  specifications: Joi.object()
    .pattern(Joi.string(), Joi.string().max(200))
    .optional()
    .default({})
});

// Pricing validation schema
const pricingSchema = Joi.object({
  originalPrice: Joi.number()
    .required()
    .min(0)
    .max(1000000)
    .messages({
      'any.required': 'Original price is required',
      'number.min': 'Price cannot be negative',
      'number.max': 'Price is too large'
    }),
  currentPrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
  currency: Joi.string()
    .uppercase()
    .length(3)
    .default('USD')
    .optional(),
  checkFrequency: Joi.string()
    .valid('hourly', 'daily', 'weekly')
    .default('daily')
    .optional(),
  isTracking: Joi.boolean()
    .default(true)
    .optional()
});

// Source validation schema
const sourceSchema = Joi.object({
  name: Joi.string()
    .required()
    .trim()
    .max(100)
    .messages({
      'any.required': 'Source name is required'
    }),
  url: Joi.string()
    .required()
    .uri()
    .messages({
      'any.required': 'Source URL is required',
      'string.uri': 'Source URL must be valid'
    }),
  domain: Joi.string()
    .required()
    .pattern(/^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/)
    .messages({
      'any.required': 'Source domain is required',
      'string.pattern.base': 'Please provide a valid domain name'
    }),
  price: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
  availability: Joi.string()
    .valid('in_stock', 'out_of_stock', 'limited', 'unknown')
    .default('unknown')
    .optional()
});

// Alerts validation schema
const alertsSchema = Joi.object({
  priceDropThreshold: Joi.number()
    .min(0)
    .max(100)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Price drop threshold cannot be negative',
      'number.max': 'Price drop threshold cannot exceed 100%'
    }),
  targetPrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
  enabled: Joi.boolean()
    .default(true)
    .optional(),
  emailAlerts: Joi.boolean()
    .default(true)
    .optional(),
  pushAlerts: Joi.boolean()
    .default(true)
    .optional()
});

// Metadata validation schema
const metadataSchema = Joi.object({
  addedFrom: Joi.string()
    .valid('manual', 'barcode_scan', 'url_import', 'extension', 'mobile_app')
    .default('manual')
    .optional(),
  platform: Joi.string()
    .valid('web', 'mobile', 'extension')
    .default('web')
    .optional(),
  tags: Joi.array()
    .items(Joi.string().trim().lowercase().max(30))
    .max(10)
    .default([])
    .optional(),
  notes: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow(''),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .default('medium')
    .optional()
});

// Add item validation schema
const addItemSchema = Joi.object({
  product: productSchema.required(),
  pricing: pricingSchema.required(),
  sources: Joi.array()
    .items(sourceSchema)
    .max(10)
    .default([])
    .optional(),
  alerts: alertsSchema.optional().default({}),
  metadata: metadataSchema.optional().default({})
});

// Update item validation schema
const updateItemSchema = Joi.object({
  product: Joi.object({
    name: Joi.string().trim().max(200).optional(),
    brand: Joi.string().trim().max(100).optional().allow(''),
    model: Joi.string().trim().max(100).optional().allow(''),
    image: Joi.string().uri().optional().allow(''),
    images: Joi.array().items(Joi.string().uri()).max(10).optional(),
    category: Joi.string().trim().lowercase().max(50).optional().allow(''),
    subcategory: Joi.string().trim().lowercase().max(50).optional().allow(''),
    description: Joi.string().trim().max(1000).optional().allow('')
  }).optional(),
  alerts: Joi.object({
    priceDropThreshold: Joi.number().min(0).max(100).optional(),
    targetPrice: Joi.number().min(0).max(1000000).optional().allow(null),
    enabled: Joi.boolean().optional(),
    emailAlerts: Joi.boolean().optional(),
    pushAlerts: Joi.boolean().optional()
  }).optional(),
  metadata: Joi.object({
    tags: Joi.array().items(Joi.string().trim().lowercase().max(30)).max(10).optional(),
    notes: Joi.string().trim().max(500).optional().allow(''),
    priority: Joi.string().valid('low', 'medium', 'high').optional()
  }).optional(),
  tracking: Joi.object({
    checkFrequency: Joi.string().valid('hourly', 'daily', 'weekly').optional(),
    isTracking: Joi.boolean().optional()
  }).optional()
});

// Wishlist query validation schema
const wishlistQuerySchema = Joi.object({
  status: Joi.string()
    .valid('active', 'purchased', 'removed', 'unavailable')
    .optional(),
  category: Joi.string()
    .trim()
    .lowercase()
    .max(50)
    .optional(),
  tags: Joi.string()
    .pattern(/^[a-zA-Z0-9,\s]+$/)
    .optional()
    .messages({
      'string.pattern.base': 'Tags must be comma-separated alphanumeric values'
    }),
  priority: Joi.string()
    .valid('low', 'medium', 'high')
    .optional(),
  priceMin: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
  priceMax: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .when('priceMin', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('priceMin')).messages({
        'number.greater': 'Maximum price must be greater than minimum price'
      })
    }),
  sortBy: Joi.string()
    .valid('recent', 'price_low', 'price_high', 'name', 'priority')
    .default('recent')
    .optional(),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(20)
    .optional(),
  page: Joi.number()
    .integer()
    .min(1)
    .default(1)
    .optional()
});

// Mark as purchased validation schema
const markPurchasedSchema = Joi.object({
  purchasePrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional(),
  purchaseDate: Joi.date()
    .max('now')
    .optional()
    .messages({
      'date.max': 'Purchase date cannot be in the future'
    })
});

// Item ID parameter validation
const itemIdSchema = Joi.object({
  itemId: Joi.string()
    .required()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .messages({
      'string.pattern.base': 'Invalid item ID format',
      'any.required': 'Item ID is required'
    })
});

// Validation middleware factory
const validateWishlistRequest = (schema) => {
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
const validateProductName = (name) => {
  return typeof name === 'string' && name.trim().length > 0 && name.length <= 200;
};

const validatePrice = (price) => {
  return typeof price === 'number' && price >= 0 && price <= 1000000;
};

const validateBarcode = (barcode) => {
  if (!barcode) return true; // Optional field
  return /^[0-9]{8,14}$/.test(barcode);
};

const validateURL = (url) => {
  if (!url) return true; // Optional field
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Sanitization functions
const sanitizeProduct = (product) => {
  return {
    ...product,
    name: product.name?.trim(),
    brand: product.brand?.trim(),
    model: product.model?.trim(),
    category: product.category?.toLowerCase().trim(),
    subcategory: product.subcategory?.toLowerCase().trim(),
    description: product.description?.trim()
  };
};

const sanitizeTags = (tags) => {
  if (!Array.isArray(tags)) return [];
  return tags
    .map(tag => tag.toLowerCase().trim())
    .filter(tag => tag.length > 0)
    .slice(0, 10); // Limit to 10 tags
};

const sanitizeMetadata = (metadata) => {
  const sanitized = { ...metadata };
  
  if (sanitized.tags) {
    sanitized.tags = sanitizeTags(sanitized.tags);
  }
  
  if (sanitized.notes) {
    sanitized.notes = sanitized.notes.trim();
  }
  
  return sanitized;
};

module.exports = {
  validateWishlistRequest,
  schemas: {
    addItem: addItemSchema,
    updateItem: updateItemSchema,
    wishlistQuery: wishlistQuerySchema,
    markPurchased: markPurchasedSchema,
    itemId: itemIdSchema
  },
  validators: {
    validateProductName,
    validatePrice,
    validateBarcode,
    validateURL
  },
  sanitizers: {
    sanitizeProduct,
    sanitizeTags,
    sanitizeMetadata
  }
};