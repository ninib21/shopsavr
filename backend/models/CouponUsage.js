const mongoose = require('mongoose');

const couponUsageSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  couponId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Coupon',
    required: [true, 'Coupon ID is required'],
    index: true
  },
  couponCode: {
    type: String,
    required: [true, 'Coupon code is required'],
    trim: true,
    uppercase: true
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  orderDetails: {
    originalAmount: {
      type: Number,
      required: [true, 'Original amount is required'],
      min: 0
    },
    discountAmount: {
      type: Number,
      required: [true, 'Discount amount is required'],
      min: 0
    },
    finalAmount: {
      type: Number,
      required: [true, 'Final amount is required'],
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    }
  },
  status: {
    type: String,
    enum: ['attempted', 'successful', 'failed', 'expired'],
    required: [true, 'Status is required'],
    index: true
  },
  failureReason: {
    type: String,
    trim: true,
    maxlength: [200, 'Failure reason cannot exceed 200 characters']
  },
  metadata: {
    userAgent: String,
    ipAddress: String,
    sessionId: String,
    platform: {
      type: String,
      enum: ['web', 'mobile', 'extension'],
      default: 'web'
    }
  },
  appliedAt: {
    type: Date,
    default: Date.now,
    index: true
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
couponUsageSchema.index({ userId: 1, appliedAt: -1 });
couponUsageSchema.index({ couponId: 1, status: 1, appliedAt: -1 });
couponUsageSchema.index({ domain: 1, status: 1, appliedAt: -1 });
couponUsageSchema.index({ appliedAt: -1 });

// Virtual for savings amount (same as discount amount)
couponUsageSchema.virtual('savingsAmount').get(function() {
  return this.orderDetails.discountAmount;
});

// Instance method to mark as successful
couponUsageSchema.methods.markSuccessful = function() {
  this.status = 'successful';
  return this.save();
};

// Instance method to mark as failed
couponUsageSchema.methods.markFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Static method to get user's coupon usage history
couponUsageSchema.statics.getUserHistory = function(userId, options = {}) {
  const query = { userId };
  
  if (options.domain) {
    query.domain = options.domain.toLowerCase();
  }
  
  if (options.status) {
    query.status = options.status;
  }

  if (options.dateFrom || options.dateTo) {
    query.appliedAt = {};
    if (options.dateFrom) {
      query.appliedAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      query.appliedAt.$lte = new Date(options.dateTo);
    }
  }

  return this.find(query)
    .populate('couponId', 'code title discountType discountValue')
    .sort({ appliedAt: -1 })
    .limit(options.limit || 50);
};

// Static method to get user's total savings
couponUsageSchema.statics.getUserSavings = function(userId, options = {}) {
  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    status: 'successful'
  };

  if (options.dateFrom || options.dateTo) {
    matchStage.appliedAt = {};
    if (options.dateFrom) {
      matchStage.appliedAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.appliedAt.$lte = new Date(options.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalSavings: { $sum: '$orderDetails.discountAmount' },
        totalOrders: { $sum: 1 },
        averageSavings: { $avg: '$orderDetails.discountAmount' },
        domains: { $addToSet: '$domain' }
      }
    }
  ]);
};

// Static method to get coupon performance statistics
couponUsageSchema.statics.getCouponStats = function(couponId, options = {}) {
  const matchStage = { couponId: new mongoose.Types.ObjectId(couponId) };

  if (options.dateFrom || options.dateTo) {
    matchStage.appliedAt = {};
    if (options.dateFrom) {
      matchStage.appliedAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.appliedAt.$lte = new Date(options.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalSavings: { $sum: '$orderDetails.discountAmount' }
      }
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: '$_id',
            count: '$count',
            totalSavings: '$totalSavings'
          }
        },
        totalAttempts: { $sum: '$count' }
      }
    }
  ]);
};

// Static method to get domain usage statistics
couponUsageSchema.statics.getDomainUsageStats = function(domain, options = {}) {
  const matchStage = { 
    domain: domain.toLowerCase(),
    status: 'successful'
  };

  if (options.dateFrom || options.dateTo) {
    matchStage.appliedAt = {};
    if (options.dateFrom) {
      matchStage.appliedAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.appliedAt.$lte = new Date(options.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          year: { $year: '$appliedAt' },
          month: { $month: '$appliedAt' },
          day: { $dayOfMonth: '$appliedAt' }
        },
        dailySavings: { $sum: '$orderDetails.discountAmount' },
        dailyUsage: { $sum: 1 },
        uniqueUsers: { $addToSet: '$userId' }
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
        dailySavings: 1,
        dailyUsage: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { date: -1 } },
    { $limit: options.limit || 30 }
  ]);
};

// Static method to check if user has used coupon before
couponUsageSchema.statics.hasUserUsedCoupon = function(userId, couponId) {
  return this.findOne({
    userId: new mongoose.Types.ObjectId(userId),
    couponId: new mongoose.Types.ObjectId(couponId),
    status: 'successful'
  });
};

// Static method to get top performing coupons
couponUsageSchema.statics.getTopCoupons = function(options = {}) {
  const matchStage = { status: 'successful' };

  if (options.domain) {
    matchStage.domain = options.domain.toLowerCase();
  }

  if (options.dateFrom || options.dateTo) {
    matchStage.appliedAt = {};
    if (options.dateFrom) {
      matchStage.appliedAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      matchStage.appliedAt.$lte = new Date(options.dateTo);
    }
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$couponId',
        couponCode: { $first: '$couponCode' },
        domain: { $first: '$domain' },
        totalUsage: { $sum: 1 },
        totalSavings: { $sum: '$orderDetails.discountAmount' },
        averageSavings: { $avg: '$orderDetails.discountAmount' },
        uniqueUsers: { $addToSet: '$userId' }
      }
    },
    {
      $project: {
        couponCode: 1,
        domain: 1,
        totalUsage: 1,
        totalSavings: 1,
        averageSavings: 1,
        uniqueUserCount: { $size: '$uniqueUsers' }
      }
    },
    { $sort: { totalSavings: -1 } },
    { $limit: options.limit || 20 }
  ]);
};

module.exports = mongoose.model('CouponUsage', couponUsageSchema);