const User = require('../models/User');
const AuthUtils = require('../utils/auth');
const Logger = require('../utils/logger');

class AuthController {
  // Register new user
  static async register(req, res) {
    try {
      const { email, password, name } = req.validatedBody;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: {
            code: 'USER_EXISTS',
            message: 'User with this email already exists'
          }
        });
      }

      // Create new user
      const user = new User({
        email,
        password,
        profile: { name }
      });

      await user.save();

      // Generate tokens
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Store refresh token
      await AuthUtils.storeRefreshToken(user._id.toString(), refreshToken);

      Logger.info('User registered successfully', { userId: user._id, email });

      res.status(201).json({
        message: 'User registered successfully',
        user: {
          id: user._id,
          email: user.email,
          name: user.profile.name,
          tier: user.subscription.tier,
          referralCode: user.referral.code
        },
        tokens: {
          accessToken: authToken,
          refreshToken
        }
      });
    } catch (error) {
      Logger.error('Registration failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user'
        }
      });
    }
  }

  // Login user
  static async login(req, res) {
    try {
      const { email, password } = req.validatedBody;

      // Find user and include password for comparison
      const user = await User.findByEmail(email).select('+password');
      if (!user) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
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

      // Compare password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: 'Invalid email or password'
          }
        });
      }

      // Update last login
      user.lastLogin = new Date();
      await user.save();

      // Generate tokens
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Store refresh token
      await AuthUtils.storeRefreshToken(user._id.toString(), refreshToken);

      Logger.info('User logged in successfully', { userId: user._id, email });

      res.json({
        message: 'Login successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.profile.name,
          tier: user.subscription.tier,
          avatar: user.profile.avatar,
          savings: user.savings,
          referralCode: user.referral.code,
          lastLogin: user.lastLogin
        },
        tokens: {
          accessToken: authToken,
          refreshToken
        }
      });
    } catch (error) {
      Logger.error('Login failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'LOGIN_FAILED',
          message: 'Failed to login user'
        }
      });
    }
  }

  // Google OAuth login
  static async googleAuth(req, res) {
    try {
      const { googleId, email, name, avatar } = req.validatedBody;

      // Check if user exists with this Google ID
      let user = await User.findOne({ googleId });

      if (!user) {
        // Check if user exists with this email (linking accounts)
        user = await User.findByEmail(email);
        
        if (user) {
          // Link Google account to existing user
          user.googleId = googleId;
          if (avatar) user.profile.avatar = avatar;
          await user.save();
        } else {
          // Create new user with Google account
          user = new User({
            email,
            googleId,
            profile: { name, avatar }
          });
          await user.save();
        }
      } else {
        // Update user info from Google
        user.profile.name = name;
        if (avatar) user.profile.avatar = avatar;
        user.lastLogin = new Date();
        await user.save();
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

      // Generate tokens
      const authToken = user.generateAuthToken();
      const refreshToken = user.generateRefreshToken();

      // Store refresh token
      await AuthUtils.storeRefreshToken(user._id.toString(), refreshToken);

      Logger.info('Google OAuth login successful', { userId: user._id, email });

      res.json({
        message: 'Google authentication successful',
        user: {
          id: user._id,
          email: user.email,
          name: user.profile.name,
          tier: user.subscription.tier,
          avatar: user.profile.avatar,
          savings: user.savings,
          referralCode: user.referral.code,
          lastLogin: user.lastLogin
        },
        tokens: {
          accessToken: authToken,
          refreshToken
        }
      });
    } catch (error) {
      Logger.error('Google OAuth failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'GOOGLE_AUTH_FAILED',
          message: 'Failed to authenticate with Google'
        }
      });
    }
  }

  // Refresh access token
  static async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required'
          }
        });
      }

      // Verify refresh token
      let decoded;
      try {
        decoded = AuthUtils.verifyToken(refreshToken);
      } catch (error) {
        return res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Invalid refresh token'
          }
        });
      }

      // Check if it's a refresh token
      if (decoded.type !== 'refresh') {
        return res.status(401).json({
          error: {
            code: 'INVALID_TOKEN_TYPE',
            message: 'Invalid token type'
          }
        });
      }

      // Validate stored refresh token
      const isValidRefreshToken = await AuthUtils.validateRefreshToken(
        decoded.userId,
        refreshToken
      );

      if (!isValidRefreshToken) {
        return res.status(401).json({
          error: {
            code: 'INVALID_REFRESH_TOKEN',
            message: 'Refresh token not found or expired'
          }
        });
      }

      // Find user
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        return res.status(401).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found or inactive'
          }
        });
      }

      // Generate new tokens
      const newAuthToken = user.generateAuthToken();
      const newRefreshToken = user.generateRefreshToken();

      // Remove old refresh token and store new one
      await AuthUtils.removeRefreshToken(user._id.toString());
      await AuthUtils.storeRefreshToken(user._id.toString(), newRefreshToken);

      Logger.info('Token refreshed successfully', { userId: user._id });

      res.json({
        message: 'Token refreshed successfully',
        tokens: {
          accessToken: newAuthToken,
          refreshToken: newRefreshToken
        }
      });
    } catch (error) {
      Logger.error('Token refresh failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh token'
        }
      });
    }
  }

  // Logout user
  static async logout(req, res) {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        // Blacklist the access token
        await AuthUtils.blacklistToken(token);
      }

      // Remove refresh token if user is authenticated
      if (req.user) {
        await AuthUtils.removeRefreshToken(req.user.userId);
        Logger.info('User logged out successfully', { userId: req.user.userId });
      }

      res.json({
        message: 'Logout successful'
      });
    } catch (error) {
      Logger.error('Logout failed', { error: error.message });
      res.status(500).json({
        error: {
          code: 'LOGOUT_FAILED',
          message: 'Failed to logout user'
        }
      });
    }
  }

  // Get current user profile
  static async getProfile(req, res) {
    try {
      const user = await User.findById(req.user.userId);
      
      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found'
          }
        });
      }

      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.profile.name,
          avatar: user.profile.avatar,
          tier: user.subscription.tier,
          subscription: user.subscription,
          savings: user.savings,
          referral: user.referral,
          settings: user.settings,
          createdAt: user.createdAt,
          lastLogin: user.lastLogin
        }
      });
    } catch (error) {
      Logger.error('Get profile failed', { error: error.message, userId: req.user.userId });
      res.status(500).json({
        error: {
          code: 'GET_PROFILE_FAILED',
          message: 'Failed to get user profile'
        }
      });
    }
  }
}

module.exports = AuthController;