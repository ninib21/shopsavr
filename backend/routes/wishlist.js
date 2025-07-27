const express = require('express');
const WishlistController = require('../controllers/wishlistController');
const { validateWishlistRequest, schemas } = require('../utils/wishlistValidation');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All wishlist routes require authentication
router.use(authMiddleware);

// Get user's wishlist
router.get('/', 
  validateWishlistRequest(schemas.wishlistQuery),
  WishlistController.getWishlist
);

// Get wishlist statistics
router.get('/stats', 
  WishlistController.getWishlistStats
);

// Get single wishlist item
router.get('/:itemId', 
  validateWishlistRequest(schemas.itemId),
  WishlistController.getItem
);

// Add item to wishlist
router.post('/', 
  validateWishlistRequest(schemas.addItem),
  WishlistController.addItem
);

// Update wishlist item
router.put('/:itemId', 
  validateWishlistRequest(schemas.itemId),
  validateWishlistRequest(schemas.updateItem),
  WishlistController.updateItem
);

// Mark item as purchased
router.post('/:itemId/purchase', 
  validateWishlistRequest(schemas.itemId),
  validateWishlistRequest(schemas.markPurchased),
  WishlistController.markAsPurchased
);

// Remove item from wishlist
router.delete('/:itemId', 
  validateWishlistRequest(schemas.itemId),
  WishlistController.removeItem
);

module.exports = router;