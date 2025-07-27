const PriceTrackingService = require('../services/priceTrackingService');
const NotificationService = require('../services/notificationService');
const PriceAlert = require('../models/PriceAlert');
const WishlistItem = require('../models/WishlistItem');
const Logger = require('../utils/logger');

class PriceTrackingController {
  // Get price tracking service status
  static async getStatus(req, res) {
    try {
      const status = PriceTrackingService.getStatus();
      
      // Get additional statistics
      const stats = await Promise.all([
        WishlistItem.countDocuments({ 
          status: 'active', 
          'tracking.isTracking': true 
        }),
        PriceAlert.countDocuments({ 
          status: 'pending',
          expiresAt: { $gt: new Date() }
        }),
        PriceAlert.countDocuments({
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        })
      ]);

      res.json({
        service: status,
        statistics: {
          activelyTrackedItems: stats[0],
          pendingAlerts: stats[1],
          alertsLast24h: stats[2]
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get price tracking status failed', { error: error.message });
      
      res.status(500).json({
        error: {
          code: 'STATUS_FAILED',
          message: 'Failed to get price tracking status'
        }
      });
    }
  }

  // Manually trigger price check for specific item
  static async checkItemPrice(req, res) {
    try {
      const { itemId } = req.params;
      const userId = req.user.userId;

      // Verify item belongs to user
      const item = await WishlistItem.findOne({
        _id: itemId,
        userId,
        status: 'active'
      });

      if (!item) {
        return res.status(404).json({
          error: {
            code: 'ITEM_NOT_FOUND',
            message: 'Wishlist item not found or not accessible'
          }
        });
      }

      if (!item.tracking.isTracking) {
        return res.status(400).json({
          error: {
            code: 'TRACKING_DISABLED',
            message: 'Price tracking is disabled for this item'
          }
        });
      }

      const result = await PriceTrackingService.checkSingleItem(itemId);

      Logger.info('Manual price check requested', {
        itemId,
        userId,
        result: result.status
      });

      res.json({
        message: 'Price check completed',
        item: {
          id: itemId,
          name: item.product.name,
          previousPrice: result.oldPrice,
          currentPrice: result.newPrice || result.oldPrice,
          lastChecked: new Date().toISOString()
        },
        result: {
          status: result.status,
          priceChanged: result.status === 'updated',
          source: result.source
        }
      });
    } catch (error) {
      Logger.error('Manual price check failed', {
        itemId: req.params.itemId,
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'PRICE_CHECK_FAILED',
          message: 'Failed to check item price'
        }
      });
    }
  }

  // Bulk price check for user's wishlist
  static async checkUserWishlist(req, res) {
    try {
      const userId = req.user.userId;

      const result = await PriceTrackingService.checkUserWishlist(userId);

      Logger.info('Bulk price check requested', {
        userId,
        summary: result.summary
      });

      res.json({
        message: result.message,
        summary: result.summary,
        results: result.results.map(r => ({
          itemId: r.itemId,
          status: r.status,
          priceChanged: r.status === 'updated',
          oldPrice: r.oldPrice,
          newPrice: r.newPrice,
          source: r.source,
          error: r.error
        })),
        checkedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Bulk price check failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'BULK_CHECK_FAILED',
          message: 'Failed to check wishlist prices'
        }
      });
    }
  }

  // Get user's price alerts
  static async getUserAlerts(req, res) {
    try {
      const userId = req.user.userId;
      const {
        status,
        alertType,
        unreadOnly,
        dateFrom,
        dateTo,
        limit = 20,
        page = 1
      } = req.query;

      const options = {
        status,
        alertType,
        unreadOnly: unreadOnly === 'true',
        dateFrom,
        dateTo,
        limit: Math.min(parseInt(limit) || 20, 100),
        skip: (parseInt(page) - 1) * (parseInt(limit) || 20)
      };

      const alerts = await PriceAlert.getUserAlerts(userId, options);

      // Get total count for pagination
      const totalQuery = { userId };
      if (status) totalQuery.status = status;
      if (alertType) totalQuery.alertType = alertType;
      if (unreadOnly) totalQuery['notification.inApp.read'] = false;

      const totalCount = await PriceAlert.countDocuments(totalQuery);

      const formattedAlerts = alerts.map(alert => ({
        id: alert._id,
        type: alert.alertType,
        message: alert.alertMessage,
        product: {
          id: alert.wishlistItemId?._id,
          name: alert.product.name,
          brand: alert.product.brand,
          image: alert.product.image
        },
        pricing: {
          currentPrice: alert.trigger.currentPrice,
          previousPrice: alert.trigger.previousPrice,
          targetPrice: alert.trigger.targetPrice,
          savingsAmount: alert.savingsAmount,
          dropPercentage: alert.trigger.dropPercentage
        },
        source: alert.source,
        status: alert.status,
        priority: alert.priority,
        isRead: alert.notification.inApp.read,
        createdAt: alert.createdAt,
        expiresAt: alert.expiresAt
      }));

      res.json({
        alerts: formattedAlerts,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / options.limit),
          totalCount,
          hasNextPage: parseInt(page) * options.limit < totalCount,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          status,
          alertType,
          unreadOnly,
          dateFrom,
          dateTo
        }
      });
    } catch (error) {
      Logger.error('Get user alerts failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'GET_ALERTS_FAILED',
          message: 'Failed to retrieve price alerts'
        }
      });
    }
  }

  // Mark alert as read
  static async markAlertAsRead(req, res) {
    try {
      const { alertId } = req.params;
      const userId = req.user.userId;

      const alert = await PriceAlert.findOne({
        _id: alertId,
        userId
      });

      if (!alert) {
        return res.status(404).json({
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Price alert not found'
          }
        });
      }

      await alert.markAsRead();

      Logger.info('Alert marked as read', {
        alertId,
        userId
      });

      res.json({
        message: 'Alert marked as read',
        alert: {
          id: alert._id,
          isRead: true,
          readAt: alert.notification.inApp.readAt
        }
      });
    } catch (error) {
      Logger.error('Mark alert as read failed', {
        alertId: req.params.alertId,
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'MARK_READ_FAILED',
          message: 'Failed to mark alert as read'
        }
      });
    }
  }

  // Dismiss alert
  static async dismissAlert(req, res) {
    try {
      const { alertId } = req.params;
      const userId = req.user.userId;

      const alert = await PriceAlert.findOne({
        _id: alertId,
        userId
      });

      if (!alert) {
        return res.status(404).json({
          error: {
            code: 'ALERT_NOT_FOUND',
            message: 'Price alert not found'
          }
        });
      }

      await alert.dismiss();

      Logger.info('Alert dismissed', {
        alertId,
        userId
      });

      res.json({
        message: 'Alert dismissed successfully',
        alertId
      });
    } catch (error) {
      Logger.error('Dismiss alert failed', {
        alertId: req.params.alertId,
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'DISMISS_ALERT_FAILED',
          message: 'Failed to dismiss alert'
        }
      });
    }
  }

  // Get alert statistics
  static async getAlertStats(req, res) {
    try {
      const userId = req.user.userId;
      const { dateFrom, dateTo } = req.query;

      const options = {};
      if (dateFrom) options.dateFrom = dateFrom;
      if (dateTo) options.dateTo = dateTo;

      const stats = await PriceAlert.getAlertStats(userId, options);

      // Get additional metrics
      const [unreadCount, totalSavings] = await Promise.all([
        PriceAlert.countDocuments({
          userId,
          'notification.inApp.read': false,
          status: { $in: ['pending', 'sent'] }
        }),
        PriceAlert.aggregate([
          {
            $match: {
              userId,
              alertType: 'price_drop',
              status: 'sent',
              ...(dateFrom || dateTo ? {
                createdAt: {
                  ...(dateFrom && { $gte: new Date(dateFrom) }),
                  ...(dateTo && { $lte: new Date(dateTo) })
                }
              } : {})
            }
          },
          {
            $group: {
              _id: null,
              totalSavings: { $sum: '$trigger.dropAmount' },
              averageSavings: { $avg: '$trigger.dropAmount' },
              count: { $sum: 1 }
            }
          }
        ])
      ]);

      const savingsData = totalSavings[0] || {
        totalSavings: 0,
        averageSavings: 0,
        count: 0
      };

      res.json({
        summary: {
          unreadAlerts: unreadCount,
          totalSavingsFromAlerts: savingsData.totalSavings,
          averageSavingsPerAlert: savingsData.averageSavings,
          totalAlertsTriggered: savingsData.count
        },
        breakdown: stats,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        },
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get alert stats failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'ALERT_STATS_FAILED',
          message: 'Failed to retrieve alert statistics'
        }
      });
    }
  }

  // Admin: Start/stop price tracking service
  static async controlService(req, res) {
    try {
      const { action } = req.body;

      if (!['start', 'stop'].includes(action)) {
        return res.status(400).json({
          error: {
            code: 'INVALID_ACTION',
            message: 'Action must be "start" or "stop"'
          }
        });
      }

      if (action === 'start') {
        PriceTrackingService.start();
      } else {
        PriceTrackingService.stop();
      }

      Logger.info('Price tracking service control', {
        action,
        adminUserId: req.user.userId
      });

      res.json({
        message: `Price tracking service ${action}ed successfully`,
        status: PriceTrackingService.getStatus()
      });
    } catch (error) {
      Logger.error('Service control failed', {
        action: req.body.action,
        adminUserId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'SERVICE_CONTROL_FAILED',
          message: 'Failed to control price tracking service'
        }
      });
    }
  }

  // Admin: Process pending notifications
  static async processPendingNotifications(req, res) {
    try {
      const result = await NotificationService.processPendingAlerts();

      Logger.info('Pending notifications processed', {
        result,
        adminUserId: req.user.userId
      });

      res.json({
        message: result.message,
        statistics: {
          total: result.total,
          processed: result.processed,
          failed: result.total - result.processed
        },
        processedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Process pending notifications failed', {
        adminUserId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'PROCESS_NOTIFICATIONS_FAILED',
          message: 'Failed to process pending notifications'
        }
      });
    }
  }
}

module.exports = PriceTrackingController;