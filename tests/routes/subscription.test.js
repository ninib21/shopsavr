const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');

// Mock Stripe service
jest.mock('../../backend/services/stripeService', () => ({
  getPlans: () => ({
    pro: {
      name: 'Pro',
      amount: 299,
      currency: 'usd',
      interval: 'month',
      features: ['Unlimited wishlist items', 'Advanced price alerts']
    },
    pro_max: {
      name: 'Pro Max',
      amount: 699,
      currency: 'usd',
      interval: 'month',
      features: ['All Pro features', '2x cashback rewards']
    }
  }),
  createOrGetCustomer: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
  createSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test123',
    status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    latest_invoice: {
      payment_intent: {
        client_secret: 'pi_test_client_secret'
      }
    }
  }),
  getSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test123',
    status: 'active',
    current_period_start: Math.floor(Date.now() / 1000),
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    cancel_at_period_end: false,
    canceled_at: null,
    trial_end: null,
    default_payment_method: {
      id: 'pm_test123',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      }
    }
  }),
  updateSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test123',
    status: 'active',
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  }),
  cancelSubscription: jest.fn().mockResolvedValue({
    id: 'sub_test123',
    status: 'active',
    cancel_at_period_end: true,
    current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
  }),
  getPaymentMethods: jest.fn().mockResolvedValue([
    {
      id: 'pm_test123',
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 12,
        exp_year: 2025
      },
      created: Math.floor(Date.now() / 1000)
    }
  ]),
  createSetupIntent: jest.fn().mockResolvedValue({
    client_secret: 'seti_test_client_secret'
  }),
  handleWebhook: jest.fn().mockResolvedValue({ received: true }),
  stripe: {
    subscriptions: {
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        status: 'active',
        cancel_at_period_end: false,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60
      })
    }
  }
}));

