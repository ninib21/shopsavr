const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const Coupon = require('../../backend/models/Coupon');
const CouponUsage = require('../../backend/models/CouponUsage');

describe('Savings Routes', () => {
  let testUser, authToken, testCoupon;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'savings@example.com',
      password: 'Password123',
      profile: { name: 'Savings User' }
    });

    authToken = testUser.generateAuthToken();

    // Create test coupon
    testCoupon = await Coupon.create({
      code: 'SAVE20',
      domain: 'teststore.com',
      title: '20% Off Everything',
      description: 'Save 20% on all items',
      discountType: 'percentage',
      discountValue: 20,
      minimumOrder: 50,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      source: { provider: 'test' }
    });
  });

  describe('POST /api/savings/apply', () => {
    test('should apply coupon successfully for authenticated user', async () => {
      const requestData = {
        couponCode: 'SAVE20',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 100,
          categories: [],
          isNewUser: false
        },
        metadata: {
          platform: 'web',
          userAgent: 'test-agent'
        }
      };

      const response = await request(app)
        .post('/api/savings/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.coupon.code).toBe('SAVE20');
      expect(response.body.savings.discountAmount).toBe(20);
      expect(response.body.savings.finalAmount).toBe(80);
      expect(response.body.savings.savingsPercentage).toBe('20.00');
      expect(response.body.usageId).toBeDefined();

      // Verify user's savings were updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.savings.totalSaved).toBe(20);
      expect(updatedUser.savings.lifetimeSavings).toBe(20);

      // Verify coupon usage was recorded
      const usage = await CouponUsage.findById(response.body.usageId);
      expect(usage).toBeDefined();
      expect(usage.status).toBe('successful');
      expect(usage.orderDetails.discountAmount).toBe(20);
    });

    test('should apply coupon for guest user (no auth)', async () => {
      const requestData = {
        couponCode: 'SAVE20',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 100,
          categories: []
        }
      };

      const response = await request(app)
        .post('/api/savings/apply')
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.savings.discountAmount).toBe(20);
      expect(response.body.usageId).toBeUndefined(); // No usage record for guest
    });

    test('should reject coupon below minimum order', async () => {
      const requestData = {
        couponCode: 'SAVE20',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 30 // Below minimum of 50
        }
      };

      const response = await request(app)
        .post('/api/savings/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_NOT_APPLICABLE');

      // Verify failed usage was recorded
      const failedUsage = await CouponUsage.findOne({
        userId: testUser._id,
        status: 'failed'
      });
      expect(failedUsage).toBeDefined();
      expect(failedUsage.failureReason).toContain('Minimum order amount');
    });

    test('should reject expired coupon', async () => {
      // Create expired coupon
      const expiredCoupon = await Coupon.create({
        code: 'EXPIRED',
        domain: 'teststore.com',
        title: 'Expired Coupon',
        discountType: 'percentage',
        discountValue: 30,
        expiresAt: new Date(Date.now() - 1000),
        source: { provider: 'test' }
      });

      const requestData = {
        couponCode: 'EXPIRED',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 100
        }
      };

      const response = await request(app)
        .post('/api/savings/apply')
        .send(requestData)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_EXPIRED');
    });

    test('should reject one-time use coupon if already used', async () => {
      // Update coupon to be one-time use
      testCoupon.userRestrictions.oneTimeUse = true;
      await testCoupon.save();

      // Create previous usage
      await CouponUsage.create({
        userId: testUser._id,
        couponId: testCoupon._id,
        couponCode: 'SAVE20',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 100,
          discountAmount: 20,
          finalAmount: 80
        },
        status: 'successful'
      });

      const requestData = {
        couponCode: 'SAVE20',
        domain: 'teststore.com',
        orderDetails: {
          originalAmount: 100
        }
      };

      const response = await request(app)
        .post('/api/savings/apply')
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_ALREADY_USED');
    });

    test('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/savings/apply')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/savings/summary', () => {
    beforeEach(async () => {
      // Create some usage records
      await CouponUsage.create([
        {
          userId: testUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 100,
            discountAmount: 20,
            finalAmount: 80
          },
          status: 'successful',
          appliedAt: new Date()
        },
        {
          userId: testUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'amazon.com',
          orderDetails: {
            originalAmount: 200,
            discountAmount: 40,
            finalAmount: 160
          },
          status: 'successful',
          appliedAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
        }
      ]);

      // Update user savings
      await testUser.addSavings(60);
    });

    test('should get savings summary successfully', async () => {
      const response = await request(app)
        .get('/api/savings/summary')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.user.id).toBe(testUser._id.toString());
      expect(response.body.summary.lifetimeSavings).toBe(60);
      expect(response.body.summary.totalSaved).toBe(60);
      expect(response.body.summary.periodSavings).toBe(60);
      expect(response.body.summary.periodOrders).toBe(2);
      expect(response.body.breakdown.byDomain).toHaveLength(2);
      expect(response.body.breakdown.recentUsage).toHaveLength(2);
    });

    test('should filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/savings/summary?dateFrom=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary.periodOrders).toBe(1); // Only today's order
      expect(response.body.dateRange.from).toBe(today);
    });

    test('should filter by domain', async () => {
      const response = await request(app)
        .get('/api/savings/summary?domain=teststore.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.breakdown.recentUsage).toHaveLength(1);
      expect(response.body.breakdown.recentUsage[0].domain).toBe('teststore.com');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/savings/summary')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/savings/history', () => {
    beforeEach(async () => {
      // Create usage history
      await CouponUsage.create([
        {
          userId: testUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 100,
            discountAmount: 20,
            finalAmount: 80
          },
          status: 'successful'
        },
        {
          userId: testUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 30,
            discountAmount: 0,
            finalAmount: 30
          },
          status: 'failed',
          failureReason: 'Minimum order not met'
        }
      ]);
    });

    test('should get usage history successfully', async () => {
      const response = await request(app)
        .get('/api/savings/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(2);
      expect(response.body.pagination.totalCount).toBe(2);
      expect(response.body.pagination.currentPage).toBe(1);
      expect(response.body.history[0].couponCode).toBe('SAVE20');
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/savings/history?status=successful')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(1);
      expect(response.body.history[0].status).toBe('successful');
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/savings/history?limit=1&page=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.history).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(false);
      expect(response.body.pagination.hasPrevPage).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/savings/history')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/savings/leaderboard', () => {
    let proUser, proToken;

    beforeEach(async () => {
      // Create pro user
      proUser = await User.create({
        email: 'pro@example.com',
        password: 'Password123',
        profile: { name: 'Pro User' },
        subscription: { tier: 'pro', status: 'active' }
      });

      proToken = proUser.generateAuthToken();

      // Create usage records for leaderboard
      await CouponUsage.create([
        {
          userId: testUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 100,
            discountAmount: 20,
            finalAmount: 80
          },
          status: 'successful'
        },
        {
          userId: proUser._id,
          couponId: testCoupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 200,
            discountAmount: 40,
            finalAmount: 160
          },
          status: 'successful'
        }
      ]);
    });

    test('should get leaderboard for pro user', async () => {
      const response = await request(app)
        .get('/api/savings/leaderboard')
        .set('Authorization', `Bearer ${proToken}`)
        .expect(200);

      expect(response.body.leaderboard).toHaveLength(2);
      expect(response.body.leaderboard[0].rank).toBe(1);
      expect(response.body.leaderboard[0].totalSavings).toBe(40); // Pro user should be first
      expect(response.body.leaderboard[1].totalSavings).toBe(20);
      expect(response.body.period).toBe('all');
    });

    test('should filter by period', async () => {
      const response = await request(app)
        .get('/api/savings/leaderboard?period=month')
        .set('Authorization', `Bearer ${proToken}`)
        .expect(200);

      expect(response.body.period).toBe('month');
      expect(response.body.leaderboard).toHaveLength(2);
    });

    test('should require pro features', async () => {
      const response = await request(app)
        .get('/api/savings/leaderboard')
        .set('Authorization', `Bearer ${authToken}`) // Free user
        .expect(403);

      expect(response.body.error.code).toBe('PRO_SUBSCRIPTION_REQUIRED');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/savings/leaderboard')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/savings/update/:userId', () => {
    test('should update user savings manually', async () => {
      const requestData = {
        amount: 50,
        operation: 'add',
        reason: 'Manual adjustment'
      };

      const response = await request(app)
        .put(`/api/savings/update/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.message).toBe('Savings updated successfully');
      expect(response.body.savings.current).toBe(50);
      expect(response.body.savings.change).toBe(50);

      // Verify user was updated
      const updatedUser = await User.findById(testUser._id);
      expect(updatedUser.savings.totalSaved).toBe(50);
    });

    test('should subtract savings', async () => {
      // First add some savings
      await testUser.addSavings(100);

      const requestData = {
        amount: 30,
        operation: 'subtract'
      };

      const response = await request(app)
        .put(`/api/savings/update/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.savings.current).toBe(70);
      expect(response.body.savings.change).toBe(-30);
    });

    test('should not allow negative savings', async () => {
      const requestData = {
        amount: 50,
        operation: 'subtract'
      };

      const response = await request(app)
        .put(`/api/savings/update/${testUser._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(requestData)
        .expect(200);

      expect(response.body.savings.current).toBe(0); // Should not go below 0
    });

    test('should fail with invalid user ID', async () => {
      const response = await request(app)
        .put('/api/savings/update/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ amount: 50 })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .put(`/api/savings/update/${testUser._id}`)
        .send({ amount: 50 })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });
});