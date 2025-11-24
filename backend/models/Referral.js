const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema({
  referrerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referrer ID is required'],
    index: true
  },
  referredUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Referred user ID is required'],
    index: true
  },
  referralCode: {
    type: String,
    required: [true, 'Referral code is required'],
    trim: true,
    lowercase: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'pending',
    index: true
  },
  rewards: {
    referrerReward: {
      type: {
        type: String,
        enum: ['free_time', 'cashback', 'credits'],
        default: 'free_time'
      },
      amount: {
        type: Number,
        default: 7 // 7 days of free Pro
      },
      unit: {
        type: String,
        enum: ['days', 'dollars', 'credits'],
        default: 'days'
      },
      claimed: {
        type: Boolean,
        default: false
      },
      claimedAt: {
        type: Date,
        default: null
      }
    },
    referredUserReward: {
      type: {
        type: String,
        enum: ['free_time', 'cashback', 'credits'],
        default: 'free_time'
      },
      amount: {
        type: Number,
        default: 7 // 7 days of free Pro
      },
      unit: {
        type: String,
        enum: ['days', 'dollars', 'credits'],
        default: 'days'
      },
      claimed: {
        type: Boolean,
        default: false
      },
      claimedAt: {
        type: Date,
        default: null
      }
    }
  },
  conditions: {
    requiresSubscription: {
      type: Boolean,
      default: false
    },
    requiresMinimumUsage: {
      type: Boolean,
      default: true
    },
    minimumUsageDays: {
      type: Number,
      default: 7
    },
    expiresAt: {
      type: Date,
      default: function() {
        return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      }
    }
  },
  tracking: {
    signupDate: {
      type: Date,
      default: Date.now
    },
    firstPurchaseDate: {
      type: Date,
      default: null
    },
    activationDate: {
      type: Date,
      default: null
    },
    usageDays: {
      type: Number,
      default: 0
    },
    totalSavings: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    source: {
      type: String,
      enum: ['direct_link', 'social_media', 'email', 'sms', 'other'],
      default: 'direct_link'
    },
    campaign: {
      type: String,
      trim: true,
      maxlength: 100
    },
    userAgent: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
    },
    referrerPlatform: {
      type: String,
      enum: ['web', 'mobile', 'extension'],
      default: 'web'
    }
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for performance
referralSchema.index({ referrerId: 1, status: 1, createdAt: -1 });
referralSchema.index({ referredUserId: 1, status: 1 });
referralSchema.index({ referralCode: 1, status: 1 });
referralSchema.index({ status: 1, 'conditions.expiresAt': 1 });
referralSchema.index({ createdAt: -1 });

// Virtual for checking if referral is expired
referralSchema.virtual('isExpired').get(function() {
  return new Date() > this.conditions.expiresAt;
});

// Virtual for checking if conditions are met
referralSchema.virtual('conditionsMet').get(function() {
  if (this.conditions.requiresSubscription && !this.tracking.firstPurchaseDate) {
    return false;
  }
  
  if (this.conditions.requiresMinimumUsage && 
      this.tracking.usageDays < this.conditions.minimumUsageDays) {
    return false;
  }
  
  return true;
});

// Virtual for checking if rewards can be claimed
referralSchema.virtual('canClaimRewards').get(function() {
  return this.status === 'pending' && 
         this.conditionsMet && 
         !this.isExpired;
});

// Pre-save middleware to update status
referralSchema.pre('save', function(next) {
  // Auto-complete referral if conditions are met
  if (this.status === 'pending' && this.conditionsMet && !this.isExpired) {
    this.status = 'completed';
    this.tracking.activationDate = new Date();
  }
  
  // Auto-cancel if expired
  if (this.status === 'pending' && this.isExpired) {
    this.status = 'cancelled';
  }
  
  next();
});

// Instance method to claim referrer reward
referralSchema.methods.claimReferrerReward = async function() {
  if (!this.canClaimRewards || this.rewards.referrerReward.claimed) {
    throw new Error('Referrer reward cannot be claimed');
  }
  
  this.rewards.referrerReward.claimed = true;
  this.rewards.referrerReward.claimedAt = new Date();
  
  return this.save();
};

// Instance method to claim referred user reward
referralSchema.methods.claimReferredUserReward = async function() {
  if (!this.canClaimRewards || this.rewards.referredUserReward.claimed) {
    throw new Error('Referred user reward cannot be claimed');
  }
  
  this.rewards.referredUserReward.claimed = true;
  this.rewards.referredUserReward.claimedAt = new Date();
  
  return this.save();
};

