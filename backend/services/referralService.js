const User = require('../models/User');
const Referral = require('../models/Referral');
const CouponUsage = require('../models/CouponUsage');
const Logger = require('../utils/logger');

class ReferralService {
  constructor() {
    this.defaultRewards = {
      referrer: {
        type: 'free_time',
        amount: 7,
        unit: 'days'
      },
      referredUser: {
        type: 'free_time',
        amount: 7,
        unit: 'days'
      }
    };
  }

  // Generate unique referral code for user
  generateReferralCode(user) {
    const name = user.profile.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    return `${name}${randomSuffix}`;
  }

  // Create referral relationship
  async createReferral(referrerCode, referredUser, metadata = {}) {
    try {
      // Find referrer by code
      const referrer = await User.findOne({ 'referral.code': referrerCode.toLowerCase() });
      
      if (!referrer) {
        throw new Error('Invalid referral code');
      }

      // Prevent self-referral
      if (referrer._id.toString() === referredUser._id.toString()) {
        throw new Error('Cannot refer yourself');
      }

      // Check if user was already referred
      const existingReferral = await Referral.findOne({
        referredUserId: referredUser._id,
        status: { $ne: 'cancelled' }
      });

      if (existingReferral) {
        throw new Error('User has already been referred');
      }

      // Create referral record
      const referral = await Referral.create({
        referrerId: referrer._id,
        referredUserId: referredUser._id,
        referralCode: referrerCode.toLowerCase(),
        rewards: {
          referrerReward: this.defaultRewards.referrer,
          referredUserReward: this.defaultRewards.referredUser
        },
        metadata: {
          source: metadata.source || 'direct_link',
          campaign: metadata.campaign,
          userAgent: metadata.userAgent,
          ipAddress: metadata.ipAddress,
          referrerPlatform: metadata.platform || 'web'
        }
      });

      // Update referrer's referral count
      referrer.referral.referralCount += 1;
      await referrer.save();

      // Update referred user's referral info
      referredUser.referral.referredBy = referrer._id;
      await referredUser.save();

      Logger.info('Referral created', {
        referrerId: referrer._id,
        referredUserId: referredUser._id,
        referralCode: referrerCode,
        referralId: referral._id
      });

      return referral;
    } catch (error) {
      Logger.error('Failed to create referral', {
        referrerCode,
        referredUserId: referredUser._id,
        error: error.message
      });
      throw error;
    }
  }

  // Update referral usage tracking
  async updateReferralUsage(referredUserId) {
    try {
      const referral = await Referral.findOne({
        referredUserId,
        status: { $in: ['pending', 'completed'] }
      });

      if (!referral) {
        return null;
      }

      // Calculate usage days (days since signup)
      const signupDate = referral.tracking.signupDate;
      const daysSinceSignup = Math.floor((Date.now() - signupDate.getTime()) / (1000 * 60 * 60 * 24));

      // Get total savings for referred user
      const savingsData = await CouponUsage.getUserSavings(referredUserId);
      const totalSavings = savingsData[0]?.totalSavings || 0;

      // Update tracking
      await referral.updateUsageTracking(daysSinceSignup, totalSavings);

      Logger.info('Referral usage updated', {
        referralId: referral._id,
        usageDays: daysSinceSignup,
        totalSavings
      });

      return referral;
    } catch (error) {
      Logger.error('Failed to update referral usage', {
        referredUserId,
        error: error.message
      });
      return null;
    }
  }

  // Record first purchase for referred user
  async recordReferralPurchase(referredUserId) {
    try {
      const referral = await Referral.findOne({
        referredUserId,
        status: { $in: ['pending', 'completed'] }
      });

      if (!referral) {
        return null;
      }

      await referral.recordFirstPurchase();

      Logger.info('Referral purchase recorded', {
        referralId: referral._id,
        referredUserId
      });

      return referral;
    } catch (error) {
      Logger.error('Failed to record referral purchase', {
        referredUserId,
        error: error.message
      });
      return null;
    }
  }

