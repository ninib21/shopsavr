const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId; // Password required only if not using Google OAuth
    },
    minlength: [6, 'Password must be at least 6 characters long'],
    select: false // Don't include password in queries by default
  },
  googleId: {
    type: String,
    sparse: true // Allow multiple null values but unique non-null values
  },
  profile: {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      default: null
    }
  },
  subscription: {
    tier: {
      type: String,
      enum: ['free', 'pro', 'pro_max'],
      default: 'free'
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired'],
      default: 'active'
    },
    stripeCustomerId: {
      type: String,
      default: null
    },
    subscriptionId: {
      type: String,
      default: null
    },
    expiresAt: {
      type: Date,
      default: null
    }
  },
  savings: {
    totalSaved: {
      type: Number,
      default: 0,
      min: 0
    },
    lifetimeSavings: {
      type: Number,
      default: 0,
      min: 0
    },
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  referral: {
    code: {
      type: String,
      unique: true,
      sparse: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    referralCount: {
      type: Number,
      default: 0,
      min: 0
    },
    earnedCredits: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    emailAlerts: {
      type: Boolean,
      default: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'referral.code': 1 });
userSchema.index({ googleId: 1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified and exists
  if (!this.isModified('password') || !this.password) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to generate referral code
userSchema.pre('save', function(next) {
  if (this.isNew && !this.referral.code) {
    this.referral.code = this.generateReferralCode();
  }
  next();
});

// Instance method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) {
    return false;
  }
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function() {
  const payload = {
    userId: this._id,
    email: this.email,
    tier: this.subscription.tier
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function() {
  const payload = {
    userId: this._id,
    type: 'refresh'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d'
  });
};

// Instance method to generate referral code
userSchema.methods.generateReferralCode = function() {
  const name = this.profile.name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${name}${randomSuffix}`;
};

// Instance method to check if user has pro features
userSchema.methods.hasProFeatures = function() {
  return this.subscription.tier !== 'free' && 
         this.subscription.status === 'active' &&
         (!this.subscription.expiresAt || this.subscription.expiresAt > new Date());
};

// Instance method to check if user has pro max features
userSchema.methods.hasProMaxFeatures = function() {
  return this.subscription.tier === 'pro_max' && 
         this.subscription.status === 'active' &&
         (!this.subscription.expiresAt || this.subscription.expiresAt > new Date());
};

// Instance method to update savings
userSchema.methods.addSavings = function(amount) {
  this.savings.totalSaved += amount;
  this.savings.lifetimeSavings += amount;
  this.savings.lastUpdated = new Date();
  return this.save();
};

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find by referral code
userSchema.statics.findByReferralCode = function(code) {
  return this.findOne({ 'referral.code': code });
};

module.exports = mongoose.model('User', userSchema);