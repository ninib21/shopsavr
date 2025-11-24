const request = require('supertest');
const express = require('express');
const User = require('../../backend/models/User');
const authMiddleware = require('../../backend/middleware/auth');
const { requireProFeatures, requireProMaxFeatures, requireTier } = require('../../backend/middleware/subscription');

// Create test app
const createTestApp = () => {
  const app = express();
  app.use(express.json());
  
  // Test routes with different subscription requirements
  app.get('/pro-feature', authMiddleware, requireProFeatures, (req, res) => {
    res.json({ message: 'Pro feature accessed' });
  });

  app.get('/pro-max-feature', authMiddleware, requireProMaxFeatures, (req, res) => {
    res.json({ message: 'Pro Max feature accessed' });
  });

  app.get('/tier-pro', authMiddleware, requireTier('pro'), (req, res) => {
    res.json({ message: 'Pro tier accessed' });
  });

  app.get('/tier-pro-max', authMiddleware, requireTier('pro_max'), (req, res) => {
    res.json({ message: 'Pro Max tier accessed' });
  });

  return app;
};

describe('Subscription Middleware', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('requireProFeatures', () => {
    test('should allow access for pro user', async () => {
      const user = await User.create({
        email: 'pro@example.com',
        password: 'Password123',
        profile: { name: 'Pro User' },
        subscription: { tier: 'pro', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Pro feature accessed');
    });

    test('should allow access for pro max user', async () => {
      const user = await User.create({
        email: 'promax@example.com',
        password: 'Password123',
        profile: { name: 'Pro Max User' },
        subscription: { tier: 'pro_max', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Pro feature accessed');
    });

    test('should deny access for free user', async () => {
      const user = await User.create({
        email: 'free@example.com',
        password: 'Password123',
        profile: { name: 'Free User' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('PRO_SUBSCRIPTION_REQUIRED');
      expect(response.body.error.upgradeUrl).toBe('/upgrade');
    });

    test('should deny access for expired pro user', async () => {
      const user = await User.create({
        email: 'expired@example.com',
        password: 'Password123',
        profile: { name: 'Expired User' },
        subscription: { 
          tier: 'pro', 
          status: 'active',
          expiresAt: new Date(Date.now() - 1000) // Expired
        }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('PRO_SUBSCRIPTION_REQUIRED');
    });
  });

  describe('requireProMaxFeatures', () => {
    test('should allow access for pro max user', async () => {
      const user = await User.create({
        email: 'promax2@example.com',
        password: 'Password123',
        profile: { name: 'Pro Max User 2' },
        subscription: { tier: 'pro_max', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-max-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Pro Max feature accessed');
    });

    test('should deny access for pro user', async () => {
      const user = await User.create({
        email: 'pro2@example.com',
        password: 'Password123',
        profile: { name: 'Pro User 2' },
        subscription: { tier: 'pro', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-max-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('PRO_MAX_SUBSCRIPTION_REQUIRED');
    });

    test('should deny access for free user', async () => {
      const user = await User.create({
        email: 'free2@example.com',
        password: 'Password123',
        profile: { name: 'Free User 2' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/pro-max-feature')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('PRO_MAX_SUBSCRIPTION_REQUIRED');
    });
  });

  describe('requireTier', () => {
    test('should allow pro user to access pro tier endpoint', async () => {
      const user = await User.create({
        email: 'tier-pro@example.com',
        password: 'Password123',
        profile: { name: 'Tier Pro User' },
        subscription: { tier: 'pro', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/tier-pro')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Pro tier accessed');
    });

    test('should allow pro max user to access pro tier endpoint', async () => {
      const user = await User.create({
        email: 'tier-promax@example.com',
        password: 'Password123',
        profile: { name: 'Tier Pro Max User' },
        subscription: { tier: 'pro_max', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/tier-pro')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.message).toBe('Pro tier accessed');
    });

    test('should deny free user access to pro tier endpoint', async () => {
      const user = await User.create({
        email: 'tier-free@example.com',
        password: 'Password123',
        profile: { name: 'Tier Free User' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/tier-pro')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_SUBSCRIPTION_TIER');
      expect(response.body.error.currentTier).toBe('free');
      expect(response.body.error.requiredTier).toBe('pro');
    });

    test('should deny pro user access to pro max tier endpoint', async () => {
      const user = await User.create({
        email: 'tier-pro2@example.com',
        password: 'Password123',
        profile: { name: 'Tier Pro User 2' },
        subscription: { tier: 'pro', status: 'active' }
      });

      const token = user.generateAuthToken();

      const response = await request(app)
        .get('/tier-pro-max')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_SUBSCRIPTION_TIER');
      expect(response.body.error.currentTier).toBe('pro');
      expect(response.body.error.requiredTier).toBe('pro_max');
    });
  });
});