  // Process pending referral rewards
  async processRewards(referralId) {
    try {
      const referral = await Referral.findById(referralId)
        .populate('referrerId referredUserId');

      if (!referral || !referral.canClaimRewards) {
        throw new Error('Referral rewards cannot be processed');
      }

      const results = {
        referrerReward: null,
        referredUserReward: null
      };

      // Process referrer reward
      if (!referral.rewards.referrerReward.claimed) {
        await this.applyReward(
          referral.referrerId,
          referral.rewards.referrerReward
        );
        await referral.claimReferrerReward();
        results.referrerReward = referral.rewards.referrerReward;
      }

      // Process referred user reward
      if (!referral.rewards.referredUserReward.claimed) {
        await this.applyReward(
          referral.referredUserId,
          referral.rewards.referredUserReward
        );
        await referral.claimReferredUserReward();
        results.referredUserReward = referral.rewards.referredUserReward;
      }

      Logger.info('Referral rewards processed', {
        referralId,
        referrerReward: !!results.referrerReward,
        referredUserReward: !!results.referredUserReward
      });

      return results;
    } catch (error) {
      Logger.error('Failed to process referral rewards', {
        referralId,
        error: error.message
      });
      throw error;
    }
  }

  // Apply reward to user account
  async applyReward(user, reward) {
    try {
      switch (reward.type) {
        case 'free_time':
          await this.applyFreeTime(user, reward.amount, reward.unit);
          break;
        
        case 'cashback':
          await this.applyCashback(user, reward.amount);
          break;
        
        case 'credits':
          await this.applyCredits(user, reward.amount);
          break;
        
        default:
          throw new Error(`Unknown reward type: ${reward.type}`);
      }

      Logger.info('Reward applied to user', {
        userId: user._id,
        rewardType: reward.type,
        amount: reward.amount,
        unit: reward.unit
      });
    } catch (error) {
      Logger.error('Failed to apply reward', {
        userId: user._id,
        reward,
        error: error.message
      });
      throw error;
    }
  }

  // Apply free subscription time
  async applyFreeTime(user, amount, unit) {
    const daysToAdd = unit === 'days' ? amount : amount * 30; // Convert months to days
    const millisecondsToAdd = daysToAdd * 24 * 60 * 60 * 1000;

    // If user is on free tier, upgrade to Pro temporarily
    if (user.subscription.tier === 'free') {
      user.subscription.tier = 'pro';
      user.subscription.status = 'active';
      user.subscription.expiresAt = new Date(Date.now() + millisecondsToAdd);
    } else if (user.subscription.expiresAt) {
      // Extend existing subscription
      user.subscription.expiresAt = new Date(
        user.subscription.expiresAt.getTime() + millisecondsToAdd
      );
    } else {
      // Set expiration for unlimited subscription
      user.subscription.expiresAt = new Date(Date.now() + millisecondsToAdd);
    }

    await user.save();
  }

  // Apply cashback reward
  async applyCashback(user, amount) {
    user.referral.earnedCredits += amount;
    await user.save();
  }

  // Apply credit reward
  async applyCredits(user, amount) {
    user.referral.earnedCredits += amount;
    await user.save();
  }

