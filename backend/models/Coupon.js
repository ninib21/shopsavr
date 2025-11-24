const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    trim: true,
    uppercase: true,
    maxlength: [50, 'Coupon code cannot exceed 50 characters']
  },
  domain: {
    type: String,
    required: [true, 'Domain is required'],
    lowercase: true,
    trim: true,
    index: true
  },
  title: {
    type: String,
    required: [true, 'Coupon title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed', 'shipping', 'bogo', 'other'],
    required: [true, 'Discount type is required'],
    index: true
  },
  discountValue: {
    type: Number,
    required: function() {
      return this.discountType === 'percentage' || this.discountType === 'fixed';
    },
    min: [0, 'Discount value cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.discountType === 'percentage') {
          return value <= 100;
        }
        return true;
      },
      message: 'Percentage discount cannot exceed 100%'
    }
  },
  minimumOrder: {
    type: Number,
    default: 0,
    min: [0, 'Minimum order cannot be negative']
  },
  maximumDiscount: {
    type: Number,
    default: null,
    min: [0, 'Maximum discount cannot be negative']
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: true
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  isExclusive: {
    type: Boolean,
    default: false
  },
  categories: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  excludedCategories: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  usageStats: {
    totalAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    successfulUses: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUsed: {
      type: Date,
      default: null
    },
    lastTested: {
      type: Date,
      default: Date.now
    }
  },
  source: {
    provider: {
      type: String,
      required: [true, 'Source provider is required'],
      trim: true
    },
    sourceId: {
      type: String,
      trim: true
    },
    confidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  terms: {
    type: String,
    trim: true,
    maxlength: [1000, 'Terms cannot exceed 1000 characters']
  },
  userRestrictions: {
    newUsersOnly: {
      type: Boolean,
      default: false
    },
    oneTimeUse: {
      type: Boolean,
      default: false
    },
    membershipRequired: {
      type: Boolean,
      default: false
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
couponSchema.index({ domain: 1, isActive: 1, expiresAt: 1 });
couponSchema.index({ domain: 1, discountType: 1, isActive: 1 });
couponSchema.index({ expiresAt: 1, isActive: 1 });
couponSchema.index({ 'usageStats.successfulUses': -1, 'usageStats.totalAttempts': 1 });
couponSchema.index({ createdAt: -1 });

// Virtual for success rate
couponSchema.virtual('successRate').get(function() {
  if (this.usageStats.totalAttempts === 0) {
    return 0;
  }
  return this.usageStats.successfulUses / this.usageStats.totalAttempts;
});

// Virtual for checking if coupon is expired
couponSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for checking if coupon is valid
couponSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired;
});

// Pre-save middleware to update lastUpdated
couponSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.source.lastUpdated = new Date();
  }
  next();
});

// Instance method to record usage attempt
couponSchema.methods.recordAttempt = function(successful = false) {
  this.usageStats.totalAttempts += 1;
  if (successful) {
    this.usageStats.successfulUses += 1;
    this.usageStats.lastUsed = new Date();
  }
  this.usageStats.lastTested = new Date();
  return this.save();
};

// Instance method to check if coupon applies to order
couponSchema.methods.appliesTo = function(orderData = {}) {
  const { amount = 0, categories = [], isNewUser = false, userId = null } = orderData;

  // Check if expired or inactive
  if (!this.isValid) {
    return { applies: false, reason: 'Coupon is expired or inactive' };
  }

  // Check minimum order amount
  if (amount < this.minimumOrder) {
    return { 
      applies: false, 
      reason: `Minimum order amount of $${this.minimumOrder} required` 
    };
  }

  // Check new user restriction
  if (this.userRestrictions.newUsersOnly && !isNewUser) {
    return { applies: false, reason: 'This coupon is for new users only' };
  }

  // Check category restrictions - only if categories are provided in the order
  if (this.categories.length > 0 && categories.length > 0) {
    const hasMatchingCategory = categories.some(cat => 
      this.categories.includes(cat.toLowerCase())
    );
    if (!hasMatchingCategory) {
      return { applies: false, reason: 'Coupon does not apply to these categories' };
    }
  }

  // Check excluded categories
  if (this.excludedCategories.length > 0) {
    const hasExcludedCategory = categories.some(cat => 
      this.excludedCategories.includes(cat.toLowerCase())
    );
    if (hasExcludedCategory) {
      return { applies: false, reason: 'Coupon cannot be used with these categories' };
    }
  }

  return { applies: true };
};

