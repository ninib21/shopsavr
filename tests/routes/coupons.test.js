const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const Coupon = require('../../backend/models/Coupon');
const CouponUsage = require('../../backend/models/CouponUsage');

describe('Coupon Routes', () => {
  let testUser, authToken;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      email: 'coupon@example.com',
      password: 'Password123',
      profile: { name: 'Coupon User' }
    });

    authToken = testUser.generateAuthToken();

    // Create test coupons
    await Coupon.create([
      {
        code: 'SAVE20',
        domain: 'teststore.com',
        title: '20% Off Everything',
        description: 'Save 20% on all items',
        discountType: 'percentage',
        discountValue: 20,
        minimumOrder: 50,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' },
        usageStats: { successfulUses: 10, totalAttempts: 12 }
      },
      {
        code: 'FIXED15',
        domain: 'teststore.com',
        title: '$15 Off',
        description: 'Get $15 off your order',
        discountType: 'fixed',
        discountValue: 15,
        minimumOrder: 100,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' },
        usageStats: { successfulUses: 5, totalAttempts: 8 }
      },
      {
        code: 'EXPIRED',
        domain: 'teststore.com',
        title: 'Expired Coupon',
        discountType: 'percentage',
        discountValue: 30,
        expiresAt: new Date(Date.now() - 1000),
        source: { provider: 'test' }
      },
      {
        code: 'INACTIVE',
        domain: 'teststore.com',
        title: 'Inactive Coupon',
        discountType: 'percentage',
        discountValue: 25,
        isActive: false,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' }
      }
    ]);
  });

  describe('GET /api/coupons/search/:domain', () => {
    test('should search coupons for domain successfully', async () => {
      const response = await request(app)
        .get('/api/coupons/search/teststore.com')
        .expect(200);

      expect(response.body.domain).toBe('teststore.com');
      expect(response.body.coupons).toHaveLength(2); // Only active, non-expired coupons
      expect(response.body.total).toBe(2);
      
      // Should be sorted by success rate (SAVE20 has higher success rate)
      expect(response.body.coupons[0].code).toBe('SAVE20');
      expect(response.body.coupons[1].code).toBe('FIXED15');
    });

    test('should filter coupons by discount type', async () => {
      const response = await request(app)
        .get('/api/coupons/search/teststore.com?discountType=fixed')
        .expect(200);

      expect(response.body.coupons).toHaveLength(1);
      expect(response.body.coupons[0].code).toBe('FIXED15');
      expect(response.body.coupons[0].discountType).toBe('fixed');
    });

    test('should sort coupons by discount value', async () => {
      const response = await request(app)
        .get('/api/coupons/search/teststore.com?sortBy=discount_value')
        .expect(200);

      expect(response.body.coupons).toHaveLength(2);
      expect(response.body.coupons[0].discountValue).toBeGreaterThanOrEqual(
        response.body.coupons[1].discountValue
      );
    });

    test('should limit results', async () => {
      const response = await request(app)
        .get('/api/coupons/search/teststore.com?limit=1')
        .expect(200);

      expect(response.body.coupons).toHaveLength(1);
    });

    test('should return empty results for unknown domain', async () => {
      const response = await request(app)
        .get('/api/coupons/search/unknown.com')
        .expect(200);

      expect(response.body.coupons).toHaveLength(0);
      expect(response.body.total).toBe(0);
    });

    test('should fail with invalid domain', async () => {
      const response = await request(app)
        .get('/api/coupons/search/invalid-domain')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/coupons/validate', () => {
    test('should validate coupon successfully', async () => {
      const requestData = {
        code: 'SAVE20',
        domain: 'teststore.com',
        orderData: {
          amount: 100,
          categories: [],
          isNewUser: false
        }
      };

      const response = await request(app)
        .post('/api/coupons/validate')
        .send(requestData)
        .expect(200);

      expect(response.body.valid).toBe(true);
      expect(response.body.coupon.code).toBe('SAVE20');
      expect(response.body.discount.amount).toBe(20); // 20% of 100
      expect(response.body.discount.finalAmount).toBe(80);
    });

    test('should reject coupon below minimum order', async () => {
      const requestData = {
        code: 'SAVE20',
        domain: 'teststore.com',
        orderData: {
          amount: 30 // Below minimum of 50
        }
      };

      const response = await request(app)
        .post('/api/coupons/validate')
        .send(requestData)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_NOT_APPLICABLE');
      expect(response.body.error.message).toContain('Minimum order amount');
    });

    test('should reject expired coupon', async () => {
      const requestData = {
        code: 'EXPIRED',
        domain: 'teststore.com',
        orderData: {
          amount: 100
        }
      };

      const response = await request(app)
        .post('/api/coupons/validate')
        .send(requestData)
        .expect(400);

      expect(response.body.error.code).toBe('COUPON_EXPIRED');
    });

    test('should reject non-existent coupon', async () => {
      const requestData = {
        code: 'NONEXISTENT',
        domain: 'teststore.com',
        orderData: {
          amount: 100
        }
      };

      const response = await request(app)
        .post('/api/coupons/validate')
        .send(requestData)
        .expect(404);

      expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    test('should reject inactive coupon', async () => {
      const requestData = {
        code: 'INACTIVE',
        domain: 'teststore.com',
        orderData: {
          amount: 100
        }
      };

      const response = await request(app)
        .post('/api/coupons/validate')
        .send(requestData)
        .expect(404);

      expect(response.body.error.code).toBe('COUPON_NOT_FOUND');
    });

    test('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/coupons/best/:domain', () => {
    test('should find best coupon for order', async () => {
      const requestData = {
        amount: 100,
        categories: [],
        isNewUser: false
      };

      const response = await request(app)
        .post('/api/coupons/best/teststore.com')
        .send(requestData)
        .expect(200);

      expect(response.body.bestCoupon).toBeDefined();
      expect(response.body.bestCoupon.code).toBe('SAVE20'); // 20% off 100 = 20, better than $15 fixed
      expect(response.body.discount.amount).toBe(20);
      expect(response.body.discount.savingsPercentage).toBe('20.00');
    });

    test('should return null when no applicable coupons', async () => {
      const requestData = {
        amount: 10, // Below minimum for both coupons
        categories: []
      };

      const response = await request(app)
        .post('/api/coupons/best/teststore.com')
        .send(requestData)
        .expect(200);

      expect(response.body.bestCoupon).toBeNull();
      expect(response.body.message).toContain('No applicable coupons found');
    });

    test('should choose fixed discount when better', async () => {
      const requestData = {
        amount: 150, // $15 fixed vs 20% (30) - percentage is better
        categories: []
      };

      const response = await request(app)
        .post('/api/coupons/best/teststore.com')
        .send(requestData)
        .expect(200);

      expect(response.body.bestCoupon.code).toBe('SAVE20'); // 20% of 150 = 30 > 15
      expect(response.body.discount.amount).toBe(30);
    });

    test('should fail with missing amount', async () => {
      const response = await request(app)
        .post('/api/coupons/best/teststore.com')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/coupons/stats/:couponId', () => {
    let couponId;

    beforeEach(async () => {
      const coupon = await Coupon.findOne({ code: 'SAVE20' });
      couponId = coupon._id.toString();

      // Create some usage records
      await CouponUsage.create([
        {
          userId: testUser._id,
          couponId: coupon._id,
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
          couponId: coupon._id,
          couponCode: 'SAVE20',
          domain: 'teststore.com',
          orderDetails: {
            originalAmount: 50,
            discountAmount: 0,
            finalAmount: 50
          },
          status: 'failed',
          failureReason: 'Minimum order not met'
        }
      ]);
    });

    test('should get coupon statistics', async () => {
      const response = await request(app)
        .get(`/api/coupons/stats/${couponId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.coupon.code).toBe('SAVE20');
      expect(response.body.statistics.basicStats.totalAttempts).toBe(12);
      expect(response.body.statistics.basicStats.successfulUses).toBe(10);
      expect(response.body.statistics.basicStats.successRate).toBeCloseTo(0.833, 2);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/coupons/stats/${couponId}`)
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should fail with invalid coupon ID', async () => {
      const response = await request(app)
        .get('/api/coupons/stats/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(500);

      expect(response.body.error.code).toBe('COUPON_STATS_FAILED');
    });
  });

  describe('GET /api/coupons/domain-stats/:domain', () => {
    test('should get domain statistics', async () => {
      const response = await request(app)
        .get('/api/coupons/domain-stats/teststore.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.domain).toBe('teststore.com');
      expect(response.body.couponStatistics.totalCoupons).toBe(4);
      expect(response.body.couponStatistics.activeCoupons).toBe(2);
      expect(response.body.topPerformingCoupons).toBeDefined();
      expect(response.body.usageStatistics).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/coupons/domain-stats/teststore.com')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('DELETE /api/coupons/cache/:domain', () => {
    test('should clear cache for domain', async () => {
      const response = await request(app)
        .delete('/api/coupons/cache/teststore.com')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Cache cleared successfully');
      expect(response.body.domain).toBe('teststore.com');
      expect(response.body.keysCleared).toBeGreaterThanOrEqual(0);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/coupons/cache/teststore.com')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });
});