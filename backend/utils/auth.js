const jwt = require('jsonwebtoken');
const { getRedisClient } = require('../config/redis');

class AuthUtils {
  // Generate JWT token
  static generateToken(payload, expiresIn = '7d') {
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  // Generate secure random string
  static generateSecureRandom(length = 32) {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash password
  static async hashPassword(password) {
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    const bcrypt = require('bcryptjs');
    return bcrypt.compare(password, hashedPassword);
  }

  // Blacklist token (for logout)
  static async blacklistToken(token) {
    try {
      const decoded = this.verifyToken(token);
      const redis = getRedisClient();
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      if (expiresIn > 0) {
        await redis.setEx(`blacklist:${token}`, expiresIn, 'true');
      }
    } catch (error) {
      // Token already invalid, no need to blacklist
    }
  }

  // Check if token is blacklisted
  static async isTokenBlacklisted(token) {
    try {
      const redis = getRedisClient();
      const result = await redis.get(`blacklist:${token}`);
      return result === 'true';
    } catch (error) {
      return false;
    }
  }

  // Store refresh token
  static async storeRefreshToken(userId, refreshToken) {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      const expiresIn = 30 * 24 * 60 * 60; // 30 days in seconds
      await redis.setEx(key, expiresIn, refreshToken);
    } catch (error) {
      throw new Error('Failed to store refresh token');
    }
  }

  // Validate refresh token
  static async validateRefreshToken(userId, refreshToken) {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      const storedToken = await redis.get(key);
      return storedToken === refreshToken;
    } catch (error) {
      return false;
    }
  }

  // Remove refresh token
  static async removeRefreshToken(userId) {
    try {
      const redis = getRedisClient();
      const key = `refresh_token:${userId}`;
      await redis.del(key);
    } catch (error) {
      // Ignore errors when removing refresh token
    }
  }

  // Generate password reset token
  static async generatePasswordResetToken(userId) {
    const token = this.generateSecureRandom();
    const redis = getRedisClient();
    const key = `password_reset:${userId}`;
    const expiresIn = 60 * 60; // 1 hour in seconds
    
    await redis.setEx(key, expiresIn, token);
    return token;
  }

  // Validate password reset token
  static async validatePasswordResetToken(userId, token) {
    try {
      const redis = getRedisClient();
      const key = `password_reset:${userId}`;
      const storedToken = await redis.get(key);
      return storedToken === token;
    } catch (error) {
      return false;
    }
  }

  // Remove password reset token
  static async removePasswordResetToken(userId) {
    try {
      const redis = getRedisClient();
      const key = `password_reset:${userId}`;
      await redis.del(key);
    } catch (error) {
      // Ignore errors
    }
  }
}

module.exports = AuthUtils;