// Instance method to calculate discount amount
couponSchema.methods.calculateDiscount = function(orderAmount, orderData = {}) {
  // If orderData is not provided, create a basic one with just the amount
  const fullOrderData = {
    amount: orderAmount,
    categories: orderData.categories || [],
    isNewUser: orderData.isNewUser || false,
    ...orderData
  };

  if (!this.appliesTo(fullOrderData).applies) {
    return 0;
  }

  let discount = 0;

  switch (this.discountType) {
    case 'percentage':
      discount = (orderAmount * this.discountValue) / 100;
      break;
    case 'fixed':
      discount = this.discountValue;
      break;
    case 'shipping':
      // Shipping discount would need shipping amount passed in
      discount = 0; // Placeholder
      break;
    default:
      discount = 0;
  }

  // Apply maximum discount limit
  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  // Ensure discount doesn't exceed order amount
  return Math.min(discount, orderAmount);
};

// Static method to find active coupons for domain
couponSchema.statics.findActiveCoupons = function(domain, options = {}) {
  const query = {
    domain: domain.toLowerCase(),
    isActive: true,
    expiresAt: { $gt: new Date() }
  };

  if (options.discountType) {
    query.discountType = options.discountType;
  }

  if (options.categories && options.categories.length > 0) {
    query.$or = [
      { categories: { $size: 0 } }, // No category restrictions
      { categories: { $in: options.categories.map(cat => cat.toLowerCase()) } }
    ];
  }

  return this.find(query)
    .sort({ 'usageStats.successfulUses': -1, discountValue: -1 })
    .limit(options.limit || 50);
};

// Static method to find best coupon for order
couponSchema.statics.findBestCoupon = function(domain, orderData) {
  return this.findActiveCoupons(domain, {
    categories: orderData.categories,
    limit: 100
  }).then(coupons => {
    let bestCoupon = null;
    let maxDiscount = 0;

    for (const coupon of coupons) {
      const applicability = coupon.appliesTo(orderData);
      if (applicability.applies) {
        const discount = coupon.calculateDiscount(orderData.amount);
        if (discount > maxDiscount) {
          maxDiscount = discount;
          bestCoupon = coupon;
        }
      }
    }

    return { coupon: bestCoupon, discount: maxDiscount };
  });
};

// Static method to cleanup expired coupons
couponSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isActive: false
  });
};

// Static method to get domain statistics
couponSchema.statics.getDomainStats = function(domain) {
  return this.aggregate([
    { $match: { domain: domain.toLowerCase() } },
    {
      $group: {
        _id: '$domain',
        totalCoupons: { $sum: 1 },
        activeCoupons: {
          $sum: {
            $cond: [
              { $and: ['$isActive', { $gt: ['$expiresAt', new Date()] }] },
              1,
              0
            ]
          }
        },
        averageSuccessRate: {
          $avg: {
            $cond: [
              { $gt: ['$usageStats.totalAttempts', 0] },
              { $divide: ['$usageStats.successfulUses', '$usageStats.totalAttempts'] },
              0
            ]
          }
        },
        totalAttempts: { $sum: '$usageStats.totalAttempts' },
        totalSuccesses: { $sum: '$usageStats.successfulUses' }
      }
    }
  ]);
};

module.exports = mongoose.model('Coupon', couponSchema);