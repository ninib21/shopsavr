const mongoose = require('mongoose');

const priceHistorySchema = new mongoose.Schema({
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD',
    uppercase: true,
    maxlength: 3
  },
  source: {
    type: String,
    required: true,
    trim: true
  },
  url: {
    type: String,
    trim: true
  },
  availability: {
    type: String,
    enum: ['in_stock', 'out_of_stock', 'limited', 'unknown'],
    default: 'unknown'
  },
  recordedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, { _id: false });

const wishlistItemSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true
  },
  product: {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      maxlength: [200, 'Product name cannot exceed 200 characters']
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    model: {
      type: String,
      trim: true,
      maxlength: [100, 'Model cannot exceed 100 characters']
    },
    barcode: {
      type: String,
      trim: true,
      sparse: true, // Allow multiple null values but unique non-null values
      index: true
    },
    sku: {
      type: String,
      trim: true,
      maxlength: [100, 'SKU cannot exceed 100 characters']
    },
    image: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Image must be a valid URL'
      }
    },
    images: [{
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Image must be a valid URL'
      }
    }],
    category: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    subcategory: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Subcategory cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    specifications: {
      type: Map,
      of: String,
      default: new Map()
    }
  },
  tracking: {
    originalPrice: {
      type: Number,
      required: [true, 'Original price is required'],
      min: 0
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: 0
    },
    lowestPrice: {
      type: Number,
      min: 0
    },
    highestPrice: {
      type: Number,
      min: 0
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    priceHistory: [priceHistorySchema],
    lastChecked: {
      type: Date,
      default: Date.now,
      index: true
    },
    checkFrequency: {
      type: String,
      enum: ['hourly', 'daily', 'weekly'],
      default: 'daily'
    },
    isTracking: {
      type: Boolean,
      default: true
    }
  },
  alerts: {
    priceDropThreshold: {
      type: Number,
      min: 0,
      max: 100,
      default: 10 // 10% price drop
    },
    targetPrice: {
      type: Number,
      min: 0
    },
    enabled: {
      type: Boolean,
      default: true
    },
    emailAlerts: {
      type: Boolean,
      default: true
    },
    pushAlerts: {
      type: Boolean,
      default: true
    },
    lastAlertSent: {
      type: Date,
      default: null
    }
  },
  sources: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function(v) {
          return /^https?:\/\/.+/.test(v);
        },
        message: 'Source URL must be valid'
      }
    },
    domain: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    price: {
      type: Number,
      min: 0
    },
    availability: {
      type: String,
      enum: ['in_stock', 'out_of_stock', 'limited', 'unknown'],
      default: 'unknown'
    },
    lastChecked: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  metadata: {
    addedFrom: {
      type: String,
      enum: ['manual', 'barcode_scan', 'url_import', 'extension', 'mobile_app'],
      default: 'manual'
    },
    platform: {
      type: String,
      enum: ['web', 'mobile', 'extension'],
      default: 'web'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true,
      maxlength: 30
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    }
  },
  status: {
    type: String,
    enum: ['active', 'purchased', 'removed', 'unavailable'],
    default: 'active',
    index: true
  },
  purchasedAt: {
    type: Date,
    default: null
  },
  purchasePrice: {
    type: Number,
    min: 0,
    default: null
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
wishlistItemSchema.index({ userId: 1, status: 1, createdAt: -1 });
wishlistItemSchema.index({ userId: 1, 'product.category': 1 });
wishlistItemSchema.index({ 'product.barcode': 1 }, { sparse: true });
wishlistItemSchema.index({ 'tracking.lastChecked': 1, 'tracking.isTracking': 1 });
wishlistItemSchema.index({ 'alerts.enabled': 1, 'tracking.currentPrice': 1 });

// Virtual for price change percentage
wishlistItemSchema.virtual('priceChangePercentage').get(function() {
  if (this.tracking.originalPrice === 0) return 0;
  return ((this.tracking.currentPrice - this.tracking.originalPrice) / this.tracking.originalPrice) * 100;
});

// Virtual for savings amount
wishlistItemSchema.virtual('savingsAmount').get(function() {
  return Math.max(0, this.tracking.originalPrice - this.tracking.currentPrice);
});

// Virtual for checking if price dropped
wishlistItemSchema.virtual('hasPriceDropped').get(function() {
  return this.tracking.currentPrice < this.tracking.originalPrice;
});

// Virtual for checking if target price is met
wishlistItemSchema.virtual('isTargetPriceMet').get(function() {
  return this.alerts.targetPrice && this.tracking.currentPrice <= this.alerts.targetPrice;
});

// Virtual for checking if price drop threshold is met
wishlistItemSchema.virtual('isPriceDropThresholdMet').get(function() {
  const dropPercentage = Math.abs(this.priceChangePercentage);
  return dropPercentage >= this.alerts.priceDropThreshold;
});

// Pre-save middleware to update price tracking
wishlistItemSchema.pre('save', function(next) {
  // Update lowest and highest prices
  if (this.tracking.lowestPrice === undefined || this.tracking.currentPrice < this.tracking.lowestPrice) {
    this.tracking.lowestPrice = this.tracking.currentPrice;
  }
  
  if (this.tracking.highestPrice === undefined || this.tracking.currentPrice > this.tracking.highestPrice) {
    this.tracking.highestPrice = this.tracking.currentPrice;
  }

  // Limit price history to last 100 entries
  if (this.tracking.priceHistory.length > 100) {
    this.tracking.priceHistory = this.tracking.priceHistory.slice(-100);
  }

  next();
});

// Instance method to add price history entry
wishlistItemSchema.methods.addPriceHistory = function(priceData) {
  const { price, source, url, availability = 'unknown' } = priceData;
  
  this.tracking.priceHistory.push({
    price,
    currency: this.tracking.currency,
    source,
    url,
    availability,
    recordedAt: new Date()
  });

  // Update current price if this is the most recent entry
  this.tracking.currentPrice = price;
  this.tracking.lastChecked = new Date();

  return this.save();
};

// Instance method to update price
wishlistItemSchema.methods.updatePrice = async function(newPrice, source, options = {}) {
  const oldPrice = this.tracking.currentPrice;
  
  // Add to price history (this saves the document)
  await this.addPriceHistory({
    price: newPrice,
    source,
    url: options.url,
    availability: options.availability
  });

  // Check if alert should be triggered
  const shouldAlert = this.shouldTriggerAlert(oldPrice, newPrice);
  
  return { shouldAlert, oldPrice, newPrice };
};

// Instance method to check if alert should be triggered
wishlistItemSchema.methods.shouldTriggerAlert = function(oldPrice, newPrice) {
  if (!this.alerts.enabled) return false;
  
  // Check target price
  if (this.alerts.targetPrice && newPrice <= this.alerts.targetPrice) {
    return true;
  }
  
  // Check price drop threshold
  if (oldPrice > 0) {
    const dropPercentage = ((oldPrice - newPrice) / oldPrice) * 100;
    if (dropPercentage >= this.alerts.priceDropThreshold) {
      return true;
    }
  }
  
  return false;
};

// Instance method to mark as purchased
wishlistItemSchema.methods.markAsPurchased = function(purchasePrice) {
  this.status = 'purchased';
  this.purchasedAt = new Date();
  this.purchasePrice = purchasePrice || this.tracking.currentPrice;
  this.tracking.isTracking = false;
  return this.save();
};

// Instance method to add source
wishlistItemSchema.methods.addSource = function(sourceData) {
  const { name, url, domain, price, availability = 'unknown' } = sourceData;
  
  // Check if source already exists
  const existingSource = this.sources.find(s => s.domain === domain.toLowerCase());
  
  if (existingSource) {
    existingSource.price = price;
    existingSource.availability = availability;
    existingSource.lastChecked = new Date();
    existingSource.isActive = true;
  } else {
    this.sources.push({
      name,
      url,
      domain: domain.toLowerCase(),
      price,
      availability,
      lastChecked: new Date(),
      isActive: true
    });
  }
  
  return this.save();
};

// Instance method to remove source
wishlistItemSchema.methods.removeSource = function(domain) {
  this.sources = this.sources.filter(s => s.domain !== domain.toLowerCase());
  return this.save();
};

// Static method to get user's wishlist with filters
wishlistItemSchema.statics.getUserWishlist = function(userId, options = {}) {
  const query = { userId };
  
  if (options.status) {
    query.status = options.status;
  } else {
    query.status = { $ne: 'removed' }; // Exclude removed items by default
  }
  
  if (options.category) {
    query['product.category'] = options.category.toLowerCase();
  }
  
  if (options.tags && options.tags.length > 0) {
    query['metadata.tags'] = { $in: options.tags.map(tag => tag.toLowerCase()) };
  }
  
  if (options.priority) {
    query['metadata.priority'] = options.priority;
  }

  if (options.priceRange) {
    const { min, max } = options.priceRange;
    if (min !== undefined) query['tracking.currentPrice'] = { $gte: min };
    if (max !== undefined) {
      query['tracking.currentPrice'] = { 
        ...query['tracking.currentPrice'], 
        $lte: max 
      };
    }
  }

  let queryBuilder = this.find(query);
  
  // Sorting
  const sortOptions = {
    'recent': { createdAt: -1 },
    'price_low': { 'tracking.currentPrice': 1 },
    'price_high': { 'tracking.currentPrice': -1 },
    'name': { 'product.name': 1 },
    'priority': { 'metadata.priority': -1, createdAt: -1 }
  };
  
  const sortBy = options.sortBy || 'recent';
  queryBuilder = queryBuilder.sort(sortOptions[sortBy] || sortOptions.recent);
  
  // Pagination
  if (options.limit) {
    queryBuilder = queryBuilder.limit(parseInt(options.limit));
  }
  
  if (options.skip) {
    queryBuilder = queryBuilder.skip(parseInt(options.skip));
  }
  
  return queryBuilder;
};

// Static method to get items needing price updates
wishlistItemSchema.statics.getItemsForPriceUpdate = function(options = {}) {
  const now = new Date();
  const query = {
    status: 'active',
    'tracking.isTracking': true
  };

  // Calculate cutoff time based on check frequency
  const cutoffTimes = {
    hourly: new Date(now.getTime() - 60 * 60 * 1000),
    daily: new Date(now.getTime() - 24 * 60 * 60 * 1000),
    weekly: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  };

  if (options.frequency) {
    query['tracking.checkFrequency'] = options.frequency;
    query['tracking.lastChecked'] = { $lt: cutoffTimes[options.frequency] };
  } else {
    // Get items that need checking based on their individual frequency
    query.$or = Object.keys(cutoffTimes).map(freq => ({
      'tracking.checkFrequency': freq,
      'tracking.lastChecked': { $lt: cutoffTimes[freq] }
    }));
  }

  return this.find(query)
    .sort({ 'tracking.lastChecked': 1 })
    .limit(options.limit || 100);
};

// Static method to get price drop alerts
wishlistItemSchema.statics.getPriceDropAlerts = function(userId) {
  return this.find({
    userId,
    status: 'active',
    'alerts.enabled': true,
    $or: [
      { 
        'alerts.targetPrice': { $exists: true },
        'tracking.currentPrice': { $lte: this.alerts.targetPrice }
      },
      {
        $expr: {
          $gte: [
            {
              $multiply: [
                { $divide: [
                  { $subtract: ['$tracking.originalPrice', '$tracking.currentPrice'] },
                  '$tracking.originalPrice'
                ]},
                100
              ]
            },
            '$alerts.priceDropThreshold'
          ]
        }
      }
    ]
  });
};

// Static method to get wishlist statistics
wishlistItemSchema.statics.getUserWishlistStats = function(userId) {
  return this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { $sum: '$tracking.currentPrice' },
        avgPrice: { $avg: '$tracking.currentPrice' }
      }
    },
    {
      $group: {
        _id: null,
        stats: {
          $push: {
            status: '$_id',
            count: '$count',
            totalValue: '$totalValue',
            avgPrice: '$avgPrice'
          }
        },
        totalItems: { $sum: '$count' },
        totalValue: { $sum: '$totalValue' }
      }
    }
  ]);
};

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);