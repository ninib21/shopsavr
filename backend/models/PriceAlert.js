const mongoose = require('mongoose');

const priceAlertSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  wishlistItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WishlistItem',
    required: [true, 'Wishlist item ID is required'],
    index: true
  },
  alertType: {
    type: String,
    enum: ['price_drop', 'target_price', 'back_in_stock', 'price_increase'],
    required: [true, 'Alert type is required'],
    index: true
  },
  trigger: {
    previousPrice: {
      type: Number,
      min: 0
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: 0
    },
    targetPrice: {
      type: Number,
      min: 0
    },
    dropPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    dropAmount: {
      type: Number,
      min: 0
    }
  },
  product: {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    brand: {
      type: String,
      trim: true
    },
    image: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  source: {
    name: {
      type: String,
      required: [true, 'Source name is required'],
      trim: true
    },
    domain: {
      type: String,
      required: [true, 'Source domain is required'],
      lowercase: true,
      trim: true
    },
    url: {
      type: String,
      trim: true
    }
  },
  notification: {
    email: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      attempts: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    push: {
      sent: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      attempts: {
        type: Number,
        default: 0,
        min: 0
      }
    },
    inApp: {
      read: {
        type: Boolean,
        default: false
      },
      readAt: {
        type: Date,
        default: null
      }
    }
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'dismissed'],
    default: 'pending',
    index: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    },
    index: true
  },
  metadata: {
    platform: {
      type: String,
      enum: ['web', 'mobile', 'extension'],
      default: 'web'
    },
    userAgent: {
      type: String,
      trim: true
    },
    ipAddress: {
      type: String,
      trim: true
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
priceAlertSchema.index({ userId: 1, status: 1, createdAt: -1 });
priceAlertSchema.index({ wishlistItemId: 1, alertType: 1 });
priceAlertSchema.index({ status: 1, expiresAt: 1 });
priceAlertSchema.index({ createdAt: -1 });

// Virtual for checking if alert is expired
priceAlertSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for savings amount (for price drop alerts)
priceAlertSchema.virtual('savingsAmount').get(function() {
  if (this.alertType === 'price_drop' && this.trigger.previousPrice) {
    return this.trigger.previousPrice - this.trigger.currentPrice;
  }
  return 0;
});

// Virtual for formatted alert message
priceAlertSchema.virtual('alertMessage').get(function() {
  const productName = this.product.name;
  const currentPrice = `$${this.trigger.currentPrice.toFixed(2)}`;
  
  switch (this.alertType) {
    case 'price_drop':
      const dropPercentage = this.trigger.dropPercentage?.toFixed(1) || '0';
      return `${productName} price dropped ${dropPercentage}% to ${currentPrice}`;
    
    case 'target_price':
      return `${productName} reached your target price of ${currentPrice}`;
    
    case 'back_in_stock':
      return `${productName} is back in stock at ${currentPrice}`;
    
    case 'price_increase':
      const increasePercentage = this.trigger.dropPercentage?.toFixed(1) || '0';
      return `${productName} price increased ${increasePercentage}% to ${currentPrice}`;
    
    default:
      return `Price alert for ${productName}: ${currentPrice}`;
  }
});

// Pre-save middleware to set priority based on alert type and savings
priceAlertSchema.pre('save', function(next) {
  if (this.isNew) {
    // Set priority based on alert type and savings amount
    if (this.alertType === 'target_price') {
      this.priority = 'high';
    } else if (this.alertType === 'price_drop') {
      const dropPercentage = this.trigger.dropPercentage || 0;
      if (dropPercentage >= 50) {
        this.priority = 'urgent';
      } else if (dropPercentage >= 25) {
        this.priority = 'high';
      } else if (dropPercentage >= 10) {
        this.priority = 'medium';
      } else {
        this.priority = 'low';
      }
    }
  }
  next();
});

// Instance method to mark email as sent
priceAlertSchema.methods.markEmailSent = function() {
  this.notification.email.sent = true;
  this.notification.email.sentAt = new Date();
  this.notification.email.attempts += 1;
  
  // Update overall status if both email and push are sent (or not required)
  if (this.notification.push.sent || !this.notification.push.attempts) {
    this.status = 'sent';
  }
  
  return this.save();
};

// Instance method to mark push notification as sent
priceAlertSchema.methods.markPushSent = function() {
  this.notification.push.sent = true;
  this.notification.push.sentAt = new Date();
  this.notification.push.attempts += 1;
  
  // Update overall status if both email and push are sent (or not required)
  if (this.notification.email.sent || !this.notification.email.attempts) {
    this.status = 'sent';
  }
  
  return this.save();
};

// Instance method to mark as read
priceAlertSchema.methods.markAsRead = function() {
  this.notification.inApp.read = true;
  this.notification.inApp.readAt = new Date();
  return this.save();
};

// Instance method to mark as dismissed
priceAlertSchema.methods.dismiss = function() {
  this.status = 'dismissed';
  return this.save();
};

// Instance method to increment notification attempts
priceAlertSchema.methods.incrementAttempts = function(type) {
  if (type === 'email') {
    this.notification.email.attempts += 1;
  } else if (type === 'push') {
    this.notification.push.attempts += 1;
  }
  
  // Mark as failed if too many attempts
  const maxAttempts = 3;
  if (this.notification.email.attempts >= maxAttempts && 
      this.notification.push.attempts >= maxAttempts) {
    this.status = 'failed';
  }
  
  return this.save();
};

// Static method to get pending alerts for processing
priceAlertSchema.statics.getPendingAlerts = function(options = {}) {
  const query = {
    status: 'pending',
    expiresAt: { $gt: new Date() }
  };
  
  if (options.alertType) {
    query.alertType = options.alertType;
  }
  
  if (options.priority) {
    query.priority = options.priority;
  }
  
  return this.find(query)
    .populate('userId', 'email profile.name settings')
    .populate('wishlistItemId', 'product sources')
    .sort({ priority: -1, createdAt: 1 })
    .limit(options.limit || 100);
};

// Static method to get user's alerts
priceAlertSchema.statics.getUserAlerts = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  }
  
  if (options.alertType) {
    query.alertType = options.alertType;
  }
  
  if (options.unreadOnly) {
    query['notification.inApp.read'] = false;
  }
  
  if (options.dateFrom || options.dateTo) {
    query.createdAt = {};
    if (options.dateFrom) {
      query.createdAt.$gte = new Date(options.dateFrom);
    }
    if (options.dateTo) {
      query.createdAt.$lte = new Date(options.dateTo);
    }
  }
  
  return this.find(query)
    .populate('wishlistItemId', 'product sources')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Static method to cleanup expired alerts
priceAlertSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    status: { $in: ['sent', 'dismissed', 'failed'] }
  });
};

