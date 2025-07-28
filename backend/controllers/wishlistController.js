const WishlistItem = require('../models/WishlistItem');
const User = require('../models/User');
const Logger = require('../utils/logger');

class WishlistController {
  // Get user's wishlist
  static async getWishlist(req, res) {
    try {
      const userId = req.user.userId;
      const {
        status = 'active',
        category,
        tags,
        priority,
        minPrice,
        maxPrice,
        priceMin,
        priceMax,
        sortBy = 'createdAt',
        sortOrder = 'desc',
        limit = 50,
        page = 1
      } = req.query;

      // Handle both minPrice/maxPrice and priceMin/priceMax
      const actualMinPrice = minPrice || priceMin;
      const actualMaxPrice = maxPrice || priceMax;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const options = {
        status,
        category,
        tags: tags ? tags.split(',') : undefined,
        priority,
        minPrice: actualMinPrice ? parseFloat(actualMinPrice) : undefined,
        maxPrice: actualMaxPrice ? parseFloat(actualMaxPrice) : undefined,
        sortBy,
        sortOrder,
        limit: parseInt(limit),
        skip
      };

      const items = await WishlistItem.getUserWishlist(userId, options);
      
      // Get total count for pagination
      const totalQuery = { userId };
      if (status !== 'all') {
        totalQuery.status = Array.isArray(status) ? { $in: status } : status;
      }
      if (category) totalQuery['product.category'] = category.toLowerCase();
      if (tags) totalQuery['metadata.tags'] = { $in: tags.split(',').map(t => t.toLowerCase()) };
      if (priority) totalQuery['metadata.priority'] = priority;
      if (actualMinPrice !== undefined || actualMaxPrice !== undefined) {
        totalQuery.$or = [
          {
            'pricing.currentPrice': {
              ...(actualMinPrice !== undefined && { $gte: parseFloat(actualMinPrice) }),
              ...(actualMaxPrice !== undefined && { $lte: parseFloat(actualMaxPrice) })
            }
          },
          {
            'tracking.currentPrice': {
              ...(actualMinPrice !== undefined && { $gte: parseFloat(actualMinPrice) }),
              ...(actualMaxPrice !== undefined && { $lte: parseFloat(actualMaxPrice) })
            }
          }
        ];
      }

      const totalCount = await WishlistItem.countDocuments(totalQuery);

      const formattedItems = items.map(item => ({
        id: item._id,
        product: item.product,
        pricing: {
          originalPrice: item.tracking?.originalPrice || item.pricing?.originalPrice,
          currentPrice: item.tracking?.currentPrice || item.pricing?.currentPrice,
          currency: item.tracking?.currency || item.pricing?.currency || 'USD',
          lastPriceUpdate: item.tracking?.lastPriceUpdate || item.pricing?.lastPriceUpdate,
          savingsAmount: item.savingsAmount,
          savingsPercentage: item.savingsPercentage.toFixed(2),
          hasPriceDropped: item.savingsAmount > 0
        },
        status: item.status,
        alerts: item.alerts,
        tracking: {
          priceHistory: item.tracking?.priceHistory?.slice(-10) || [], // Last 10 entries
          lastChecked: item.tracking?.lastChecked,
          checkFrequency: item.tracking?.checkFrequency,
          isTracking: item.tracking?.isTracking
        },
        sources: item.sources || [],
        metadata: item.metadata,
        purchasePrice: item.purchasePrice,
        purchasedAt: item.purchasedAt,
        savings: item.savings,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt
      }));

      res.json({
        items: formattedItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalCount,
          hasNextPage: parseInt(page) * parseInt(limit) < totalCount,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          status,
          category,
          tags,
          priority,
          minPrice: actualMinPrice,
          maxPrice: actualMaxPrice,
          sortBy,
          sortOrder
        }
      });
    } catch (error) {
      Logger.error('Get wishlist failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'WISHLIST_RETRIEVAL_FAILED',
          message: 'Failed to retrieve wishlist'
        }
      });
    }
  }

  // Add item to wishlist
  static async addItem(req, res) {
    try {
      const userId = req.user.userId;
      const {
        product,
        pricing,
        sources = [],
        alerts = {},
        metadata = {}
      } = req.body;

      if (!product || !product.name || (!product.barcode && !pricing)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Product name and either barcode or pricing information are required'
          }
        });
      }

      // Check if item already exists (only if barcode is provided)
      if (product.barcode) {
        const existingItem = await WishlistItem.itemExists(userId, product.barcode);
        if (existingItem) {
          return res.status(409).json({
            error: {
              code: 'DUPLICATE_ITEM',
              message: 'Item already exists in wishlist',
              existingItemId: existingItem._id
            }
          });
        }
      }

      // Check wishlist limits based on user tier
      const user = await User.findById(userId);
      const wishlistCount = await WishlistItem.countDocuments({
        userId,
        status: { $ne: 'removed' }
      });

      let maxItems = 50; // Free tier limit
      if (user.subscription.tier === 'pro') maxItems = 200;
      if (user.subscription.tier === 'pro_max') maxItems = 1000;

      if (wishlistCount >= maxItems) {
        return res.status(403).json({
          error: {
            code: 'WISHLIST_LIMIT_EXCEEDED',
            message: `Wishlist limit of ${maxItems} items exceeded`,
            limit: maxItems,
            current: wishlistCount,
            upgradeUrl: '/upgrade'
          }
        });
      }

      // Create new wishlist item
      const itemData = {
        userId,
        product: {
          name: product.name,
          barcode: product.barcode,
          brand: product.brand,
          category: product.category,
          description: product.description,
          image: product.image,
          imageUrl: product.imageUrl,
          productUrl: product.productUrl
        },
        sources: sources || [],
        alerts: {
          priceDropThreshold: alerts.priceDropThreshold || 10,
          targetPrice: alerts.targetPrice,
          emailAlerts: alerts.emailAlerts !== false,
          pushAlerts: alerts.pushAlerts !== false
        },
        metadata: {
          priority: metadata.priority || 'medium',
          tags: metadata.tags || [],
          notes: metadata.notes,
          source: metadata.source || 'manual'
        }
      };

      // Add pricing/tracking data
      if (pricing) {
        const currentPrice = pricing.currentPrice || pricing.originalPrice;
        itemData.pricing = {
          originalPrice: pricing.originalPrice,
          currentPrice: currentPrice,
          currency: pricing.currency || 'USD'
        };
        itemData.tracking = {
          originalPrice: pricing.originalPrice,
          currentPrice: currentPrice,
          currency: pricing.currency || 'USD',
          isTracking: true
        };
      }

      const item = new WishlistItem(itemData);
      
      // Add initial price to history if pricing exists
      if (pricing && item.tracking) {
        if (!item.tracking.priceHistory) item.tracking.priceHistory = [];
        item.tracking.priceHistory.push({
          price: pricing.currentPrice,
          date: new Date(),
          source: 'initial'
        });
      }

      await item.save();

      Logger.info('Item added to wishlist', {
        userId,
        itemId: item._id,
        productName: product.name,
        barcode: product.barcode
      });

      res.status(201).json({
        message: 'Item added to wishlist successfully',
        item: {
          id: item._id,
          product: item.product,
          pricing: {
            originalPrice: item.tracking?.originalPrice || item.pricing?.originalPrice,
            currentPrice: item.tracking?.currentPrice || item.pricing?.currentPrice,
            currency: item.tracking?.currency || item.pricing?.currency || 'USD',
            savingsAmount: item.savingsAmount,
            savingsPercentage: item.savingsPercentage.toFixed(2)
          },
          sources: item.sources || [],
          status: item.status,
          alerts: item.alerts,
          metadata: item.metadata,
          createdAt: item.createdAt
        }
      });
    } catch (error) {
      Logger.error('Add wishlist item failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'ADD_ITEM_FAILED',
          message: 'Failed to add item to wishlist'
        }
      });
    }
  }

  // Get specific item details
  static async getItem(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;

      if (!itemId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid item ID format'
          }
        });
      }

      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: { $ne: 'removed' }
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in wishlist'
          }
        });
      }

      res.json({
        item: {
          id: item._id,
          product: item.product,
          pricing: {
            originalPrice: item.tracking?.originalPrice || item.pricing?.originalPrice,
            currentPrice: item.tracking?.currentPrice || item.pricing?.currentPrice,
            currency: item.tracking?.currency || item.pricing?.currency || 'USD',
            savingsAmount: item.savingsAmount,
            savingsPercentage: item.savingsPercentage.toFixed(2)
          },
          sources: item.sources || [],
          status: item.status,
          alerts: item.alerts,
          tracking: {
            priceHistory: item.tracking?.priceHistory || [],
            lastChecked: item.tracking?.lastChecked,
            checkFrequency: item.tracking?.checkFrequency,
            isTracking: item.tracking?.isTracking
          },
          metadata: item.metadata,
          purchasePrice: item.purchasePrice,
          purchasedAt: item.purchasedAt,
          savings: item.savings,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        }
      });
    } catch (error) {
      Logger.error('Get wishlist item failed', {
        error: error.message,
        userId: req.user.userId,
        itemId: req.params.itemId
      });

      res.status(500).json({
        error: {
          code: 'GET_ITEM_FAILED',
          message: 'Failed to retrieve item'
        }
      });
    }
  }

  // Update wishlist item
  static async updateItem(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;
      const updates = req.body;

      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: { $ne: 'removed' }
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in wishlist'
          }
        });
      }

      // Update allowed fields
      if (updates.product) {
        Object.assign(item.product, updates.product);
      }
      if (updates.alerts) {
        Object.assign(item.alerts, updates.alerts);
      }
      if (updates.metadata) {
        Object.assign(item.metadata, updates.metadata);
      }
      if (updates.tracking) {
        if (!item.tracking) item.tracking = {};
        Object.assign(item.tracking, updates.tracking);
      }

      await item.save();

      Logger.info('Wishlist item updated', {
        userId,
        itemId,
        updates: Object.keys(updates)
      });

      res.json({
        message: 'Item updated successfully',
        item: {
          id: item._id,
          product: item.product,
          pricing: {
            originalPrice: item.tracking?.originalPrice || item.pricing?.originalPrice,
            currentPrice: item.tracking?.currentPrice || item.pricing?.currentPrice,
            currency: item.tracking?.currency || item.pricing?.currency || 'USD',
            savingsAmount: item.savingsAmount,
            savingsPercentage: item.savingsPercentage.toFixed(2)
          },
          status: item.status,
          alerts: item.alerts,
          tracking: {
            priceHistory: item.tracking?.priceHistory || [],
            lastChecked: item.tracking?.lastChecked,
            checkFrequency: item.tracking?.checkFrequency,
            isTracking: item.tracking?.isTracking
          },
          metadata: item.metadata,
          updatedAt: item.updatedAt
        }
      });
    } catch (error) {
      Logger.error('Update wishlist item failed', {
        error: error.message,
        userId: req.user.userId,
        itemId: req.params.itemId
      });

      res.status(500).json({
        error: {
          code: 'UPDATE_ITEM_FAILED',
          message: 'Failed to update item'
        }
      });
    }
  }

  // Mark item as purchased
  static async markAsPurchased(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;
      const { purchasePrice } = req.body;

      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: 'active'
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Active item not found in wishlist'
          }
        });
      }

      await item.markAsPurchased(purchasePrice);

      Logger.info('Item marked as purchased', {
        userId,
        itemId,
        purchasePrice: item.purchasePrice,
        savings: item.savings
      });

      res.json({
        message: 'Item marked as purchased successfully',
        item: {
          id: item._id,
          status: item.status,
          purchasePrice: item.purchasePrice,
          purchasedAt: item.purchasedAt,
          savings: item.savings
        }
      });
    } catch (error) {
      Logger.error('Mark as purchased failed', {
        error: error.message,
        userId: req.user.userId,
        itemId: req.params.itemId
      });

      res.status(500).json({
        error: {
          code: 'PURCHASE_MARK_FAILED',
          message: 'Failed to mark item as purchased'
        }
      });
    }
  }

  // Remove item from wishlist
  static async removeItem(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;

      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: { $ne: 'removed' }
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Item not found in wishlist'
          }
        });
      }

      await item.remove();

      Logger.info('Item removed from wishlist', {
        userId,
        itemId,
        productName: item.product.name
      });

      res.json({
        message: 'Item removed from wishlist successfully',
        itemId: item._id.toString()
      });
    } catch (error) {
      Logger.error('Remove wishlist item failed', {
        error: error.message,
        userId: req.user.userId,
        itemId: req.params.itemId
      });

      res.status(500).json({
        error: {
          code: 'REMOVE_ITEM_FAILED',
          message: 'Failed to remove item from wishlist'
        }
      });
    }
  }

  // Get wishlist statistics
  static async getStats(req, res) {
    try {
      const userId = req.user.userId;
      const { dateFrom, dateTo } = req.query;

      const stats = await WishlistItem.getWishlistStats(userId, {
        dateFrom,
        dateTo
      });

      const summary = stats[0] || {
        totalItems: 0,
        totalValue: 0,
        totalSavings: 0,
        breakdown: []
      };

      // Format breakdown by status
      const breakdown = {};
      summary.breakdown.forEach(item => {
        breakdown[item.status] = {
          count: item.count,
          totalValue: item.totalValue,
          totalSavings: item.totalSavings
        };
      });

      res.json({
        summary: {
          totalItems: summary.totalItems,
          totalValue: summary.totalValue,
          totalSavings: summary.totalSavings
        },
        breakdown,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get wishlist stats failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'STATS_RETRIEVAL_FAILED',
          message: 'Failed to retrieve wishlist statistics'
        }
      });
    }
  }
}

module.exports = WishlistController;