  // Get user's referral statistics
  async getUserReferralStats(userId, options = {}) {
    try {
      const [stats, pendingRewards, conversionRates] = await Promise.all([
        Referral.getReferrerStats(userId, options),
        Referral.getPendingRewards(userId),
        Referral.getConversionRates(userId, options)
      ]);

      const statsData = stats[0] || {
        stats: [],
        totalReferrals: 0,
        totalSavingsGenerated: 0
      };

      const conversionData = conversionRates[0] || {
        totalReferrals: 0,
        completedReferrals: 0,
        completionRate: 0,
        purchaseConversionRate: 0
      };

      // Calculate pending rewards
      const pendingReferrerRewards = pendingRewards.filter(r => 
        r.referrerId.toString() === userId && !r.rewards.referrerReward.claimed
      );

      const pendingReferredRewards = pendingRewards.filter(r => 
        r.referredUserId.toString() === userId && !r.rewards.referredUserReward.claimed
      );

      return {
        overview: {
          totalReferrals: statsData.totalReferrals,
          completedReferrals: conversionData.completedReferrals,
          completionRate: Math.round(conversionData.completionRate * 100),
          totalSavingsGenerated: statsData.totalSavingsGenerated
        },
        breakdown: statsData.stats,
        conversion: {
          signupToCompletion: Math.round(conversionData.completionRate * 100),
          signupToPurchase: Math.round(conversionData.purchaseConversionRate * 100)
        },
        pendingRewards: {
          asReferrer: pendingReferrerRewards.length,
          asReferred: pendingReferredRewards.length,
          totalPendingValue: this.calculatePendingRewardValue(
            [...pendingReferrerRewards, ...pendingReferredRewards]
          )
        }
      };
    } catch (error) {
      Logger.error('Failed to get user referral stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // Calculate total value of pending rewards
  calculatePendingRewardValue(referrals) {
    return referrals.reduce((total, referral) => {
      const referrerReward = referral.rewards.referrerReward;
      const referredReward = referral.rewards.referredUserReward;
      
      let value = 0;
      
      if (!referrerReward.claimed && referrerReward.type === 'free_time') {
        value += referrerReward.amount * 2.99; // Assume Pro tier value
      }
      
      if (!referredReward.claimed && referredReward.type === 'free_time') {
        value += referredReward.amount * 2.99;
      }
      
      return total + value;
    }, 0);
  }

  // Get referral leaderboard
  async getLeaderboard(options = {}) {
    try {
      const leaderboard = await Referral.getLeaderboard(options);
      
      return leaderboard.map((entry, index) => ({
        rank: index + 1,
        userId: entry.userId,
        name: entry.name,
        totalReferrals: entry.totalReferrals,
        totalSavingsGenerated: entry.totalSavingsGenerated,
        avgUsageDays: Math.round(entry.avgUsageDays || 0),
        recentReferral: entry.recentReferral
      }));
    } catch (error) {
      Logger.error('Failed to get referral leaderboard', {
        error: error.message
      });
      throw error;
    }
  }

  // Process all pending referrals (background job)
  async processPendingReferrals() {
    try {
      // Update usage for all pending referrals
      const pendingReferrals = await Referral.find({
        status: 'pending',
        'conditions.expiresAt': { $gt: new Date() }
      });

      let processed = 0;
      let rewarded = 0;

      for (const referral of pendingReferrals) {
        try {
          // Update usage tracking
          await this.updateReferralUsage(referral.referredUserId);
          processed++;

          // Check if rewards can be processed
          const updatedReferral = await Referral.findById(referral._id);
          if (updatedReferral.canClaimRewards) {
            await this.processRewards(updatedReferral._id);
            rewarded++;
          }
        } catch (error) {
          Logger.warn('Failed to process individual referral', {
            referralId: referral._id,
            error: error.message
          });
        }
      }

      // Cleanup expired referrals
      const cleanupResult = await Referral.cleanupExpired();

      Logger.info('Pending referrals processed', {
        totalPending: pendingReferrals.length,
        processed,
        rewarded,
        expired: cleanupResult.modifiedCount
      });

      return {
        totalPending: pendingReferrals.length,
        processed,
        rewarded,
        expired: cleanupResult.modifiedCount
      };
    } catch (error) {
      Logger.error('Failed to process pending referrals', {
        error: error.message
      });
      throw error;
    }
  }

  // Validate referral code format
  validateReferralCode(code) {
    return /^[a-z0-9]{6,20}$/.test(code.toLowerCase());
  }

  // Check if referral code is available
  async isReferralCodeAvailable(code) {
    const existingUser = await User.findOne({ 'referral.code': code.toLowerCase() });
    return !existingUser;
  }

  // Generate analytics for admin dashboard
  async getAnalytics(options = {}) {
    try {
      const matchStage = {};
      
      if (options.dateFrom || options.dateTo) {
        matchStage.createdAt = {};
        if (options.dateFrom) {
          matchStage.createdAt.$gte = new Date(options.dateFrom);
        }
        if (options.dateTo) {
          matchStage.createdAt.$lte = new Date(options.dateTo);
        }
      }

      const analytics = await Referral.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            dailyReferrals: { $sum: 1 },
            dailyCompletions: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            dailySavings: { $sum: '$tracking.totalSavings' }
          }
        },
        {
          $project: {
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            dailyReferrals: 1,
            dailyCompletions: 1,
            dailySavings: 1,
            completionRate: {
              $cond: [
                { $gt: ['$dailyReferrals', 0] },
                { $divide: ['$dailyCompletions', '$dailyReferrals'] },
                0
              ]
            }
          }
        },
        { $sort: { date: -1 } },
        { $limit: options.limit || 30 }
      ]);

      return analytics;
    } catch (error) {
      Logger.error('Failed to get referral analytics', {
        error: error.message
      });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ReferralService();