// Static method to get alert statistics
priceAlertSchema.statics.getAlertStats = function(userId, options = {}) {
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
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
        _id: {
          alertType: '$alertType',
          status: '$status'
        },
        count: { $sum: 1 },
        avgSavings: { $avg: '$trigger.dropAmount' }
      }
    },
    {
      $group: {
        _id: '$_id.alertType',
        statusBreakdown: {
          $push: {
            status: '$_id.status',
            count: '$count'
          }
        },
        totalCount: { $sum: '$count' },
        avgSavings: { $avg: '$avgSavings' }
      }
    }
  ]);
};

// Static method to create price drop alert
priceAlertSchema.statics.createPriceDropAlert = function(alertData) {
  const {
    userId,
    wishlistItemId,
    product,
    source,
    previousPrice,
    currentPrice,
    metadata = {}
  } = alertData;
  
  const dropAmount = previousPrice - currentPrice;
  const dropPercentage = (dropAmount / previousPrice) * 100;
  
  return this.create({
    userId,
    wishlistItemId,
    alertType: 'price_drop',
    trigger: {
      previousPrice,
      currentPrice,
      dropAmount,
      dropPercentage
    },
    product,
    source,
    metadata
  });
};

// Static method to create target price alert
priceAlertSchema.statics.createTargetPriceAlert = function(alertData) {
  const {
    userId,
    wishlistItemId,
    product,
    source,
    targetPrice,
    currentPrice,
    metadata = {}
  } = alertData;
  
  return this.create({
    userId,
    wishlistItemId,
    alertType: 'target_price',
    trigger: {
      targetPrice,
      currentPrice
    },
    product,
    source,
    metadata,
    priority: 'high'
  });
};

module.exports = mongoose.model('PriceAlert', priceAlertSchema);