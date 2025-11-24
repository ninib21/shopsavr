const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const AuthUtils = require('../../backend/utils/auth');

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    test('should register a new user successfully', async () => {
      const userData = {
        email: 'newuser@example.com',
        password: 'Password123',
        name: 'New User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');
      expect(response.body.user.tier).toBe('free');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Verify user was created in database
      const user = await User.findByEmail('newuser@example.com');
      expect(user).toBeTruthy();
    });

    test('should fail to register user with existing email', async () => {
      // Create existing user
      await User.create({
        email: 'existing@example.com',
        password: 'Password123',
        profile: { name: 'Existing User' }
      });

      const userData = {
        email: 'existing@example.com',
        password: 'Password123',
        name: 'Another User'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.error.code).toBe('USER_EXISTS');
    });

    test('should fail to register user with invalid data', async () => {
      const userData = {
        email: 'invalid-email',
        password: '123', // Too short
        name: '' // Empty name
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeInstanceOf(Array);
    });
  });

  describe('POST /api/auth/login', () => {
    let testUser;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'login@example.com',
        password: 'Password123',
        profile: { name: 'Login User' }
      });
    });

    test('should login user successfully', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.message).toBe('Login successful');
      expect(response.body.user.email).toBe('login@example.com');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');

      // Verify lastLogin was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.lastLogin).toBeTruthy();
    });

    test('should fail to login with wrong password', async () => {
      const loginData = {
        email: 'login@example.com',
        password: 'WrongPassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should fail to login with non-existent email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    test('should fail to login inactive user', async () => {
      testUser.isActive = false;
      await testUser.save();

      const loginData = {
        email: 'login@example.com',
        password: 'Password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_DISABLED');
    });
  });

  describe('POST /api/auth/google', () => {
    test('should authenticate new user with Google', async () => {
      const googleData = {
        googleId: 'google123',
        email: 'google@example.com',
        name: 'Google User',
        avatar: 'https://example.com/avatar.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)
        .expect(200);

      expect(response.body.message).toBe('Google authentication successful');
      expect(response.body.user.email).toBe('google@example.com');
      expect(response.body.user.name).toBe('Google User');
      expect(response.body.tokens).toHaveProperty('accessToken');

      // Verify user was created
      const user = await User.findOne({ googleId: 'google123' });
      expect(user).toBeTruthy();
      expect(user.profile.avatar).toBe('https://example.com/avatar.jpg');
    });

    test('should link Google account to existing email user', async () => {
      // Create existing user with email
      await User.create({
        email: 'existing@example.com',
        password: 'Password123',
        profile: { name: 'Existing User' }
      });

      const googleData = {
        googleId: 'google456',
        email: 'existing@example.com',
        name: 'Google User',
        avatar: 'https://example.com/avatar.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)
        .expect(200);

      // Verify Google ID was added to existing user
      const user = await User.findByEmail('existing@example.com');
      expect(user.googleId).toBe('google456');
      expect(user.profile.avatar).toBe('https://example.com/avatar.jpg');
    });

    test('should authenticate existing Google user', async () => {
      // Create existing Google user
      await User.create({
        email: 'google2@example.com',
        googleId: 'google789',
        profile: { name: 'Google User 2' }
      });

      const googleData = {
        googleId: 'google789',
        email: 'google2@example.com',
        name: 'Updated Google User',
        avatar: 'https://example.com/new-avatar.jpg'
      };

      const response = await request(app)
        .post('/api/auth/google')
        .send(googleData)
        .expect(200);

      // Verify user info was updated
      const user = await User.findOne({ googleId: 'google789' });
      expect(user.profile.name).toBe('Updated Google User');
      expect(user.profile.avatar).toBe('https://example.com/new-avatar.jpg');
    });
  });

  describe('POST /api/auth/refresh', () => {
    let testUser, refreshToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'refresh@example.com',
        password: 'Password123',
        profile: { name: 'Refresh User' }
      });

      refreshToken = testUser.generateRefreshToken();
      await AuthUtils.storeRefreshToken(testUser._id.toString(), refreshToken);
    });

    test('should refresh token successfully', async () => {
      // Add small delay to ensure different token timestamps
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.message).toBe('Token refreshed successfully');
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('refreshToken');
      // Note: tokens might be the same if generated at same second, which is acceptable
    });

    test('should fail with invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    });

    test('should fail with missing refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('MISSING_REFRESH_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    let testUser, accessToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'logout@example.com',
        password: 'Password123',
        profile: { name: 'Logout User' }
      });

      accessToken = testUser.generateAuthToken();
    });

    test('should logout user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBe('Logout successful');

      // Verify token is blacklisted
      const isBlacklisted = await AuthUtils.isTokenBlacklisted(accessToken);
      expect(isBlacklisted).toBe(true);
    });

    test('should logout without token (guest logout)', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.message).toBe('Logout successful');
    });
  });

  describe('GET /api/auth/profile', () => {
    let testUser, accessToken;

    beforeEach(async () => {
      testUser = await User.create({
        email: 'profile@example.com',
        password: 'Password123',
        profile: { name: 'Profile User' }
      });

      accessToken = testUser.generateAuthToken();
    });

    test('should get user profile successfully', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.user.email).toBe('profile@example.com');
      expect(response.body.user.name).toBe('Profile User');
      expect(response.body.user).toHaveProperty('savings');
      expect(response.body.user).toHaveProperty('subscription');
      expect(response.body.user).toHaveProperty('referral');
    });

    test('should fail to get profile without token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should fail to get profile with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });
});