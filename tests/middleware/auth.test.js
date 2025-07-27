const request = require('supertest');
const express = require('express');
const User = require('../../backend/models/User');
const authMiddleware = require('../../backend/middleware/auth');
const AuthUtils = require('../../backend/utils/auth');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test route that requires authentication
  app.get('/protected', authMiddleware, (req, res) => {
    res.json({ 
      message: 'Access granted',
      user: req.user 
    });
  });

  return app;
};

describe('Auth Middleware', () => {
  let testUser, validToken, app;

  beforeEach(async () => {
    app = createTestApp();
    
    testUser = await User.create({
      email: 'middleware@example.com',
      password: 'Password123',
      profile: { name: 'Middleware User' }
    });

    validToken = testUser.generateAuthToken();
  });

  test('should allow access with valid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(200);

    expect(response.body.message).toBe('Access granted');
    expect(response.body.user.userId).toBe(testUser._id.toString());
    expect(response.body.user.email).toBe(testUser.email);
  });

  test('should deny access without token', async () => {
    const response = await request(app)
      .get('/protected')
      .expect(401);

    expect(response.body.error.code).toBe('NO_TOKEN');
  });

  test('should deny access with invalid token', async () => {
    const response = await request(app)
      .get('/protected')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN');
  });

  test('should deny access with blacklisted token', async () => {
    // Blacklist the token
    await AuthUtils.blacklistToken(validToken);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.error.code).toBe('TOKEN_BLACKLISTED');
  });

  test('should deny access with refresh token', async () => {
    const refreshToken = testUser.generateRefreshToken();

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${refreshToken}`)
      .expect(401);

    expect(response.body.error.code).toBe('INVALID_TOKEN_TYPE');
  });

  test('should deny access for inactive user', async () => {
    testUser.isActive = false;
    await testUser.save();

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.error.code).toBe('ACCOUNT_DISABLED');
  });

  test('should deny access for non-existent user', async () => {
    await User.findByIdAndDelete(testUser._id);

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${validToken}`)
      .expect(401);

    expect(response.body.error.code).toBe('USER_NOT_FOUND');
  });

  test('should include user subscription info in request', async () => {
    testUser.subscription.tier = 'pro';
    await testUser.save();

    const newToken = testUser.generateAuthToken();

    const response = await request(app)
      .get('/protected')
      .set('Authorization', `Bearer ${newToken}`)
      .expect(200);

    expect(response.body.user.tier).toBe('pro');
    expect(response.body.user.hasProFeatures).toBe(true);
    expect(response.body.user.hasProMaxFeatures).toBe(false);
  });
});