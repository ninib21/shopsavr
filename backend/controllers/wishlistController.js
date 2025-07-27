const WishlistItem = require('../models/WishlistItem');
const PriceAlert = require('../models/PriceAlert');
const User = require('../models/User');
const Logger = require('../utils/logger');

class WishlistController {
  // Get user's wishlist
  static async getWishlist(req, res) {
    try {
      const userId = req.user.userId;
      const {
        status,
        category,
        tags,
        priority,
        priceMin,
        priceMax,
        sortBy = 'recent',
        limit = 20,
        page = 1
      } = req.query;

      // Build filter options
      const options = {
        status,
        category,
        tags: tags ? tags.split(',') : undefined,
        priority,
        priceRange: (priceMin || priceMax) ? {
          min: priceMin ? parseFloat(priceMin) : undefined,
          max: priceMax ? parseFloat(priceMax) : undefined
        } : undefined,
        sortBy,
        limit: Math.min(parseInt(limit) || 20, 100),
        skip: (parseInt(page) - 1) * (parseInt(limit) || 20)
      };

      // Get wishlist items
      const items = await WishlistItem.getUserWishlist(userId, options);

      // Get total count for pagination
      const totalQuery = { userId };
      if (status) totalQuery.status = status;
      else totalQuery.status = { $ne: 'removed' };
      if (category) totalQuery['product.category'] = category.toLowerCase();
      if (priority) totalQuery['metadata.priority'] = priority;

      const totalCount = await WishlistItem.countDocuments(totalQuery);

      // Format response
      const formattedItems = items.map(item => ({
        id: item._id,
        product: {
          name: item.product.name,
          brand: item.product.brand,
          model: item.product.model,
          image: item.product.image,
          images: item.product.images,
          category: item.product.category,
          subcategory: item.product.subcategory,
          description: item.product.description
        },
        pricing: {
          originalPrice: item.tracking.originalPrice,
          currentPrice: item.tracking.currentPrice,
          lowestPrice: item.tracking.lowestPrice,
          highestPrice: item.tracking.highestPrice,
          currency: item.tracking.currency,
          priceChangePercentage: item.priceChangePercentage,
          savingsAmount: item.savingsAmount,
          hasPriceDropped: item.hasPriceDropped
        },
        alerts: {
          enabled: item.alerts.enabled,
          priceDropThreshold: item.alerts.priceDropThreshold,
          targetPrice: item.alerts.targetPrice,
          isTargetPriceMet: item.isTargetPriceMet,
          isPriceDropThresholdMet: item.isPriceDropThresholdMet
        },
        sources: item.sources.filter(s => s.isActive).map(source => ({
          name: source.name,
          domain: source.domain,
          price: source.price,
          availability: source.availability,
          lastChecked: source.lastChecked
        })),
        metadata: {
          priority: item.metadata.priority,
          tags: item.metadata.tags,
          notes: item.metadata.notes,
          addedFrom: item.metadata.addedFrom
        },
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        purchasedAt: item.purchasedAt,
        purchasePrice: item.purchasePrice
      }));

      res.json({
        items: formattedItems,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / options.limit),
          totalCount,
          hasNextPage: parseInt(page) * options.limit < totalCount,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          status,
          category,
          tags: tags ? tags.split(',') : [],
          priority,
          priceRange: options.priceRange,
          sortBy
        }
      });
    } catch (error) {
      Logger.error('Get wishlist failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'WISHLIST_FETCH_FAILED',
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

      // Check user's subscription tier for item limits
      const user = await User.findById(userId);
      const itemLimit = user.hasProFeatures() ? 1000 : 50; // Free tier limit

      const currentItemCount = await WishlistItem.countDocuments({
        userId,
        status: { $ne: 'removed' }
      });

      if (currentItemCount >= itemLimit) {
        return res.status(403).json({
          error: {
            code: 'WISHLIST_LIMIT_EXCEEDED',
            message: `Wishlist limit of ${itemLimit} items exceeded`,
            currentCount: currentItemCount,
            limit: itemLimit,
            upgradeUrl: user.hasProFeatures() ? null : '/upgrade'
          }
        });
      }

      // Check for duplicate items (same barcode or similar name)
      if (product.barcode) {
        const existingItem = await WishlistItem.findOne({
          userId,
          'product.barcode': product.barcode,
          status: { $ne: 'removed' }
        });

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

      // Create wishlist item
      const itemData = {
        userId,
        product: {
          name: product.name,
          brand: product.brand,
          model: product.model,
          barcode: product.barcode,
          sku: product.sku,
          image: product.image,
          images: product.images || [],
          category: product.category?.toLowerCase(),
          subcategory: product.subcategory?.toLowerCase(),
          description: product.description,
          specifications: product.specifications || new Map()
        },
        tracking: {
          originalPrice: pricing.originalPrice,
          currentPrice: pricing.currentPrice || pricing.originalPrice,
          currency: pricing.currency || 'USD',
          checkFrequency: pricing.checkFrequency || 'daily',
          isTracking: pricing.isTracking !== false
        },
        alerts: {
          priceDropThreshold: alerts.priceDropThreshold || 10,
          targetPrice: alerts.targetPrice,
          enabled: alerts.enabled !== false,
          emailAlerts: alerts.emailAlerts !== false,
          pushAlerts: alerts.pushAlerts !== false
        },
        sources: sources.map(source => ({
          name: source.name,
          url: source.url,
          domain: source.domain.toLowerCase(),
          price: source.price,
          availability: source.availability || 'unknown'
        })),
        metadata: {
          addedFrom: metadata.addedFrom || 'manual',
          platform: metadata.platform || 'web',
          tags: metadata.tags ? metadata.tags.map(tag => tag.toLowerCase()) : [],
          notes: metadata.notes,
          priority: metadata.priority || 'medium'
        }
      };

      const item = await WishlistItem.create(itemData);

      Logger.info('Wishlist item added', {
        itemId: item._id,
        productName: item.product.name,
        userId
      });

      res.status(201).json({
        message: 'Item added to wishlist successfully',
        item: {
          id: item._id,
          product: item.product,
          pricing: {
            originalPrice: item.tracking.originalPrice,
            currentPrice: item.tracking.currentPrice,
            currency: item.tracking.currency
          },
          alerts: item.alerts,
          sources: item.sources,
          metadata: item.metadata,
          status: item.status,
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
            message: 'Wishlist item not found'
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
        if (updates.metadata.tags) {
          item.metadata.tags = updates.metadata.tags.map(tag => tag.toLowerCase());
        }
        if (updates.metadata.notes !== undefined) {
          item.metadata.notes = updates.metadata.notes;
        }
        if (updates.metadata.priority) {
          item.metadata.priority = updates.metadata.priority;
        }
      }

      if (updates.tracking) {
        if (updates.tracking.checkFrequency) {
          item.tracking.checkFrequency = updates.tracking.checkFrequency;
        }
        if (updates.tracking.isTracking !== undefined) {
          item.tracking.isTracking = updates.tracking.isTracking;
        }
      }

      await item.save();

      Logger.info('Wishlist item updated', {
        itemId: item._id,
        userId,
        updates: Object.keys(updates)
      });

      res.json({
        message: 'Item updated successfully',
        item: {
          id: item._id,
          product: item.product,
          alerts: item.alerts,
          metadata: item.metadata,
          tracking: {
            checkFrequency: item.tracking.checkFrequency,
            isTracking: item.tracking.isTracking
          },
          updatedAt: item.updatedAt
        }
      });
    } catch (error) {
      Logger.error('Update wishlist item failed', {
        error: error.message,
        itemId: req.params.itemId,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'UPDATE_ITEM_FAILED',
          message: 'Failed to update wishlist item'
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
            message: 'Wishlist item not found'
          }
        });
      }

      // Soft delete - mark as removed
      item.status = 'removed';
      item.tracking.isTracking = false;
      await item.save();

      Logger.info('Wishlist item removed', {
        itemId: item._id,
        productName: item.product.name,
        userId
      });

      res.json({
        message: 'Item removed from wishlist successfully',
        itemId: item._id
      });
    } catch (error) {
      Logger.error('Remove wishlist item failed', {
        error: error.message,
        itemId: req.params.itemId,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'REMOVE_ITEM_FAILED',
          message: 'Failed to remove item from wishlist'
        }
      });
    }
  }

  // Mark item as purchased
  static async markAsPurchased(req, res) {
    try {
      const userId = req.user.userId;
      const { itemId } = req.params;
      const { purchasePrice, purchaseDate } = req.body;

      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: 'active'
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Active wishlist item not found'
          }
        });
      }

      await item.markAsPurchased(purchasePrice);

      if (purchaseDate) {
        item.purchasedAt = new Date(purchaseDate);
        await item.save();
      }

      Logger.info('Wishlist item marked as purchased', {
        itemId: item._id,
        productName: item.product.name,
        purchasePrice: item.purchasePrice,
        userId
      });

      res.json({
        message: 'Item marked as purchased successfully',
        item: {
          id: item._id,
          product: item.product,
          status: item.status,
          purchasedAt: item.purchasedAt,
          purchasePrice: item.purchasePrice,
          savings: item.tracking.originalPrice - item.purchasePrice
        }
      });
    } catch (error) {
      Logger.error('Mark as purchased failed', {
        error: error.message,
        itemId: req.params.itemId,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'MARK_PURCHASED_FAILED',
          message: 'Failed to mark item as purchased'
        }
      });
    }
  }

  // Get wishlist statistics
  static async getWishlistStats(req, res) {
    try {
      const userId = req.user.userId;

      const stats = await WishlistItem.getUserWishlistStats(userId);
      const statsData = stats[0] || { stats: [], totalItems: 0, totalValue: 0 };

      // Calculate additional metrics
      const statusBreakdown = {};
      let totalSavings = 0;
      let averagePrice = 0;

      statsData.stats.forEach(stat => {
        statusBreakdown[stat.status] = {
          count: stat.count,
          totalValue: stat.totalValue,
          avgPrice: stat.avgPrice
        };

        if (stat.status === 'active') {
          averagePrice = stat.avgPrice;
        }
      });

      // Get price drop alerts count
      const alertsCount = await PriceAlert.countDocuments({
        userId,
        status: { $in: ['pending', 'sent'] },
        'notification.inApp.read': false
      });

      // Get items with recent price drops
      const recentDrops = await WishlistItem.find({
        userId,
        status: 'active',
        'tracking.currentPrice': { $lt: '$tracking.originalPrice' }
      })
      .sort({ 'tracking.lastChecked': -1 })
      .limit(5)
      .select('product.name tracking.originalPrice tracking.currentPrice tracking.lastChecked');

      recentDrops.forEach(item => {
        totalSavings += item.tracking.originalPrice - item.tracking.currentPrice;
      });

      res.json({
        summary: {
          totalItems: statsData.totalItems,
          totalValue: statsData.totalValue,
          averagePrice: averagePrice || 0,
          totalSavings,
          unreadAlerts: alertsCount
        },
        breakdown: statusBreakdown,
        recentPriceDrops: recentDrops.map(item => ({
          id: item._id,
          name: item.product.name,
          originalPrice: item.tracking.originalPrice,
          currentPrice: item.tracking.currentPrice,
          savings: item.tracking.originalPrice - item.tracking.currentPrice,
          lastChecked: item.tracking.lastChecked
        })),
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get wishlist stats failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve wishlist statistics'
        }
      });
    }
  }

  // Get single wishlist item details
  static async getItem(req, res) {
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
            message: 'Wishlist item not found'
          }
        });
      }

      // Get recent price history (last 30 entries)
      const recentPriceHistory = item.tracking.priceHistory
        .slice(-30)
        .map(entry => ({
          price: entry.price,
          source: entry.source,
          availability: entry.availability,
          recordedAt: entry.recordedAt
        }));

      res.json({
        item: {
          id: item._id,
          product: item.product,
          pricing: {
            originalPrice: item.tracking.originalPrice,
            currentPrice: item.tracking.currentPrice,
            lowestPrice: item.tracking.lowestPrice,
            highestPrice: item.tracking.highestPrice,
            currency: item.tracking.currency,
            priceChangePercentage: item.priceChangePercentage,
            savingsAmount: item.savingsAmount,
            hasPriceDropped: item.hasPriceDropped,
            lastChecked: item.tracking.lastChecked
          },
          alerts: {
            enabled: item.alerts.enabled,
            priceDropThreshold: item.alerts.priceDropThreshold,
            targetPrice: item.alerts.targetPrice,
            emailAlerts: item.alerts.emailAlerts,
            pushAlerts: item.alerts.pushAlerts,
            isTargetPriceMet: item.isTargetPriceMet,
            isPriceDropThresholdMet: item.isPriceDropThresholdMet,
            lastAlertSent: item.alerts.lastAlertSent
          },
          sources: item.sources.map(source => ({
            name: source.name,
            url: source.url,
            domain: source.domain,
            price: source.price,
            availability: source.availability,
            lastChecked: source.lastChecked,
            isActive: source.isActive
          })),
          tracking: {
            checkFrequency: item.tracking.checkFrequency,
            isTracking: item.tracking.isTracking,
            priceHistory: recentPriceHistory
          },
          metadata: item.metadata,
          status: item.status,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          purchasedAt: item.purchasedAt,
          purchasePrice: item.purchasePrice
        }
      });
    } catch (error) {
      Logger.error('Get wishlist item failed', {
        error: error.message,
        itemId: req.params.itemId,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'GET_ITEM_FAILED',
          message: 'Failed to retrieve wishlist item'
        }
      });
    }
  }
}

module.exports = WishlistController;