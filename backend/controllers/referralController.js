const User = require('../models/User');
const Logger = require('../utils/logger');

class ReferralController {
  // Get referral code for user (alias for generateReferralCode)
  static async getReferralCode(req, res) {
    return this.generateReferralCode(req, res);
  }

  // Generate referral code for user
  static async generateReferralCode(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Generate referral code if user doesn't have one
      if (!user.referral.code) {
        user.referral.code = this.generateUniqueCode();
        await user.save();
      }

      res.json({
        referralCode: user.referral.code,
        referralUrl: `https://shopsavr.xyz/signup?ref=${user.referral.code}`,
        stats: {
          totalReferrals: user.referral.totalReferrals,
          successfulReferrals: user.referral.successfulReferrals,
          totalEarnings: user.referral.totalEarnings
        }
      });
    } catch (error) {
      Logger.error('Generate referral code failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'REFERRAL_CODE_GENERATION_FAILED',
          message: 'Failed to generate referral code'
        }
      });
    }
  }

  // Get referral stats for user
  static async getReferralStats(req, res) {
    try {
      const userId = req.user.userId;
      
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Get referred users (basic info only)
      const referredUsers = await User.find({
        'referral.referredBy': user.referral.code
      }).select('email createdAt subscription.tier').limit(50);

      res.json({
        referralCode: user.referral.code,
        stats: {
          totalReferrals: user.referral.totalReferrals,
          successfulReferrals: user.referral.successfulReferrals,
          totalEarnings: user.referral.totalEarnings,
          pendingEarnings: user.referral.pendingEarnings
        },
        referredUsers: referredUsers.map(u => ({
          id: u._id,
          email: u.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
          joinedAt: u.createdAt,
          subscriptionTier: u.subscription.tier
        })),
        payoutHistory: user.referral.payoutHistory || []
      });
    } catch (error) {
      Logger.error('Get referral stats failed', {
        userId: req.user.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'REFERRAL_STATS_FAILED',
          message: 'Failed to retrieve referral statistics'
        }
      });
    }
  }

  // Claim referral (alias for processReferralSignup)
  static async claimReferral(req, res) {
    return this.processReferralSignup(req, res);
  }

  // Process referral signup
  static async processReferralSignup(req, res) {
    try {
      const { referralCode, newUserId } = req.body;

      if (!referralCode || !newUserId) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Referral code and new user ID are required'
          }
        });
      }

      // Find referring user
      const referringUser = await User.findOne({
        'referral.code': referralCode
      });

      if (!referringUser) {
        return res.status(404).json({
          error: {
            code: 'INVALID_REFERRAL_CODE',
            message: 'Invalid referral code'
          }
        });
      }

      // Find new user
      const newUser = await User.findById(newUserId);
      if (!newUser) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'New user not found'
          }
        });
      }

      // Check if user was already referred
      if (newUser.referral.referredBy) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_REFERRED',
            message: 'User was already referred by someone else'
          }
        });
      }

      // Process referral
      newUser.referral.referredBy = referralCode;
      referringUser.referral.totalReferrals += 1;

      await Promise.all([
        newUser.save(),
        referringUser.save()
      ]);

      Logger.info('Referral signup processed', {
        referralCode,
        referringUserId: referringUser._id,
        newUserId
      });

      res.json({
        message: 'Referral signup processed successfully',
        referralBonus: {
          newUserBonus: 'Welcome bonus applied',
          referrerBonus: 'Referral credit pending'
        }
      });
    } catch (error) {
      Logger.error('Process referral signup failed', {
        referralCode: req.body.referralCode,
        newUserId: req.body.newUserId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'REFERRAL_SIGNUP_FAILED',
          message: 'Failed to process referral signup'
        }
      });
    }
  }

  // Process subscription completion (award referral bonus)
  static async processSubscriptionCompletion(req, res) {
    try {
      const { userId, subscriptionTier, amount } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      // Check if user was referred
      if (!user.referral.referredBy) {
        return res.json({
          message: 'No referral to process'
        });
      }

      // Find referring user
      const referringUser = await User.findOne({
        'referral.code': user.referral.referredBy
      });

      if (!referringUser) {
        Logger.warn('Referring user not found', {
          referralCode: user.referral.referredBy,
          userId
        });
        return res.json({
          message: 'Referring user not found'
        });
      }

      // Calculate referral bonus (e.g., 20% of first subscription)
      const bonusAmount = Math.round(amount * 0.20 * 100) / 100;

      // Award bonus to referring user
      referringUser.referral.successfulReferrals += 1;
      referringUser.referral.totalEarnings += bonusAmount;
      referringUser.referral.pendingEarnings += bonusAmount;

      await referringUser.save();

      Logger.info('Referral bonus awarded', {
        referringUserId: referringUser._id,
        newUserId: userId,
        bonusAmount,
        subscriptionTier
      });

      res.json({
        message: 'Referral bonus processed successfully',
        bonus: {
          amount: bonusAmount,
          currency: 'USD',
          referringUser: referringUser._id
        }
      });
    } catch (error) {
      Logger.error('Process subscription completion failed', {
        userId: req.body.userId,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'REFERRAL_BONUS_FAILED',
          message: 'Failed to process referral bonus'
        }
      });
    }
  }

  // Validate referral code (public endpoint)
  static async validateReferralCode(req, res) {
    try {
      const { code } = req.params;

      if (!code) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REFERRAL_CODE',
            message: 'Referral code is required'
          }
        });
      }

      // Find user with this referral code
      const user = await User.findOne({
        'referral.code': code.toUpperCase()
      }).select('referral.code email');

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'INVALID_REFERRAL_CODE',
            message: 'Invalid referral code'
          }
        });
      }

      res.json({
        valid: true,
        referralCode: user.referral.code,
        referrerInfo: {
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask email
        }
      });
    } catch (error) {
      Logger.error('Validate referral code failed', {
        code: req.params.code,
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Failed to validate referral code'
        }
      });
    }
  }

  // Get referral leaderboard (public endpoint)
  static async getLeaderboard(req, res) {
    try {
      const { limit = 10, timeframe = 'all' } = req.query;

      // Build date filter for timeframe
      let dateFilter = {};
      if (timeframe !== 'all') {
        const now = new Date();
        switch (timeframe) {
          case 'month':
            dateFilter = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
            break;
          case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            dateFilter = { $gte: weekAgo };
            break;
          default:
            dateFilter = {};
        }
      }

      // Get top referrers
      const leaderboard = await User.aggregate([
        {
          $match: {
            'referral.totalReferrals': { $gt: 0 },
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        },
        {
          $project: {
            'referral.code': 1,
            'referral.totalReferrals': 1,
            'referral.successfulReferrals': 1,
            email: 1,
            createdAt: 1
          }
        },
        {
          $sort: { 'referral.totalReferrals': -1 }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      const formattedLeaderboard = leaderboard.map((user, index) => ({
        rank: index + 1,
        referralCode: user.referral.code,
        totalReferrals: user.referral.totalReferrals,
        successfulReferrals: user.referral.successfulReferrals,
        conversionRate: user.referral.totalReferrals > 0 
          ? user.referral.successfulReferrals / user.referral.totalReferrals 
          : 0,
        referrerInfo: {
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // Mask email
          joinedAt: user.createdAt
        }
      }));

      res.json({
        leaderboard: formattedLeaderboard,
        timeframe,
        totalEntries: leaderboard.length
      });
    } catch (error) {
      Logger.error('Get referral leaderboard failed', {
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'LEADERBOARD_FAILED',
          message: 'Failed to retrieve referral leaderboard'
        }
      });
    }
  }

  // Get analytics (admin only)
  static async getAnalytics(req, res) {
    try {
      const { dateFrom, dateTo, limit = 100 } = req.query;

      // Build date filter
      const dateFilter = {};
      if (dateFrom) {
        dateFilter.$gte = new Date(dateFrom);
      }
      if (dateTo) {
        dateFilter.$lte = new Date(dateTo);
      }

      // Get referral statistics
      const totalReferrals = await User.countDocuments({
        'referral.referredBy': { $exists: true, $ne: null }
      });

      const successfulReferrals = await User.countDocuments({
        'referral.referredBy': { $exists: true, $ne: null },
        'subscription.tier': { $in: ['pro', 'pro_max'] }
      });

      // Get top referrers
      const topReferrers = await User.aggregate([
        {
          $match: {
            'referral.totalReferrals': { $gt: 0 }
          }
        },
        {
          $project: {
            email: 1,
            'referral.code': 1,
            'referral.totalReferrals': 1,
            'referral.successfulReferrals': 1,
            'referral.totalEarnings': 1
          }
        },
        {
          $sort: { 'referral.totalReferrals': -1 }
        },
        {
          $limit: parseInt(limit)
        }
      ]);

      // Get referral conversion rate over time
      const conversionStats = await User.aggregate([
        {
          $match: {
            'referral.referredBy': { $exists: true, $ne: null },
            ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSignups: { $sum: 1 },
            conversions: {
              $sum: {
                $cond: [
                  { $in: ['$subscription.tier', ['pro', 'pro_max']] },
                  1,
                  0
                ]
              }
            }
          }
        },
        {
          $project: {
            _id: 1,
            totalSignups: 1,
            conversions: 1,
            conversionRate: {
              $cond: [
                { $gt: ['$totalSignups', 0] },
                { $divide: ['$conversions', '$totalSignups'] },
                0
              ]
            }
          }
        },
        {
          $sort: { '_id.year': -1, '_id.month': -1 }
        }
      ]);

      res.json({
        summary: {
          totalReferrals,
          successfulReferrals,
          conversionRate: totalReferrals > 0 ? successfulReferrals / totalReferrals : 0,
          totalEarningsPaid: await this.getTotalEarningsPaid()
        },
        topReferrers: topReferrers.map(user => ({
          ...user,
          email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2') // Mask email
        })),
        conversionStats,
        dateRange: {
          from: dateFrom || null,
          to: dateTo || null
        }
      });
    } catch (error) {
      Logger.error('Get referral analytics failed', {
        error: error.message
      });

      res.status(500).json({
        error: {
          code: 'ANALYTICS_FAILED',
          message: 'Failed to retrieve referral analytics'
        }
      });
    }
  }

  // Helper method to generate unique referral code
  static generateUniqueCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Helper method to get total earnings paid
  static async getTotalEarningsPaid() {
    try {
      const result = await User.aggregate([
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$referral.totalEarnings' }
          }
        }
      ]);
      return result[0]?.totalPaid || 0;
    } catch (error) {
      Logger.error('Get total earnings paid failed', { error: error.message });
      return 0;
    }
  }
}

module.exports = ReferralController;