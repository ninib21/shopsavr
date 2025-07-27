const { getRedisClient } = require('../config/redis');
const Logger = require('../utils/logger');

class SessionManager {
  constructor() {
    this.redis = getRedisClient();
    this.sessionPrefix = 'session:';
    this.userSessionsPrefix = 'user_sessions:';
    this.defaultTTL = 7 * 24 * 60 * 60; // 7 days in seconds
  }

  // Create a new session
  async createSession(userId, sessionData = {}) {
    try {
      const sessionId = this.generateSessionId();
      const sessionKey = this.sessionPrefix + sessionId;
      const userSessionsKey = this.userSessionsPrefix + userId;

      const session = {
        userId,
        sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
        ...sessionData
      };

      // Store session data
      await this.redis.setEx(sessionKey, this.defaultTTL, JSON.stringify(session));

      // Add session to user's session list
      await this.redis.sAdd(userSessionsKey, sessionId);
      await this.redis.expire(userSessionsKey, this.defaultTTL);

      Logger.info('Session created', { userId, sessionId });
      return sessionId;
    } catch (error) {
      Logger.error('Failed to create session', { userId, error: error.message });
      throw error;
    }
  }

  // Get session data
  async getSession(sessionId) {
    try {
      const sessionKey = this.sessionPrefix + sessionId;
      const sessionData = await this.redis.get(sessionKey);
      
      if (!sessionData) {
        return null;
      }

      const session = JSON.parse(sessionData);
      
      // Update last activity
      session.lastActivity = new Date().toISOString();
      await this.redis.setEx(sessionKey, this.defaultTTL, JSON.stringify(session));

      return session;
    } catch (error) {
      Logger.error('Failed to get session', { sessionId, error: error.message });
      return null;
    }
  }

  // Update session data
  async updateSession(sessionId, updateData) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const updatedSession = {
        ...session,
        ...updateData,
        lastActivity: new Date().toISOString()
      };

      const sessionKey = this.sessionPrefix + sessionId;
      await this.redis.setEx(sessionKey, this.defaultTTL, JSON.stringify(updatedSession));

      return true;
    } catch (error) {
      Logger.error('Failed to update session', { sessionId, error: error.message });
      return false;
    }
  }

  // Delete a specific session
  async deleteSession(sessionId) {
    try {
      const session = await this.getSession(sessionId);
      if (!session) {
        return false;
      }

      const sessionKey = this.sessionPrefix + sessionId;
      const userSessionsKey = this.userSessionsPrefix + session.userId;

      // Remove session data
      await this.redis.del(sessionKey);

      // Remove session from user's session list
      await this.redis.sRem(userSessionsKey, sessionId);

      Logger.info('Session deleted', { sessionId, userId: session.userId });
      return true;
    } catch (error) {
      Logger.error('Failed to delete session', { sessionId, error: error.message });
      return false;
    }
  }

  // Delete all sessions for a user
  async deleteUserSessions(userId) {
    try {
      const userSessionsKey = this.userSessionsPrefix + userId;
      const sessionIds = await this.redis.sMembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return 0;
      }

      // Delete all session data
      const sessionKeys = sessionIds.map(id => this.sessionPrefix + id);
      await this.redis.del(...sessionKeys);

      // Delete user sessions list
      await this.redis.del(userSessionsKey);

      Logger.info('All user sessions deleted', { userId, count: sessionIds.length });
      return sessionIds.length;
    } catch (error) {
      Logger.error('Failed to delete user sessions', { userId, error: error.message });
      return 0;
    }
  }

  // Get all active sessions for a user
  async getUserSessions(userId) {
    try {
      const userSessionsKey = this.userSessionsPrefix + userId;
      const sessionIds = await this.redis.sMembers(userSessionsKey);

      if (sessionIds.length === 0) {
        return [];
      }

      const sessions = [];
      for (const sessionId of sessionIds) {
        const session = await this.getSession(sessionId);
        if (session) {
          sessions.push(session);
        }
      }

      return sessions;
    } catch (error) {
      Logger.error('Failed to get user sessions', { userId, error: error.message });
      return [];
    }
  }

  // Clean up expired sessions
  async cleanupExpiredSessions() {
    try {
      // This would typically be run as a background job
      // For now, we rely on Redis TTL for cleanup
      Logger.info('Session cleanup completed');
    } catch (error) {
      Logger.error('Session cleanup failed', { error: error.message });
    }
  }

  // Generate a secure session ID
  generateSessionId() {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('hex');
  }

  // Extend session TTL
  async extendSession(sessionId, ttl = this.defaultTTL) {
    try {
      const sessionKey = this.sessionPrefix + sessionId;
      const exists = await this.redis.exists(sessionKey);
      
      if (exists) {
        await this.redis.expire(sessionKey, ttl);
        return true;
      }
      
      return false;
    } catch (error) {
      Logger.error('Failed to extend session', { sessionId, error: error.message });
      return false;
    }
  }
}

// Session middleware
const sessionMiddleware = async (req, res, next) => {
  try {
    const sessionManager = new SessionManager();
    req.sessionManager = sessionManager;

    // Extract session ID from header or cookie
    const sessionId = req.headers['x-session-id'] || req.cookies?.sessionId;

    if (sessionId) {
      const session = await sessionManager.getSession(sessionId);
      if (session) {
        req.session = session;
        
        // Update session with current request info
        await sessionManager.updateSession(sessionId, {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          lastEndpoint: req.originalUrl
        });
      }
    }

    next();
  } catch (error) {
    Logger.error('Session middleware error', { error: error.message });
    next(); // Continue without session
  }
};

module.exports = {
  SessionManager,
  sessionMiddleware
};