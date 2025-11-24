const AuthUtils = require('../utils/auth');
const User = require('../models/User');
const Logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required'
        }
      });
    }

    // Check if token is blacklisted
    const isBlacklisted = await AuthUtils.isTokenBlacklisted(token);
    if (isBlacklisted) {
      return res.status(401).json({
        error: {
          code: 'TOKEN_BLACKLISTED',
          message: 'Token has been invalidated'
        }
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = AuthUtils.verifyToken(token);
    } catch (error) {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired token'
        }
      });
    }

    // Check if it's not a refresh token
    if (decoded.type === 'refresh') {
      return res.status(401).json({
        error: {
          code: 'INVALID_TOKEN_TYPE',
          message: 'Refresh token cannot be used for authentication'
        }
      });
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found'
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        error: {
          code: 'ACCOUNT_DISABLED',
          message: 'Account has been disabled'
        }
      });
    }

    // Add user info to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      tier: user.subscription.tier,
      hasProFeatures: user.hasProFeatures(),
      hasProMaxFeatures: user.hasProMaxFeatures()
    };

    next();
  } catch (error) {
    Logger.error('Authentication middleware error', { error: error.message });
    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed'
      }
    });
  }
};

module.exports = authMiddleware;