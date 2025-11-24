const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// All price tracking routes require authentication
router.use(authMiddleware);

// Price tracking routes (redirect to products/track for now)
router.get('/', (req, res) => {
  res.json({ 
    message: 'Price tracking is available through wishlist items',
    redirectTo: '/api/wishlist'
  });
});

router.post('/track', (req, res) => {
  res.json({ 
    message: 'Use /api/products/track to start tracking a product',
    redirectTo: '/api/products/track'
  });
});

router.delete('/:trackingId', (req, res) => {
  res.json({ 
    message: 'Use /api/wishlist/:itemId to manage tracked items',
    redirectTo: '/api/wishlist'
  });
});

module.exports = router;