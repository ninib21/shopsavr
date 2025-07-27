const AuthUtils = require('../../backend/utils/auth');
const jwt = require('jsonwebtoken');

// Mock Redis client
const mockRedis = {
  setEx: jest.fn(),
  get: jest.fn(),
  del: jest.fn()
};

jest.mock('../../backend/config/redis', () => ({
  getRedisClient: () => mockRedis
}));

describe('AuthUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
  });

  describe('Token Generation and Verification', () => {
    test('should generate and verify JWT token', () => {
      const payload = { userId: '123', email: 'test@example.com' };
      const token = AuthUtils.generateToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = AuthUtils.verifyToken(token);
      expect(decoded.userId).toBe('123');
      expect(decoded.email).toBe('test@example.com');
    });

    test('should throw error for invalid token', () => {
      expect(() => {
        AuthUtils.verifyToken('invalid-token');
      }).toThrow('Invalid token');
    });

    test('should generate token with custom expiration', () => {
      const payload = { userId: '123' };
      const token = AuthUtils.generateToken(payload, '1h');
      
      const decoded = AuthUtils.verifyToken(token);
      expect(decoded.userId).toBe('123');
    });
  });

  describe('Password Hashing', () => {
    test('should hash password', async () => {
      const password = 'testpassword';
      const hashedPassword = await AuthUtils.hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
    });

    test('should compare password correctly', async () => {
      const password = 'testpassword';
      const hashedPassword = await AuthUtils.hashPassword(password);
      
      const isMatch = await AuthUtils.comparePassword(password, hashedPassword);
      expect(isMatch).toBe(true);

      const isWrongMatch = await AuthUtils.comparePassword('wrongpassword', hashedPassword);
      expect(isWrongMatch).toBe(false);
    });
  });

  describe('Secure Random Generation', () => {
    test('should generate secure random string', () => {
      const random1 = AuthUtils.generateSecureRandom();
      const random2 = AuthUtils.generateSecureRandom();
      
      expect(random1).toBeDefined();
      expect(random2).toBeDefined();
      expect(random1).not.toBe(random2);
      expect(random1.length).toBe(64); // 32 bytes = 64 hex chars
    });

    test('should generate secure random string with custom length', () => {
      const random = AuthUtils.generateSecureRandom(16);
      expect(random.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe('Token Blacklisting', () => {
    test('should blacklist valid token', async () => {
      const payload = { userId: '123', exp: Math.floor(Date.now() / 1000) + 3600 };
      const token = jwt.sign(payload, process.env.JWT_SECRET);
      
      mockRedis.setEx.mockResolvedValue('OK');
      
      await AuthUtils.blacklistToken(token);
      
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        `blacklist:${token}`,
        expect.any(Number),
        'true'
      );
    });

    test('should check if token is blacklisted', async () => {
      mockRedis.get.mockResolvedValue('true');
      
      const isBlacklisted = await AuthUtils.isTokenBlacklisted('some-token');
      expect(isBlacklisted).toBe(true);
      
      mockRedis.get.mockResolvedValue(null);
      const isNotBlacklisted = await AuthUtils.isTokenBlacklisted('some-token');
      expect(isNotBlacklisted).toBe(false);
    });
  });

  describe('Refresh Token Management', () => {
    test('should store refresh token', async () => {
      mockRedis.setEx.mockResolvedValue('OK');
      
      await AuthUtils.storeRefreshToken('user123', 'refresh-token');
      
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'refresh_token:user123',
        30 * 24 * 60 * 60,
        'refresh-token'
      );
    });

    test('should validate refresh token', async () => {
      mockRedis.get.mockResolvedValue('refresh-token');
      
      const isValid = await AuthUtils.validateRefreshToken('user123', 'refresh-token');
      expect(isValid).toBe(true);
      
      const isInvalid = await AuthUtils.validateRefreshToken('user123', 'wrong-token');
      expect(isInvalid).toBe(false);
    });

    test('should remove refresh token', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      await AuthUtils.removeRefreshToken('user123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('refresh_token:user123');
    });
  });

  describe('Password Reset Token Management', () => {
    test('should generate password reset token', async () => {
      mockRedis.setEx.mockResolvedValue('OK');
      
      const token = await AuthUtils.generatePasswordResetToken('user123');
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        'password_reset:user123',
        60 * 60,
        token
      );
    });

    test('should validate password reset token', async () => {
      mockRedis.get.mockResolvedValue('reset-token');
      
      const isValid = await AuthUtils.validatePasswordResetToken('user123', 'reset-token');
      expect(isValid).toBe(true);
      
      const isInvalid = await AuthUtils.validatePasswordResetToken('user123', 'wrong-token');
      expect(isInvalid).toBe(false);
    });

    test('should remove password reset token', async () => {
      mockRedis.del.mockResolvedValue(1);
      
      await AuthUtils.removePasswordResetToken('user123');
      
      expect(mockRedis.del).toHaveBeenCalledWith('password_reset:user123');
    });
  });
});