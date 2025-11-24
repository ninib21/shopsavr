const Joi = require('joi');

// Barcode scan validation schema
const barcodeScanSchema = Joi.object({
  barcode: Joi.string()
    .required()
    .pattern(/^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/)
    .messages({
      'string.pattern.base': 'Barcode must be 8, 12, or 13 digits',
      'any.required': 'Barcode is required'
    })
});

// Product search validation schema
const productSearchSchema = Joi.object({
  query: Joi.string()
    .required()
    .trim()
    .min(2)
    .max(100)
    .messages({
      'string.min': 'Search query must be at least 2 characters long',
      'string.max': 'Search query cannot exceed 100 characters',
      'any.required': 'Search query is required'
    }),
  category: Joi.string()
    .trim()
    .max(50)
    .optional(),
  minPrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Minimum price cannot be negative',
      'number.max': 'Minimum price is too large'
    }),
  maxPrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .when('minPrice', {
      is: Joi.exist(),
      then: Joi.number().greater(Joi.ref('minPrice')).messages({
        'number.greater': 'Maximum price must be greater than minimum price'
      })
    })
    .messages({
      'number.min': 'Maximum price cannot be negative',
      'number.max': 'Maximum price is too large'
    }),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(50)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 50'
    })
});

// Price tracking setup validation schema
const priceTrackingSchema = Joi.object({
  barcode: Joi.string()
    .required()
    .pattern(/^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/)
    .messages({
      'string.pattern.base': 'Barcode must be 8, 12, or 13 digits',
      'any.required': 'Barcode is required'
    }),
  targetPrice: Joi.number()
    .min(0)
    .max(1000000)
    .optional()
    .messages({
      'number.min': 'Target price cannot be negative',
      'number.max': 'Target price is too large'
    }),
  priceDropThreshold: Joi.number()
    .min(0)
    .max(100)
    .default(10)
    .optional()
    .messages({
      'number.min': 'Price drop threshold cannot be negative',
      'number.max': 'Price drop threshold cannot exceed 100%'
    })
});

// Product ID parameter validation (for price comparison)
const productIdSchema = Joi.object({
  productId: Joi.alternatives()
    .try(
      // MongoDB ObjectId
      Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
      // Barcode
      Joi.string().pattern(/^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/)
    )
    .required()
    .messages({
      'alternatives.match': 'Product ID must be a valid MongoDB ObjectId or barcode',
      'any.required': 'Product ID is required'
    })
});

// Image identification validation schema (future use)
const imageIdentificationSchema = Joi.object({
  imageUrl: Joi.string()
    .uri()
    .required()
    .messages({
      'string.uri': 'Image URL must be a valid URL',
      'any.required': 'Image URL is required'
    }),
  imageData: Joi.string()
    .base64()
    .optional()
    .messages({
      'string.base64': 'Image data must be valid base64'
    })
}).xor('imageUrl', 'imageData')
  .messages({
    'object.xor': 'Either imageUrl or imageData must be provided, but not both'
  });

// Validation middleware factory
const validateProductRequest = (schema) => {
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
const validateBarcode = (barcode) => {
  if (!barcode) return false;
  return /^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/.test(barcode);
};

const validatePrice = (price) => {
  return typeof price === 'number' && price >= 0 && price <= 1000000;
};

const validateSearchQuery = (query) => {
  return typeof query === 'string' && 
         query.trim().length >= 2 && 
         query.trim().length <= 100;
};

const validateImageUrl = (url) => {
  if (!url) return false;
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Sanitization functions
const sanitizeSearchQuery = (query) => {
  return query
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 100); // Limit length
};

const sanitizeBarcode = (barcode) => {
  return barcode.replace(/\D/g, ''); // Remove non-digits
};

const sanitizePrice = (price) => {
  const num = parseFloat(price);
  return isNaN(num) ? 0 : Math.max(0, Math.min(1000000, num));
};

// Category validation and normalization
const validateCategory = (category) => {
  const validCategories = [
    'electronics',
    'clothing',
    'food & beverages',
    'home & garden',
    'books',
    'toys',
    'sports',
    'automotive',
    'health',
    'beauty',
    'jewelry',
    'music',
    'movies',
    'games',
    'office',
    'pet supplies',
    'baby',
    'tools',
    'industrial',
    'other'
  ];
  
  if (!category) return true;
  return validCategories.includes(category.toLowerCase());
};

const normalizeCategory = (category) => {
  if (!category) return null;
  return category.toLowerCase().trim();
};

// Product data validation helpers
const validateProductData = (product) => {
  const errors = [];
  
  if (!product.name || product.name.trim().length === 0) {
    errors.push('Product name is required');
  }
  
  if (product.name && product.name.length > 200) {
    errors.push('Product name cannot exceed 200 characters');
  }
  
  if (product.barcode && !validateBarcode(product.barcode)) {
    errors.push('Invalid barcode format');
  }
  
  if (product.images && Array.isArray(product.images)) {
    product.images.forEach((img, index) => {
      if (!validateImageUrl(img)) {
        errors.push(`Invalid image URL at index ${index}`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Price data validation helpers
const validatePriceData = (pricing) => {
  const errors = [];
  
  if (!pricing.sources || !Array.isArray(pricing.sources)) {
    errors.push('Price sources must be an array');
    return { isValid: false, errors };
  }
  
  pricing.sources.forEach((source, index) => {
    if (!source.source || source.source.trim().length === 0) {
      errors.push(`Source name is required at index ${index}`);
    }
    
    if (!source.domain || source.domain.trim().length === 0) {
      errors.push(`Source domain is required at index ${index}`);
    }
    
    if (typeof source.price !== 'number' || source.price < 0) {
      errors.push(`Valid price is required at index ${index}`);
    }
    
    if (source.url && !validateImageUrl(source.url)) {
      errors.push(`Invalid URL at index ${index}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateProductRequest,
  schemas: {
    barcodeScan: barcodeScanSchema,
    productSearch: productSearchSchema,
    priceTracking: priceTrackingSchema,
    productId: productIdSchema,
    imageIdentification: imageIdentificationSchema
  },
  validators: {
    validateBarcode,
    validatePrice,
    validateSearchQuery,
    validateImageUrl,
    validateCategory,
    validateProductData,
    validatePriceData
  },
  sanitizers: {
    sanitizeSearchQuery,
    sanitizeBarcode,
    sanitizePrice,
    normalizeCategory
  }
};