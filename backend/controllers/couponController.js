const Coupon = require('../models/Coupon');
const CouponUsage = require('../models/CouponUsage');
const Logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

class CouponController {
  // Search for coupons by domain
  static async searchCoupons(req, res) {
    try {
      const { domain } = req.params;
      const { 
        categories = [], 
        discountType, 
        minDiscount, 
        maxDiscount,
        limit = 20,
        sortBy = 'success_rate' 
      } = req.query;

      if (!domain) {
        return res.status(400).json({
          error: {
            code: 'DOMAIN_REQUIRED',
            message: 'Domain parameter is required'
          }
        });
      }

      // Check cache first
      const redis = getRedisClient();
      const cacheKey = `coupons:${domain}:${JSON.stringify(req.query)}`;
      
      try {
        const cachedResult = await redis.get(cacheKey);
        if (cachedResult) {
          Logger.info('Coupon search cache hit', { domain, userId: req.user?.userId });
          return res.json(JSON.parse(cachedResult));
        }
      } catch (cacheError) {
        Logger.warn('Cache read failed', { error: cacheError.message });
      }

      // Build search options
      const searchOptions = {
        discountType,
        categories: Array.isArray(categories) ? categories : [categories].filter(Boolean),
        limit: Math.min(parseInt(limit) || 20, 100) // Cap at 100
      };

      // Find active coupons
      let coupons = await Coupon.findActiveCoupons(domain, searchOptions);

      // Apply discount filters
      if (minDiscount || maxDiscount) {
        coupons = coupons.filter(coupon => {
          const discount = coupon.discountValue;
          if (minDiscount && discount < minDiscount) return false;
          if (maxDiscount && discount > maxDiscount) return false;
          return true;
        });
      }

      // Sort coupons
      switch (sortBy) {
        case 'discount_value':
          coupons.sort((a, b) => b.discountValue - a.discountValue);
          break;
        case 'recent':
          coupons.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          break;
        case 'success_rate':
        default:
          coupons.sort((a, b) => b.successRate - a.successRate);
          break;
      }

      // Format response
      const formattedCoupons = coupons.map(coupon => ({
        id: coupon._id,
        code: coupon.code,
        title: coupon.title,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumOrder: coupon.minimumOrder,
        maximumDiscount: coupon.maximumDiscount,
        expiresAt: coupon.expiresAt,
        successRate: coupon.successRate,
        categories: coupon.categories,
        terms: coupon.terms,
        userRestrictions: coupon.userRestrictions,
        isExclusive: coupon.isExclusive
      }));

      const response = {
        domain,
        coupons: formattedCoupons,
        total: formattedCoupons.length,
        searchParams: {
          categories: searchOptions.categories,
          discountType,
          sortBy,
          limit: searchOptions.limit
        }
      };

      // Cache the result for 5 minutes
      try {
        await redis.setEx(cacheKey, 300, JSON.stringify(response));
      } catch (cacheError) {
        Logger.warn('Cache write failed', { error: cacheError.message });
      }

      Logger.info('Coupon search completed', { 
        domain, 
        resultCount: formattedCoupons.length,
        userId: req.user?.userId 
      });

      res.json(response);
    } catch (error) {
      Logger.error('Coupon search failed', { 
        error: error.message, 
        domain: req.params.domain,
        userId: req.user?.userId 
      });
      
      res.status(500).json({
        error: {
          code: 'COUPON_SEARCH_FAILED',
          message: 'Failed to search coupons'
        }
      });
    }
  }

