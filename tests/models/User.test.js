const User = require('../../backend/models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  describe('User Creation', () => {
    test('should create a user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123',
        profile: {
          name: 'Test User'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('test@example.com');
      expect(savedUser.profile.name).toBe('Test User');
      expect(savedUser.subscription.tier).toBe('free');
      expect(savedUser.referral.code).toBeDefined();
      expect(savedUser.password).not.toBe('Password123'); // Should be hashed
    });

    test('should create a user with Google OAuth', async () => {
      const userData = {
        email: 'google@example.com',
        googleId: 'google123',
        profile: {
          name: 'Google User'
        }
      };

      const user = new User(userData);
      const savedUser = await user.save();

      expect(savedUser.email).toBe('google@example.com');
      expect(savedUser.googleId).toBe('google123');
      expect(savedUser.password).toBeUndefined();
    });

    test('should fail to create user without required fields', async () => {
      const user = new User({});
      
      await expect(user.save()).rejects.toThrow();
    });

    test('should fail to create user with invalid email', async () => {
      const userData = {
        email: 'invalid-email',
        password: 'Password123',
        profile: {
          name: 'Test User'
        }
      };

      const user = new User(userData);
      await expect(user.save()).rejects.toThrow();
    });

    test('should fail to create user with duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123',
        profile: {
          name: 'Test User'
        }
      };

      await new User(userData).save();
      
      const duplicateUser = new User(userData);
      await expect(duplicateUser.save()).rejects.toThrow();
    });
  });

  describe('Password Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'password@example.com',
        password: 'Password123',
        profile: {
          name: 'Password User'
        }
      });
      await user.save();
    });

    test('should hash password before saving', async () => {
      expect(user.password).not.toBe('Password123');
      expect(user.password).toMatch(/^\$2[aby]\$\d+\$/); // bcrypt hash pattern
    });

    test('should compare password correctly', async () => {
      const isMatch = await user.comparePassword('Password123');
      expect(isMatch).toBe(true);

      const isWrongMatch = await user.comparePassword('wrongpassword');
      expect(isWrongMatch).toBe(false);
    });

    test('should return false for password comparison when no password exists', async () => {
      const googleUser = new User({
        email: 'google2@example.com',
        googleId: 'google456',
        profile: {
          name: 'Google User 2'
        }
      });
      await googleUser.save();

      const isMatch = await googleUser.comparePassword('anypassword');
      expect(isMatch).toBe(false);
    });
  });

  describe('JWT Token Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'token@example.com',
        password: 'Password123',
        profile: {
          name: 'Token User'
        }
      });
      await user.save();
    });

    test('should generate auth token', () => {
      const token = user.generateAuthToken();
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });

    test('should generate refresh token', () => {
      const refreshToken = user.generateRefreshToken();
      expect(refreshToken).toBeDefined();
      expect(typeof refreshToken).toBe('string');
    });
  });

  describe('Subscription Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'subscription@example.com',
        password: 'Password123',
        profile: {
          name: 'Subscription User'
        }
      });
      await user.save();
    });

    test('should check pro features for free user', () => {
      expect(user.hasProFeatures()).toBe(false);
      expect(user.hasProMaxFeatures()).toBe(false);
    });

    test('should check pro features for pro user', async () => {
      user.subscription.tier = 'pro';
      user.subscription.status = 'active';
      await user.save();

      expect(user.hasProFeatures()).toBe(true);
      expect(user.hasProMaxFeatures()).toBe(false);
    });

    test('should check pro max features for pro max user', async () => {
      user.subscription.tier = 'pro_max';
      user.subscription.status = 'active';
      await user.save();

      expect(user.hasProFeatures()).toBe(true);
      expect(user.hasProMaxFeatures()).toBe(true);
    });

    test('should check expired subscription', async () => {
      user.subscription.tier = 'pro';
      user.subscription.status = 'active';
      user.subscription.expiresAt = new Date(Date.now() - 1000); // Expired
      await user.save();

      expect(user.hasProFeatures()).toBe(false);
    });
  });

  describe('Savings Methods', () => {
    let user;

    beforeEach(async () => {
      user = new User({
        email: 'savings@example.com',
        password: 'Password123',
        profile: {
          name: 'Savings User'
        }
      });
      await user.save();
    });

    test('should add savings correctly', async () => {
      await user.addSavings(25.50);
      
      expect(user.savings.totalSaved).toBe(25.50);
      expect(user.savings.lifetimeSavings).toBe(25.50);
      expect(user.savings.lastUpdated).toBeDefined();
    });

    test('should accumulate savings', async () => {
      await user.addSavings(10.00);
      await user.addSavings(15.50);
      
      expect(user.savings.totalSaved).toBe(25.50);
      expect(user.savings.lifetimeSavings).toBe(25.50);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await User.create({
        email: 'static@example.com',
        password: 'Password123',
        profile: { name: 'Static User' }
      });
    });

    test('should find user by email', async () => {
      const user = await User.findByEmail('static@example.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('static@example.com');
    });

    test('should find user by referral code', async () => {
      const user = await User.findByEmail('static@example.com');
      const foundUser = await User.findByReferralCode(user.referral.code);
      
      expect(foundUser).toBeDefined();
      expect(foundUser._id.toString()).toBe(user._id.toString());
    });

    test('should return null for non-existent email', async () => {
      const user = await User.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });
});