// Instance method to update usage tracking
referralSchema.methods.updateUsageTracking = function(usageDays, totalSavings) {
  this.tracking.usageDays = usageDays;
  this.tracking.totalSavings = totalSavings || this.tracking.totalSavings;
  
  return this.save();
};

// Instance method to record first purchase
referralSchema.methods.recordFirstPurchase = function() {
  if (!this.tracking.firstPurchaseDate) {
    this.tracking.firstPurchaseDate = new Date();
  }
  
  return this.save();
};

// Static method to find referral by code and referred user
referralSchema.statics.findByCodeAndUser = function(referralCode, referredUserId) {
  return this.findOne({
    referralCode: referralCode.toLowerCase(),
    referredUserId,
    status: { $ne: 'cancelled' }
  });
};

// Static method to get referrer's referral statistics
referralSchema.statics.getReferrerStats = function(referrerId, options = {}) {
  const matchStage = { referrerId: new mongoose.Types.ObjectId(referrerId) };
  
  if (options.dateFrom || options.dateTo) {
    matchStage.createdAt = {};
    if (options.dateFrom) {
      matchStage.createdAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.createdAt.$lte = new Date(options.dateTo);
    }
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSavings: { $sum: '$tracking.totalSavings' },
        avgUsageDays: { $avg: '$tracking.usageDays' }
      }
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: '$_id',
            count: '$count',
            totalSavings: '$totalSavings',
            avgUsageDays: '$avgUsageDays'
          }
        },
        totalReferrals: { $sum: '$count' },
        totalSavingsGenerated: { $sum: '$totalSavings' }
      }
    }
  ]);
};

// Static method to get pending rewards for user
referralSchema.statics.getPendingRewards = function(userId) {
  return this.find({
    $or: [
      { referrerId: userId },
      { referredUserId: userId }
    ],
    status: 'completed',
    $or: [
      { 'rewards.referrerReward.claimed': false, referrerId: userId },
      { 'rewards.referredUserReward.claimed': false, referredUserId: userId }
    ]
  }).populate('referrerId referredUserId', 'profile.name email');
};

// Static method to get referral leaderboard
referralSchema.statics.getLeaderboard = function(options = {}) {
  const matchStage = { status: 'completed' };
  
  if (options.dateFrom || options.dateTo) {
    matchStage.createdAt = {};
    if (options.dateFrom) {
      matchStage.createdAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.createdAt.$lte = new Date(options.dateTo);
    }
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$referrerId',
        totalReferrals: { $sum: 1 },
        totalSavingsGenerated: { $sum: '$tracking.totalSavings' },
        avgUsageDays: { $avg: '$tracking.usageDays' },
        recentReferral: { $max: '$createdAt' }
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
        totalReferrals: 1,
        totalSavingsGenerated: 1,
        avgUsageDays: 1,
        recentReferral: 1
      }
    },
    { $sort: { totalReferrals: -1, totalSavingsGenerated: -1 } },
    { $limit: options.limit || 50 }
  ]);
};

// Static method to cleanup expired referrals
referralSchema.statics.cleanupExpired = function() {
  return this.updateMany(
    {
      status: 'pending',
      'conditions.expiresAt': { $lt: new Date() }
    },
    {
      $set: { status: 'cancelled' }
    }
  );
};

// Static method to get referral conversion rates
referralSchema.statics.getConversionRates = function(referrerId, options = {}) {
  const matchStage = { referrerId: new mongoose.Types.ObjectId(referrerId) };
  
  if (options.dateFrom || options.dateTo) {
    matchStage.createdAt = {};
    if (options.dateFrom) {
      matchStage.createdAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.createdAt.$lte = new Date(options.dateTo);
    }
  }
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalReferrals: { $sum: 1 },
        completedReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        pendingReferrals: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
        referralsWithPurchase: {
          $sum: { $cond: [{ $ne: ['$tracking.firstPurchaseDate', null] }, 1, 0] }
        }
      }
    },
    {
      $project: {
        totalReferrals: 1,
        completedReferrals: 1,
        cancelledReferrals: 1,
        pendingReferrals: 1,
        referralsWithPurchase: 1,
        completionRate: {
          $cond: [
            { $gt: ['$totalReferrals', 0] },
            { $divide: ['$completedReferrals', '$totalReferrals'] },
            0
          ]
        },
        purchaseConversionRate: {
          $cond: [
            { $gt: ['$totalReferrals', 0] },
            { $divide: ['$referralsWithPurchase', '$totalReferrals'] },
            0
          ]
        }
      }
    }
  ]);
};

module.exports = mongoose.model('Referral', referralSchema);