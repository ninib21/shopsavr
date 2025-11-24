const Logger = require('../utils/logger');

// Middleware to check if user has pro features
const requireProFeatures = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.hasProFeatures) {
    return res.status(403).json({
      error: {
        code: 'PRO_SUBSCRIPTION_REQUIRED',
        message: 'Pro subscription required to access this feature',
        upgradeUrl: '/upgrade'
      }
    });
  }

  next();
};

// Middleware to check if user has pro max features
const requireProMaxFeatures = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication required'
      }
    });
  }

  if (!req.user.hasProMaxFeatures) {
    return res.status(403).json({
      error: {
        code: 'PRO_MAX_SUBSCRIPTION_REQUIRED',
        message: 'Pro Max subscription required to access this feature',
        upgradeUrl: '/upgrade'
      }
    });
  }

  next();
};

// Middleware to check subscription tier
const requireTier = (requiredTier) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication required'
        }
      });
    }

    const tierHierarchy = { 'free': 0, 'pro': 1, 'pro_max': 2 };
    const userTierLevel = tierHierarchy[req.user.tier] || 0;
    const requiredTierLevel = tierHierarchy[requiredTier] || 0;

    if (userTierLevel < requiredTierLevel) {
      return res.status(403).json({
        error: {
          code: 'INSUFFICIENT_SUBSCRIPTION_TIER',
          message: `${requiredTier} subscription or higher required`,
          currentTier: req.user.tier,
          requiredTier,
          upgradeUrl: '/upgrade'
        }
      });
    }

    next();
  };
};

module.exports = {
  requireProFeatures,
  requireProMaxFeatures,
  requireTier
};