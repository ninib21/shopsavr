const rateLimit = require('express-rate-limit');
const { getRedisClient } = require('../config/redis');

// Redis store for rate limiting
class RedisStore {
  constructor(options = {}) {
    this.prefix = options.prefix || 'rl:';
    this.client = getRedisClient();
  }

  async increment(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.incr(fullKey);
    
    if (current === 1) {
      await this.client.expire(fullKey, 900); // 15 minutes
    }
    
    return {
      totalHits: current,
      resetTime: new Date(Date.now() + 900000) // 15 minutes from now
    };
  }

  async decrement(key) {
    const fullKey = this.prefix + key;
    const current = await this.client.decr(fullKey);
    return {
      totalHits: Math.max(0, current)
    };
  }

  async resetKey(key) {
    const fullKey = this.prefix + key;
    await this.client.del(fullKey);
  }
}

// General API rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'general:' })
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: {
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication attempts, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'auth:' }),
  skipSuccessfulRequests: true // Don't count successful requests
});

// Rate limiting for password reset
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: {
      code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
      message: 'Too many password reset attempts, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ prefix: 'pwd_reset:' })
});

// Rate limiting for coupon searches (higher for pro users)
const couponSearchLimiter = (req, res, next) => {
  const maxRequests = req.user?.hasProFeatures ? 1000 : 100;
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    message: {
      error: {
        code: 'COUPON_SEARCH_RATE_LIMIT_EXCEEDED',
        message: 'Too many coupon searches, please try again later',
        upgradeMessage: req.user?.hasProFeatures ? null : 'Upgrade to Pro for higher limits'
      }
    },
    keyGenerator: (req) => {
      return req.user ? `user:${req.user.userId}` : req.ip;
    },
    store: new RedisStore({ prefix: 'coupon_search:' })
  });

  return limiter(req, res, next);
};

// Rate limiting for price tracking
const priceTrackingLimiter = (req, res, next) => {
  const maxRequests = req.user?.hasProFeatures ? 500 : 50;
  
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: maxRequests,
    message: {
      error: {
        code: 'PRICE_TRACKING_RATE_LIMIT_EXCEEDED',
        message: 'Too many price tracking requests, please try again later',
        upgradeMessage: req.user?.hasProFeatures ? null : 'Upgrade to Pro for higher limits'
      }
    },
    keyGenerator: (req) => {
      return req.user ? `user:${req.user.userId}` : req.ip;
    },
    store: new RedisStore({ prefix: 'price_track:' })
  });

  return limiter(req, res, next);
};

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  couponSearchLimiter,
  priceTrackingLimiter
};