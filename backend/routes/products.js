const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authMiddleware = require('../middleware/auth');

// Public product routes
router.get('/search', productController.searchProducts);
router.get('/:productId', productController.getProduct);
router.post('/scan', productController.scanProduct);

// Protected routes (require authentication)
router.post('/track', authMiddleware, productController.trackProduct);
router.get('/service/stats', authMiddleware, productController.getServiceStats);
router.delete('/service/cache', authMiddleware, productController.clearCache);

module.exports = router;