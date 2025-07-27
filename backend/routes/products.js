const express = require('express');
const ProductController = require('../controllers/productController');
const { validateProductRequest, schemas } = require('../utils/productValidation');
const authMiddleware = require('../middleware/auth');
const { priceTrackingLimiter } = require('../middleware/rateLimiting');

const router = express.Router();

// Public routes (no authentication required)
router.post('/scan', 
  priceTrackingLimiter,
  validateProductRequest(schemas.barcodeScan),
  ProductController.scanBarcode
);

router.get('/search', 
  priceTrackingLimiter,
  validateProductRequest(schemas.productSearch),
  ProductController.searchProducts
);

router.get('/compare/:productId', 
  priceTrackingLimiter,
  validateProductRequest(schemas.productId),
  ProductController.getPriceComparison
);

// Protected routes (require authentication)
router.post('/track', 
  authMiddleware,
  priceTrackingLimiter,
  validateProductRequest(schemas.priceTracking),
  ProductController.trackPrice
);

// Admin/service routes
router.get('/service/stats', 
  authMiddleware,
  ProductController.getServiceStats
);

router.delete('/service/cache', 
  authMiddleware,
  ProductController.clearCache
);

module.exports = router;