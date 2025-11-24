const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/auth');

// All wishlist routes require authentication
router.use(authMiddleware);

// Wishlist routes
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addItem);
router.get('/stats', wishlistController.getStats);
router.get('/:itemId', wishlistController.getItem);
router.put('/:itemId', wishlistController.updateItem);
router.post('/:itemId/purchase', wishlistController.markAsPurchased);
router.delete('/:itemId', wishlistController.removeItem);

module.exports = router;