  // Validate a specific coupon code
  static async validateCoupon(req, res) {
    try {
      const { code, domain } = req.body;
      const { amount = 0, categories = [], isNewUser = false } = req.body.orderData || {};

      if (!code || !domain) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Code and domain are required'
          }
        });
      }

      // Find the coupon
      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
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
      const orderData = { amount, categories, isNewUser, userId: req.user?.userId };
      const applicability = coupon.appliesTo(orderData);

      if (!applicability.applies) {
        return res.status(400).json({
          error: {
            code: 'COUPON_NOT_APPLICABLE',
            message: applicability.reason
          }
        });
      }

      // Calculate discount
      const discountAmount = coupon.calculateDiscount(amount);

      // Record validation attempt
      await coupon.recordAttempt(true);

      Logger.info('Coupon validation successful', { 
        code, 
        domain, 
        discountAmount,
        userId: req.user?.userId 
      });

      res.json({
        valid: true,
        coupon: {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          description: coupon.description,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          terms: coupon.terms
        },
        discount: {
          amount: discountAmount,
          type: coupon.discountType,
          value: coupon.discountValue,
          originalAmount: amount,
          finalAmount: Math.max(0, amount - discountAmount)
        },
        restrictions: coupon.userRestrictions
      });
    } catch (error) {
      Logger.error('Coupon validation failed', { 
        error: error.message,
        code: req.body.code,
        domain: req.body.domain,
        userId: req.user?.userId 
      });
      
      res.status(500).json({
        error: {
          code: 'COUPON_VALIDATION_FAILED',
          message: 'Failed to validate coupon'
        }
      });
    }
  }

  // Get best coupon for an order
  static async getBestCoupon(req, res) {
    try {
      const { domain } = req.params;
      const { amount, categories = [], isNewUser = false } = req.body;

      if (!domain || amount === undefined) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Domain and amount are required'
          }
        });
      }

      const orderData = { 
        amount: parseFloat(amount), 
        categories: Array.isArray(categories) ? categories : [categories].filter(Boolean),
        isNewUser: Boolean(isNewUser),
        userId: req.user?.userId 
      };

      // Find the best coupon
      const result = await Coupon.findBestCoupon(domain, orderData);

      if (!result.coupon) {
        return res.json({
          bestCoupon: null,
          message: 'No applicable coupons found for this order'
        });
      }

      // Record the successful match
      await result.coupon.recordAttempt(true);

      Logger.info('Best coupon found', { 
        domain, 
        couponCode: result.coupon.code,
        discount: result.discount,
        userId: req.user?.userId 
      });

      res.json({
        bestCoupon: {
          id: result.coupon._id,
          code: result.coupon.code,
          title: result.coupon.title,
          description: result.coupon.description,
          discountType: result.coupon.discountType,
          discountValue: result.coupon.discountValue,
          terms: result.coupon.terms,
          successRate: result.coupon.successRate
        },
        discount: {
          amount: result.discount,
          originalAmount: orderData.amount,
          finalAmount: Math.max(0, orderData.amount - result.discount),
          savingsPercentage: ((result.discount / orderData.amount) * 100).toFixed(2)
        },
        orderData: {
          amount: orderData.amount,
          categories: orderData.categories
        }
      });
    } catch (error) {
      Logger.error('Best coupon search failed', { 
        error: error.message,
        domain: req.params.domain,
        userId: req.user?.userId 
      });
      
      res.status(500).json({
        error: {
          code: 'BEST_COUPON_SEARCH_FAILED',
          message: 'Failed to find best coupon'
        }
      });
    }
  }

  // Get coupon usage statistics
  static async getCouponStats(req, res) {
    try {
      const { couponId } = req.params;
      const { dateFrom, dateTo } = req.query;

      if (!couponId) {
        return res.status(400).json({
          error: {
            code: 'COUPON_ID_REQUIRED',
            message: 'Coupon ID is required'
          }
        });
      }

      // Find the coupon
      const coupon = await Coupon.findById(couponId);
      if (!coupon) {
        return res.status(404).json({
          error: {
            code: 'COUPON_NOT_FOUND',
            message: 'Coupon not found'
          }
        });
      }

      // Get usage statistics
      const statsOptions = {};
      if (dateFrom) statsOptions.dateFrom = dateFrom;
      if (dateTo) statsOptions.dateTo = dateTo;

      const usageStats = await CouponUsage.getCouponStats(couponId, statsOptions);

      res.json({
        coupon: {
          id: coupon._id,
          code: coupon.code,
          title: coupon.title,
          domain: coupon.domain,
          discountType: coupon.discountType,
          discountValue: coupon.discountValue,
          createdAt: coupon.createdAt,
          expiresAt: coupon.expiresAt,
          isActive: coupon.isActive
        },
        statistics: {
          basicStats: {
            totalAttempts: coupon.usageStats.totalAttempts,
            successfulUses: coupon.usageStats.successfulUses,
            successRate: coupon.successRate,
            lastUsed: coupon.usageStats.lastUsed,
            lastTested: coupon.usageStats.lastTested
          },
          detailedStats: usageStats[0] || {
            stats: [],
            totalAttempts: 0
          }
        },
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        }
      });
    } catch (error) {
      Logger.error('Coupon stats retrieval failed', { 
        error: error.message,
        couponId: req.params.couponId 
      });
      
      res.status(500).json({
        error: {
          code: 'COUPON_STATS_FAILED',
          message: 'Failed to retrieve coupon statistics'
        }
      });
    }
  }

  // Get domain statistics
  static async getDomainStats(req, res) {
    try {
      const { domain } = req.params;

      if (!domain) {
        return res.status(400).json({
          error: {
            code: 'DOMAIN_REQUIRED',
            message: 'Domain parameter is required'
          }
        });
      }

      // Get coupon statistics for domain
      const couponStats = await Coupon.getDomainStats(domain);
      
      // Get usage statistics for domain
      const usageStats = await CouponUsage.getDomainUsageStats(domain, { limit: 30 });

      // Get top performing coupons for domain
      const topCoupons = await CouponUsage.getTopCoupons({ domain, limit: 10 });

      res.json({
        domain,
        couponStatistics: couponStats[0] || {
          totalCoupons: 0,
          activeCoupons: 0,
          averageSuccessRate: 0,
          totalAttempts: 0,
          totalSuccesses: 0
        },
        usageStatistics: usageStats,
        topPerformingCoupons: topCoupons,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Domain stats retrieval failed', { 
        error: error.message,
        domain: req.params.domain 
      });
      
      res.status(500).json({
        error: {
          code: 'DOMAIN_STATS_FAILED',
          message: 'Failed to retrieve domain statistics'
        }
      });
    }
  }

  // Clear coupon cache for a domain
  static async clearCache(req, res) {
    try {
      const { domain } = req.params;

      if (!domain) {
        return res.status(400).json({
          error: {
            code: 'DOMAIN_REQUIRED',
            message: 'Domain parameter is required'
          }
        });
      }

      const redis = getRedisClient();
      const pattern = `coupons:${domain}:*`;
      
      // Get all keys matching the pattern
      const keys = await redis.keys(pattern);
      
      if (keys.length > 0) {
        await redis.del(...keys);
      }

      Logger.info('Coupon cache cleared', { domain, keysCleared: keys.length });

      res.json({
        message: 'Cache cleared successfully',
        domain,
        keysCleared: keys.length
      });
    } catch (error) {
      Logger.error('Cache clear failed', { 
        error: error.message,
        domain: req.params.domain 
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

module.exports = CouponController;