describe('Subscription Routes', () => {
  let testUser, authToken;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'subscription@example.com',
      password: 'Password123',
      profile: { name: 'Subscription User' }
    });

    authToken = testUser.generateAuthToken();
  });

  describe('GET /api/subscription/plans', () => {
    test('should get available subscription plans', async () => {
      const response = await request(app)
        .get('/api/subscription/plans')
        .expect(200);

      expect(response.body.plans).toHaveLength(2);
      expect(response.body.plans[0]).toHaveProperty('id');
      expect(response.body.plans[0]).toHaveProperty('name');
      expect(response.body.plans[0]).toHaveProperty('price');
      expect(response.body.plans[0]).toHaveProperty('features');
      expect(response.body.currency).toBe('USD');
    });

    test('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/plans')
        .expect(200);

      expect(response.body.plans).toBeDefined();
    });
  });

  describe('GET /api/subscription/current', () => {
    test('should get current subscription for free user', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('free');
      expect(response.body.subscription.status).toBe('active');
      expect(response.body.features.hasProFeatures).toBe(false);
      expect(response.body.limits.wishlistItems).toBe(50);
    });

    test('should get current subscription for pro user', async () => {
      // Update user to pro
      testUser.subscription.tier = 'pro';
      testUser.subscription.status = 'active';
      testUser.subscription.subscriptionId = 'sub_test123';
      await testUser.save();

      const response = await request(app)
        .get('/api/subscription/current')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.subscription.tier).toBe('pro');
      expect(response.body.features.hasProFeatures).toBe(true);
      expect(response.body.limits.wishlistItems).toBe(1000);
      expect(response.body.subscription.stripeDetails).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/current')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/subscription/create', () => {
    test('should create pro subscription successfully', async () => {
      const subscriptionData = {
        planType: 'pro',
        paymentMethodId: 'pm_test123'
      };

      const response = await request(app)
        .post('/api/subscription/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body.message).toBe('Subscription created successfully');
      expect(response.body.subscription.plan).toBe('pro');
      expect(response.body.subscription.status).toBe('active');
      expect(response.body.subscription.clientSecret).toBeDefined();
      expect(response.body.user.tier).toBe('pro');
      expect(response.body.user.hasProFeatures).toBe(true);

      // Verify user was updated in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscription.tier).toBe('pro');
      expect(updatedUser.subscription.subscriptionId).toBe('sub_test123');
    });

    test('should create pro max subscription successfully', async () => {
      const subscriptionData = {
        planType: 'pro_max'
      };

      const response = await request(app)
        .post('/api/subscription/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(201);

      expect(response.body.subscription.plan).toBe('pro_max');
      expect(response.body.user.hasProMaxFeatures).toBe(true);
    });

    test('should prevent duplicate subscription', async () => {
      // Set user as already having active subscription
      testUser.subscription.tier = 'pro';
      testUser.subscription.status = 'active';
      testUser.subscription.subscriptionId = 'sub_existing123';
      await testUser.save();

      const subscriptionData = {
        planType: 'pro_max'
      };

      const response = await request(app)
        .post('/api/subscription/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(409);

      expect(response.body.error.code).toBe('SUBSCRIPTION_EXISTS');
      expect(response.body.error.currentPlan).toBe('pro');
    });

    test('should fail with invalid plan type', async () => {
      const subscriptionData = {
        planType: 'invalid_plan'
      };

      const response = await request(app)
        .post('/api/subscription/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send(subscriptionData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with missing plan type', async () => {
      const response = await request(app)
        .post('/api/subscription/create')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscription/create')
        .send({ planType: 'pro' })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/subscription/change-plan', () => {
    beforeEach(async () => {
      // Set user as having active pro subscription
      testUser.subscription.tier = 'pro';
      testUser.subscription.status = 'active';
      testUser.subscription.subscriptionId = 'sub_test123';
      await testUser.save();
    });

    test('should change plan from pro to pro max', async () => {
      const changePlanData = {
        newPlanType: 'pro_max'
      };

      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePlanData)
        .expect(200);

      expect(response.body.message).toBe('Subscription plan changed successfully');
      expect(response.body.subscription.plan).toBe('pro_max');
      expect(response.body.user.hasProMaxFeatures).toBe(true);

      // Verify user was updated in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscription.tier).toBe('pro_max');
    });

    test('should fail to change to same plan', async () => {
      const changePlanData = {
        newPlanType: 'pro' // Same as current
      };

      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePlanData)
        .expect(400);

      expect(response.body.error.code).toBe('SAME_PLAN');
    });

    test('should fail without active subscription', async () => {
      // Remove subscription
      testUser.subscription.subscriptionId = null;
      testUser.subscription.status = 'cancelled';
      await testUser.save();

      const changePlanData = {
        newPlanType: 'pro_max'
      };

      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePlanData)
        .expect(400);

      expect(response.body.error.code).toBe('NO_ACTIVE_SUBSCRIPTION');
    });

    test('should fail with invalid plan type', async () => {
      const changePlanData = {
        newPlanType: 'invalid_plan'
      };

      const response = await request(app)
        .put('/api/subscription/change-plan')
        .set('Authorization', `Bearer ${authToken}`)
        .send(changePlanData)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/subscription/cancel', () => {
    beforeEach(async () => {
      // Set user as having active subscription
      testUser.subscription.tier = 'pro';
      testUser.subscription.status = 'active';
      testUser.subscription.subscriptionId = 'sub_test123';
      await testUser.save();
    });

    test('should cancel subscription at period end', async () => {
      const cancelData = {
        cancelAtPeriodEnd: true
      };

      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.message).toContain('cancelled at the end of the billing period');
      expect(response.body.subscription.cancelAtPeriodEnd).toBe(true);
      expect(response.body.user.tier).toBe('pro'); // Still pro until period end
    });

    test('should cancel subscription immediately', async () => {
      const cancelData = {
        cancelAtPeriodEnd: false
      };

      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send(cancelData)
        .expect(200);

      expect(response.body.message).toContain('cancelled immediately');
      expect(response.body.user.tier).toBe('free'); // Downgraded immediately

      // Verify user was updated in database
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscription.tier).toBe('free');
      expect(updatedUser.subscription.status).toBe('cancelled');
    });

    test('should use default cancelAtPeriodEnd=true', async () => {
      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.subscription.cancelAtPeriodEnd).toBe(true);
    });

    test('should fail without subscription', async () => {
      // Remove subscription
      testUser.subscription.subscriptionId = null;
      await testUser.save();

      const response = await request(app)
        .post('/api/subscription/cancel')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
    });
  });

  describe('POST /api/subscription/reactivate', () => {
    beforeEach(async () => {
      // Set user as having subscription scheduled for cancellation
      testUser.subscription.tier = 'pro';
      testUser.subscription.status = 'active';
      testUser.subscription.subscriptionId = 'sub_test123';
      await testUser.save();
    });

    test('should reactivate cancelled subscription', async () => {
      const response = await request(app)
        .post('/api/subscription/reactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Subscription reactivated successfully');
      expect(response.body.subscription.cancelAtPeriodEnd).toBe(false);

      // Verify user status was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.subscription.status).toBe('active');
    });

    test('should fail without subscription', async () => {
      // Remove subscription
      testUser.subscription.subscriptionId = null;
      await testUser.save();

      const response = await request(app)
        .post('/api/subscription/reactivate')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('NO_SUBSCRIPTION');
    });
  });

  describe('GET /api/subscription/payment-methods', () => {
    beforeEach(async () => {
      // Set user as having Stripe customer
      testUser.subscription.stripeCustomerId = 'cus_test123';
      await testUser.save();
    });

    test('should get payment methods successfully', async () => {
      const response = await request(app)
        .get('/api/subscription/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(1);
      expect(response.body.paymentMethods[0]).toHaveProperty('id');
      expect(response.body.paymentMethods[0]).toHaveProperty('type', 'card');
      expect(response.body.paymentMethods[0].card).toHaveProperty('last4', '4242');
    });

    test('should return empty array for user without customer ID', async () => {
      // Remove customer ID
      testUser.subscription.stripeCustomerId = null;
      await testUser.save();

      const response = await request(app)
        .get('/api/subscription/payment-methods')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.paymentMethods).toHaveLength(0);
      expect(response.body.message).toBe('No payment methods found');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/subscription/payment-methods')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/subscription/setup-intent', () => {
    test('should create setup intent successfully', async () => {
      const response = await request(app)
        .post('/api/subscription/setup-intent')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.clientSecret).toBe('seti_test_client_secret');
      expect(response.body.customerId).toBe('cus_test123');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/subscription/setup-intent')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/subscription/webhook', () => {
    test('should handle webhook successfully', async () => {
      const response = await request(app)
        .post('/api/subscription/webhook')
        .set('stripe-signature', 't=1234567890,v1=abcdef1234567890')
        .send('{"type": "customer.subscription.created"}')
        .expect(200);

      expect(response.body.received).toBe(true);
    });

    test('should fail with missing signature', async () => {
      const response = await request(app)
        .post('/api/subscription/webhook')
        .send('{"type": "test"}')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should not require authentication', async () => {
      const response = await request(app)
        .post('/api/subscription/webhook')
        .set('stripe-signature', 't=1234567890,v1=abcdef1234567890')
        .send('{"type": "test"}')
        .expect(200);

      expect(response.body.received).toBe(true);
    });
  });
});