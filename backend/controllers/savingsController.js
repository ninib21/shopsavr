const User = require('../models/User');
const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Logger = require('../utils/logger');

class SavingsController {
  // Apply coupon and record savings
  static async applyCoupon(req, res) {
    try {
      const { 
        couponCode, 
        domain, 
        orderDetails,
        metadata = {} 
      } = req.body;

      const { 
        originalAmount, 
        categories = [], 
        isNewUser = false 
      } = orderDetails;

      if (!couponCode || !domain || !originalAmount) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Coupon code, domain, and original amount are required'
          }
        });
      }

      // Find the coupon
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase(),
        domain: domain.toLowerCase(),
        isActive: true
      });

      if (!coupon) {
        return res.status(404).json({
          error: {
            code: 'COUPON_NOT_FOUND',
            message: 'Coupon not found or inactive'
          }
        });
      }

      // Check if coupon is expired
      if (coupon.isExpired) {
        await coupon.recordAttempt(false);
        return res.status(400).json({
          error: {
            code: 'COUPON_EXPIRED',
            message: 'Coupon has expired'
          }
        });
      }

      // Check if user has already used this coupon (for one-time use coupons)
      if (req.user && coupon.userRestrictions.oneTimeUse) {
        const previousUsage = await CouponUsage.hasUserUsedCoupon(req.user.userId, coupon._id);
        if (previousUsage) {
          return res.status(400).json({
            error: {
              code: 'COUPON_ALREADY_USED',
              message: 'This coupon can only be used once per user'
            }
          });
        }
      }

      // Check if coupon applies to the order
      const orderData = { 
        amount: originalAmount, 
        categories, 
        isNewUser, 
        userId: req.user?.userId 
      };
      
      const applicability = coupon.appliesTo(orderData);
      if (!applicability.applies) {
        await coupon.recordAttempt(false);
        
        // Record failed usage
        if (req.user) {
          await CouponUsage.create({
            userId: req.user.userId,
            couponId: coupon._id,
            couponCode: coupon.code,
            domain: domain.toLowerCase(),
            orderDetails: {
              originalAmount,
              discountAmount: 0,
              finalAmount: originalAmount
            },
            status: 'failed',
            failureReason: applicability.reason,
            metadata: {
              ...metadata,
              platform: metadata.platform || 'web'
            }
          });
        }

        return res.status(400).json({
          error: {
            code: 'COUPON_NOT_APPLICABLE',
            message: applicability.reason
          }
        });
      }

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(originalAmount);
      const finalAmount = Math.max(0, originalAmount - discountAmount);

      // Record successful coupon usage
      await coupon.recordAttempt(true);

      let couponUsage = null;
      if (req.user) {
        couponUsage = await CouponUsage.create({
          userId: req.user.userId,
          couponId: coupon._id,
          couponCode: coupon.code,
          domain: domain.toLowerCase(),
          orderDetails: {
            originalAmount,
            discountAmount,
            finalAmount,
            currency: orderDetails.currency || 'USD'
          },
          status: 'successful',
          metadata: {
            ...metadata,
            platform: metadata.platform || 'web'
          }
        });

        // Update user's savings
        const user = await User.findById(req.user.userId);
        if (user) {
          await user.addSavings(discountAmount);
        }
      }

      Logger.info('Coupon applied successfully', {
        couponCode,
        domain,
        discountAmount,
        userId: req.user?.userId,
        usageId: couponUsage?._id
      });

      res.json({
        success: true,
        coupon: {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description
        },
        savings: {
          originalAmount,
          discountAmount,
          finalAmount,
          savingsPercentage: ((discountAmount / originalAmount) * 100).toFixed(2),
          currency: orderDetails.currency || 'USD'
        },
        usageId: couponUsage?._id,
        appliedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Coupon application failed', {
        error: error.message,
        couponCode: req.body.couponCode,
        domain: req.body.domain,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: {
          code: 'COUPON_APPLICATION_FAILED',
          message: 'Failed to apply coupon'
        }
      });
    }
  }

  // Get user's savings summary
  static async getSavingsSummary(req, res) {
    try {
      const userId = req.user.userId;
      const { dateFrom, dateTo, domain } = req.query;

      // Get user's current savings from User model
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Get detailed savings from CouponUsage
      const savingsOptions = {};
      if (dateFrom) savingsOptions.dateFrom = dateFrom;
      if (dateTo) savingsOptions.dateTo = dateTo;

      const detailedSavings = await CouponUsage.getUserSavings(userId, savingsOptions);
      const savingsData = detailedSavings[0] || {
        totalSavings: 0,
        totalOrders: 0,
        averageSavings: 0,
        domains: []
      };

      // Get recent usage history
      const recentUsage = await CouponUsage.getUserHistory(userId, {
        domain,
        status: 'successful',
        limit: 10
      });

      // Get savings by domain
      const domainSavings = await CouponUsage.aggregate([
        {
          $match: {
            userId: user._id,
            status: 'successful',
            ...(dateFrom || dateTo ? {
              appliedAt: {
                ...(dateFrom && { $gte: new Date(dateFrom) }),
                ...(dateTo && { $lte: new Date(dateTo) })
              }
            } : {})
          }
        },
        {
          $group: {
            _id: '$domain',
            totalSavings: { $sum: '$orderDetails.discountAmount' },
            orderCount: { $sum: 1 },
            averageSavings: { $avg: '$orderDetails.discountAmount' },
            lastUsed: { $max: '$appliedAt' }
          }
        },
        { $sort: { totalSavings: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        user: {
          id: user._id,
          name: user.profile.name,
          tier: user.subscription.tier
        },
        summary: {
          lifetimeSavings: user.savings.lifetimeSavings,
          totalSaved: user.savings.totalSaved,
          lastUpdated: user.savings.lastUpdated,
          periodSavings: savingsData.totalSavings,
          periodOrders: savingsData.totalOrders,
          averageSavingsPerOrder: savingsData.averageSavings || 0
        },
        breakdown: {
          byDomain: domainSavings,
          recentUsage: recentUsage.map(usage => ({
            id: usage._id,
            couponCode: usage.couponCode,
            domain: usage.domain,
            savings: usage.orderDetails.discountAmount,
            originalAmount: usage.orderDetails.originalAmount,
            appliedAt: usage.appliedAt,
            coupon: usage.couponId ? {
              title: usage.couponId.title,
              discountType: usage.couponId.discountType
            } : null
          }))
        },
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        }
      });
    } catch (error) {
      Logger.error('Savings summary retrieval failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'SAVINGS_SUMMARY_FAILED',
          message: 'Failed to retrieve savings summary'
        }
      });
    }
  }

  // Get user's coupon usage history
  static async getUsageHistory(req, res) {
    try {
      const userId = req.user.userId;
      const { 
        domain, 
        status, 
        dateFrom, 
        dateTo, 
        limit = 50, 
        page = 1 
      } = req.query;

      const options = {
        domain,
        status,
        dateFrom,
        dateTo,
        limit: Math.min(parseInt(limit) || 50, 100),
        skip: (parseInt(page) - 1) * (parseInt(limit) || 50)
      };

      // Get usage history
      const history = await CouponUsage.getUserHistory(userId, options);

      // Get total count for pagination
      const totalQuery = { userId };
      if (domain) totalQuery.domain = domain.toLowerCase();
      if (status) totalQuery.status = status;
      if (dateFrom || dateTo) {
        totalQuery.appliedAt = {};
        if (dateFrom) totalQuery.appliedAt.$gte = new Date(dateFrom);
        if (dateTo) totalQuery.appliedAt.$lte = new Date(dateTo);
      }

      const totalCount = await CouponUsage.countDocuments(totalQuery);

      res.json({
        history: history.map(usage => ({
          id: usage._id,
          couponCode: usage.couponCode,
          domain: usage.domain,
          status: usage.status,
          orderDetails: usage.orderDetails,
          failureReason: usage.failureReason,
          appliedAt: usage.appliedAt,
          coupon: usage.couponId ? {
            title: usage.couponId.title,
            discountType: usage.couponId.discountType,
            discountValue: usage.couponId.discountValue
          } : null,
          metadata: usage.metadata
        })),
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / options.limit),
          totalCount,
          hasNextPage: parseInt(page) * options.limit < totalCount,
          hasPrevPage: parseInt(page) > 1
        },
        filters: {
          domain,
          status,
          dateFrom,
          dateTo
        }
      });
    } catch (error) {
      Logger.error('Usage history retrieval failed', {
        error: error.message,
        userId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'USAGE_HISTORY_FAILED',
          message: 'Failed to retrieve usage history'
        }
      });
    }
  }

  // Get savings leaderboard (for gamification)
  static async getSavingsLeaderboard(req, res) {
    try {
      const { period = 'all', limit = 10 } = req.query;

      let matchStage = { status: 'successful' };

      // Add date filter based on period
      if (period !== 'all') {
        const now = new Date();
        let startDate;

        switch (period) {
          case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            startDate = null;
        }

        if (startDate) {
          matchStage.appliedAt = { $gte: startDate };
        }
      }

      const leaderboard = await CouponUsage.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: '$userId',
            totalSavings: { $sum: '$orderDetails.discountAmount' },
            orderCount: { $sum: 1 },
            averageSavings: { $avg: '$orderDetails.discountAmount' },
            lastActivity: { $max: '$appliedAt' }
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            userId: '$_id',
            name: '$user.profile.name',
            tier: '$user.subscription.tier',
            totalSavings: 1,
            orderCount: 1,
            averageSavings: 1,
            lastActivity: 1
          }
        },
        { $sort: { totalSavings: -1 } },
        { $limit: Math.min(parseInt(limit) || 10, 50) }
      ]);

      // Add ranking
      const rankedLeaderboard = leaderboard.map((entry, index) => ({
        rank: index + 1,
        ...entry
      }));

      res.json({
        leaderboard: rankedLeaderboard,
        period,
        generatedAt: new Date().toISOString(),
        totalEntries: rankedLeaderboard.length
      });
    } catch (error) {
      Logger.error('Leaderboard retrieval failed', {
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'LEADERBOARD_FAILED',
          message: 'Failed to retrieve savings leaderboard'
        }
      });
    }
  }

  // Update savings manually (for admin/system use)
  static async updateSavings(req, res) {
    try {
      const { userId } = req.params;
      const { amount, operation = 'add' } = req.body;

      if (!amount || amount <= 0) {
        return res.status(400).json({
          error: {
            code: 'INVALID_AMOUNT',
            message: 'Amount must be a positive number'
          }
        });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      const previousSavings = user.savings.totalSaved;

      if (operation === 'add') {
        await user.addSavings(amount);
      } else if (operation === 'subtract') {
        user.savings.totalSaved = Math.max(0, user.savings.totalSaved - amount);
        user.savings.lastUpdated = new Date();
        await user.save();
      } else {
        return res.status(400).json({
          error: {
            code: 'INVALID_OPERATION',
            message: 'Operation must be "add" or "subtract"'
          }
        });
      }

      Logger.info('Savings updated manually', {
        userId,
        operation,
        amount,
        previousSavings,
        newSavings: user.savings.totalSaved,
        adminUserId: req.user.userId
      });

      res.json({
        message: 'Savings updated successfully',
        user: {
          id: user._id,
          name: user.profile.name
        },
        savings: {
          previous: previousSavings,
          current: user.savings.totalSaved,
          change: operation === 'add' ? amount : -amount
        },
        updatedAt: user.savings.lastUpdated
      });
    } catch (error) {
      Logger.error('Manual savings update failed', {
        error: error.message,
        userId: req.params.userId,
        adminUserId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'SAVINGS_UPDATE_FAILED',
          message: 'Failed to update savings'
        }
      });
    }
  }
}

module.exports = SavingsController;