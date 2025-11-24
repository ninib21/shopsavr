const WishlistItem = require('../models/WishlistItem');
const Logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

class ProductController {
  // Search products by barcode or name
  static async searchProducts(req, res) {
    try {
      const { query, barcode, category, limit = 20 } = req.query;

      if (!query && !barcode) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query or barcode is required'
          }
        });
      }

      // Mock product search - in real implementation, this would call external APIs
      const mockResults = [
        {
          name: 'Sample Product',
          barcode: barcode || '123456789012',
          brand: 'Sample Brand',
          category: category || 'electronics',
          description: 'Sample product description',
          imageUrl: 'https://example.com/image.jpg',
          pricing: {
            currentPrice: 99.99,
            currency: 'USD'
          }
        }
      ];

      res.json({
        results: mockResults,
        query: query || barcode,
        totalResults: mockResults.length
      });
    } catch (error) {
      Logger.error('Product search failed', {
        error: error.message,
        query: req.query
      });

      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search products'
        }
      });
    }
  }

  // Get product details by ID
  static async getProduct(req, res) {
    try {
      const { productId } = req.params;

      // Mock product details - in real implementation, this would fetch from database or API
      const mockProduct = {
        id: productId,
        name: 'Sample Product',
        barcode: '123456789012',
        brand: 'Sample Brand',
        category: 'electronics',
        description: 'Detailed product description',
        imageUrl: 'https://example.com/image.jpg',
        pricing: {
          currentPrice: 99.99,
          originalPrice: 129.99,
          currency: 'USD',
          lastUpdated: new Date()
        },
        availability: {
          inStock: true,
          stockLevel: 'high'
        }
      };

      res.json({
        product: mockProduct
      });
    } catch (error) {
      Logger.error('Get product failed', {
        error: error.message,
        productId: req.params.productId
      });

      res.status(500).json({
        error: {
          code: 'GET_PRODUCT_FAILED',
          message: 'Failed to retrieve product'
        }
      });
    }
  }

  // Scan product by barcode
  static async scanProduct(req, res) {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Barcode is required'
          }
        });
      }

      // Validate barcode format (basic validation)
      if (barcode.length < 8 || barcode.length > 14) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid barcode format'
          }
        });
      }

      // Mock product lookup by barcode
      const mockProduct = {
        name: 'Scanned Product',
        barcode,
        brand: 'Scanned Brand',
        category: 'electronics',
        description: 'Product found by barcode scan',
        imageUrl: 'https://example.com/scanned.jpg',
        pricing: {
          currentPrice: 79.99,
          currency: 'USD'
        }
      };

      res.json({
        success: true,
        product: mockProduct
      });
    } catch (error) {
      Logger.error('Product scan failed', {
        error: error.message,
        barcode: req.body.barcode
      });

      res.status(500).json({
        error: {
          code: 'SCAN_FAILED',
          message: 'Failed to scan product'
        }
      });
    }
  }

  // Track product price
  static async trackProduct(req, res) {
    try {
      const userId = req.user.userId;
      const { barcode, targetPrice, priceDropThreshold = 10 } = req.body;

      if (!barcode) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Barcode is required'
          }
        });
      }

      // Validate barcode format
      if (barcode.length < 8 || barcode.length > 14) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid barcode format'
          }
        });
      }

      // Validate target price if provided
      if (targetPrice !== undefined && targetPrice < 0) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Target price cannot be negative'
          }
        });
      }

      // Check if already tracking this product
      const existingItem = await WishlistItem.itemExists(userId, barcode);
      if (existingItem) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_TRACKING',
            message: 'Product is already being tracked',
            existingItemId: existingItem._id
          }
        });
      }

      // Mock product lookup
      const mockProduct = {
        name: 'Tracked Product',
        barcode,
        brand: 'Tracked Brand',
        category: 'electronics',
        description: 'Product being tracked for price changes',
        imageUrl: 'https://example.com/tracked.jpg'
      };

      // Check if product exists (mock check)
      if (barcode === '999999999999') {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      const currentPrice = 89.99;

      // Create tracking item
      const itemData = {
        userId,
        product: mockProduct,
        pricing: {
          originalPrice: currentPrice,
          currentPrice,
          currency: 'USD'
        },
        alerts: {
          priceDropThreshold,
          targetPrice,
          emailAlerts: true,
          pushAlerts: true
        },
        metadata: {
          priority: 'medium',
          source: 'api'
        }
      };

      const item = new WishlistItem(itemData);
      item.tracking.priceHistory.push({
        price: currentPrice,
        date: new Date(),
        source: 'initial'
      });

      await item.save();

      Logger.info('Product tracking started', {
        userId,
        itemId: item._id,
        barcode,
        targetPrice,
        priceDropThreshold
      });

      res.status(201).json({
        message: 'Price tracking started successfully',
        item: {
          id: item._id,
          product: item.product,
          pricing: item.pricing,
          alerts: item.alerts,
          createdAt: item.createdAt
        }
      });
    } catch (error) {
      Logger.error('Product tracking failed', {
        error: error.message,
        userId: req.user?.userId,
        barcode: req.body.barcode
      });

      res.status(500).json({
        error: {
          code: 'TRACKING_FAILED',
          message: 'Failed to start price tracking'
        }
      });
    }
  }

  // Get service statistics
  static async getServiceStats(req, res) {
    try {
      // Mock service statistics
      const stats = {
        totalProducts: 1000000,
        totalScans: 50000,
        totalTracking: 25000,
        averageResponseTime: '150ms',
        uptime: '99.9%'
      };

      res.json({
        service: 'Product Identification Service',
        statistics: stats,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get service stats failed', {
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve service statistics'
        }
      });
    }
  }

  // Clear service cache
  static async clearCache(req, res) {
    try {
      const redis = getRedisClient();
      const pattern = 'products:*';
      
      const keys = await redis.keys(pattern);
      let keysCleared = 0;
      
      if (keys.length > 0) {
        await redis.del(...keys);
        keysCleared = keys.length;
      }

      Logger.info('Product service cache cleared', { keysCleared });

      res.json({
        message: 'Cache cleared successfully',
        keysCleared,
        clearedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Clear cache failed', {
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'CACHE_CLEAR_FAILED',
          message: 'Failed to clear cache'
        }
      });
    }
  }
}

module.exports = ProductController;