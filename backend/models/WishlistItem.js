const mongoose = require('mongoose');

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
    barcode: {
      type: String,
      trim: true,
      index: true
    },
    brand: {
      type: String,
      trim: true,
      maxlength: [100, 'Brand name cannot exceed 100 characters']
    },
    category: {
      type: String,
      trim: true,
      lowercase: true,
      maxlength: [50, 'Category cannot exceed 50 characters']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters']
    },
    image: {
      type: String,
      trim: true
    },
    imageUrl: {
      type: String,
      trim: true
    },
    productUrl: {
      type: String,
      trim: true
    }
  },
  pricing: {
    originalPrice: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currentPrice: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    lastPriceUpdate: {
      type: Date,
      default: Date.now
    }
  },
  tracking: {
    originalPrice: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currentPrice: {
      type: Number,
      min: [0, 'Price cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD',
      uppercase: true,
      maxlength: 3
    },
    lastPriceUpdate: {
      type: Date,
      default: Date.now
    },
    priceHistory: [{
      price: {
        type: Number,
        required: true,
        min: 0
      },
      date: {
        type: Date,
        default: Date.now
      },
      source: {
        type: String,
        default: 'system'
      }
    }],
    lastChecked: {
      type: Date,
      default: Date.now
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
  sources: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true,
      trim: true
    },
    domain: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    lastChecked: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['active', 'purchased', 'removed', 'out_of_stock'],
    default: 'active',
    index: true
  },
  alerts: {
    priceDropThreshold: {
      type: Number,
      default: 10,
      min: [0, 'Price drop threshold cannot be negative']
    },
    targetPrice: {
      type: Number,
      min: [0, 'Target price cannot be negative']
    },
    emailAlerts: {
      type: Boolean,
      default: true
    },
    pushAlerts: {
      type: Boolean,
      default: true
    }
  },

  metadata: {
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium'
    },
    tags: [{
      type: String,
      trim: true,
      lowercase: true
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    source: {
      type: String,
      enum: ['manual', 'extension', 'mobile', 'api'],
      default: 'manual'
    }
  },
  purchasePrice: {
    type: Number,
    min: [0, 'Purchase price cannot be negative']
  },
  purchasedAt: {
    type: Date
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
wishlistItemSchema.index({ userId: 1, 'metadata.priority': 1 });
wishlistItemSchema.index({ 'product.barcode': 1, userId: 1 });

// Virtual for savings amount
wishlistItemSchema.virtual('savingsAmount').get(function() {
  const originalPrice = this.tracking?.originalPrice || this.pricing?.originalPrice || 0;
  const currentPrice = this.tracking?.currentPrice || this.pricing?.currentPrice || 0;
  return Math.max(0, originalPrice - currentPrice);
});

// Virtual for savings percentage
wishlistItemSchema.virtual('savingsPercentage').get(function() {
  const originalPrice = this.tracking?.originalPrice || this.pricing?.originalPrice || 0;
  const currentPrice = this.tracking?.currentPrice || this.pricing?.currentPrice || 0;
  if (originalPrice === 0) return 0;
  return ((originalPrice - currentPrice) / originalPrice) * 100;
});

// Virtual for purchase savings
wishlistItemSchema.virtual('savings').get(function() {
  if (!this.purchasePrice) return 0;
  const originalPrice = this.tracking?.originalPrice || this.pricing?.originalPrice || 0;
  return Math.max(0, originalPrice - this.purchasePrice);
});

// Instance method to update price
wishlistItemSchema.methods.updatePrice = function(newPrice, source = 'system') {
  // Update both pricing and tracking if they exist
  if (this.pricing) {
    this.pricing.currentPrice = newPrice;
    this.pricing.lastPriceUpdate = new Date();
  }
  if (this.tracking) {
    this.tracking.currentPrice = newPrice;
    this.tracking.lastChecked = new Date();
    
    // Add to price history
    if (!this.tracking.priceHistory) this.tracking.priceHistory = [];
    this.tracking.priceHistory.push({
      price: newPrice,
      date: new Date(),
      source
    });
    
    // Keep only last 100 price history entries
    if (this.tracking.priceHistory.length > 100) {
      this.tracking.priceHistory = this.tracking.priceHistory.slice(-100);
    }
  }
  
  return this.save();
};

// Instance method to mark as purchased
wishlistItemSchema.methods.markAsPurchased = function(purchasePrice = null) {
  this.status = 'purchased';
  const currentPrice = this.tracking?.currentPrice || this.pricing?.currentPrice || 0;
  this.purchasePrice = purchasePrice || currentPrice;
  this.purchasedAt = new Date();
  if (this.tracking) {
    this.tracking.isTracking = false;
  }
  return this.save();
};

// Instance method to remove from wishlist
wishlistItemSchema.methods.remove = function() {
  this.status = 'removed';
  if (this.tracking) {
    this.tracking.isTracking = false;
  }
  return this.save();
};

// Suppress mongoose warning for remove method
wishlistItemSchema.method('remove', function() {
  this.status = 'removed';
  if (this.tracking) {
    this.tracking.isTracking = false;
  }
  return this.save();
}, { suppressWarning: true });

// Static method to get user wishlist
wishlistItemSchema.statics.getUserWishlist = function(userId, options = {}) {
  const {
    status = 'active',
    category,
    tags,
    priority,
    minPrice,
    maxPrice,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    limit = 50,
    skip = 0
  } = options;

  const query = { userId };
  
  if (status !== 'all') {
    if (Array.isArray(status)) {
      query.status = { $in: status };
    } else {
      query.status = status;
    }
  }
  
  if (category) {
    query['product.category'] = category.toLowerCase();
  }
  
  if (tags && tags.length > 0) {
    query['metadata.tags'] = { $in: tags.map(tag => tag.toLowerCase()) };
  }
  
  if (priority) {
    query['metadata.priority'] = priority;
  }
  
  if (minPrice !== undefined || maxPrice !== undefined) {
    query.$or = [
      {
        'pricing.currentPrice': {
          ...(minPrice !== undefined && { $gte: minPrice }),
          ...(maxPrice !== undefined && { $lte: maxPrice })
        }
      },
      {
        'tracking.currentPrice': {
          ...(minPrice !== undefined && { $gte: minPrice }),
          ...(maxPrice !== undefined && { $lte: maxPrice })
        }
      }
    ];
  }

  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  return this.find(query)
    .sort(sortOptions)
    .limit(Math.min(parseInt(limit) || 50, 100))
    .skip(parseInt(skip) || 0);
};

// Static method to get wishlist statistics
wishlistItemSchema.statics.getWishlistStats = function(userId, options = {}) {
  const { dateFrom, dateTo } = options;
  
  const matchStage = { userId: new mongoose.Types.ObjectId(userId) };
  
  if (dateFrom || dateTo) {
    matchStage.createdAt = {};
    if (dateFrom) matchStage.createdAt.$gte = new Date(dateFrom);
    if (dateTo) matchStage.createdAt.$lte = new Date(dateTo);
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalValue: { 
          $sum: { 
            $ifNull: ['$tracking.currentPrice', '$pricing.currentPrice'] 
          } 
        },
        totalSavings: { 
          $sum: { 
            $subtract: [
              { $ifNull: ['$tracking.originalPrice', '$pricing.originalPrice'] },
              { $ifNull: ['$tracking.currentPrice', '$pricing.currentPrice'] }
            ] 
          } 
        }
      }
    },
    {
      $group: {
        _id: null,
        breakdown: {
          $push: {
            status: '$_id',
            count: '$count',
            totalValue: '$totalValue',
            totalSavings: '$totalSavings'
          }
        },
        totalItems: { $sum: '$count' },
        totalValue: { $sum: '$totalValue' },
        totalSavings: { $sum: '$totalSavings' }
      }
    }
  ]);
};

// Static method to check if item exists for user
wishlistItemSchema.statics.itemExists = function(userId, barcode) {
  return this.findOne({
    userId,
    'product.barcode': barcode,
    status: { $ne: 'removed' }
  });
};

// Static method to get items needing price updates
wishlistItemSchema.statics.getItemsForPriceUpdate = function(options = {}) {
  const { limit = 100, frequency = 'daily' } = options;
  
  const cutoffTime = new Date();
  switch (frequency) {
    case 'hourly':
      cutoffTime.setHours(cutoffTime.getHours() - 1);
      break;
    case 'daily':
      cutoffTime.setDate(cutoffTime.getDate() - 1);
      break;
    case 'weekly':
      cutoffTime.setDate(cutoffTime.getDate() - 7);
      break;
  }

  return this.find({
    status: 'active',
    'tracking.checkFrequency': frequency,
    'tracking.lastChecked': { $lt: cutoffTime }
  })
  .limit(limit)
  .sort({ 'tracking.lastChecked': 1 });
};

module.exports = mongoose.model('WishlistItem', wishlistItemSchema);