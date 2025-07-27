const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const WishlistItem = require('../../backend/models/WishlistItem');
const PriceAlert = require('../../backend/models/PriceAlert');

describe('Price Tracking Routes', () => {
  let testUser, authToken, proUser, proToken;

  beforeEach(async () => {
    // Create test users
    testUser = await User.create({
      email: 'pricetrack@example.com',
      password: 'Password123',
      profile: { name: 'Price Track User' }
    });

    proUser = await User.create({
      email: 'pro@example.com',
      password: 'Password123',
      profile: { name: 'Pro User' },
      subscription: { tier: 'pro', status: 'active' }
    });

    authToken = testUser.generateAuthToken();
    proToken = proUser.generateAuthToken();
  });

  describe('GET /api/price-tracking/status', () => {
    test('should get price tracking status', async () => {
      const response = await request(app)
        .get('/api/price-tracking/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.service).toBeDefined();
      expect(response.body.statistics).toBeDefined();
      expect(response.body.statistics.activelyTrackedItems).toBeGreaterThanOrEqual(0);
      expect(response.body.statistics.pendingAlerts).toBeGreaterThanOrEqual(0);
      expect(response.body.timestamp).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/price-tracking/status')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/price-tracking/check/:itemId', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await WishlistItem.create({
        userId: testUser._id,
        product: {
          name: 'Test Product',
          brand: 'Test Brand'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 100,
          isTracking: true
        },
        sources: [{
          name: 'Test Store',
          url: 'https://teststore.com/product',
          domain: 'teststore.com',
          price: 100,
          isActive: true
        }],
        status: 'active'
      });
    });

    test('should check item price successfully', async () => {
      const response = await request(app)
        .post(`/api/price-tracking/check/${testItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Price check completed');
      expect(response.body.item.id).toBe(testItem._id.toString());
      expect(response.body.item.name).toBe('Test Product');
      expect(response.body.result.status).toMatch(/updated|no_change|no_updates/);
      expect(response.body.item.lastChecked).toBeDefined();
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .post(`/api/price-tracking/check/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    test('should not allow checking other users items', async () => {
      const otherUserItem = await WishlistItem.create({
        userId: proUser._id,
        product: { name: 'Other User Product' },
        tracking: { originalPrice: 100, currentPrice: 100, isTracking: true },
        status: 'active'
      });

      const response = await request(app)
        .post(`/api/price-tracking/check/${otherUserItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    test('should reject items with tracking disabled', async () => {
      testItem.tracking.isTracking = false;
      await testItem.save();

      const response = await request(app)
        .post(`/api/price-tracking/check/${testItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('TRACKING_DISABLED');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post(`/api/price-tracking/check/${testItem._id}`)
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/price-tracking/check-wishlist', () => {
    beforeEach(async () => {
      // Create multiple test items
      await WishlistItem.create([
        {
          userId: testUser._id,
          product: { name: 'Product 1' },
          tracking: { originalPrice: 100, currentPrice: 100, isTracking: true },
          sources: [{ name: 'Store A', url: 'https://storea.com/1', domain: 'storea.com', price: 100, isActive: true }],
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 2' },
          tracking: { originalPrice: 200, currentPrice: 200, isTracking: true },
          sources: [{ name: 'Store B', url: 'https://storeb.com/2', domain: 'storeb.com', price: 200, isActive: true }],
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 3' },
          tracking: { originalPrice: 50, currentPrice: 50, isTracking: false },
          status: 'active'
        }
      ]);
    });

    test('should check all trackable items in wishlist', async () => {
      const response = await request(app)
        .post('/api/price-tracking/check-wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toContain('completed');
      expect(response.body.summary.total).toBe(2); // Only trackable items
      expect(response.body.results).toHaveLength(2);
      expect(response.body.checkedAt).toBeDefined();
    });

    test('should handle empty wishlist', async () => {
      // Remove all items
      await WishlistItem.deleteMany({ userId: testUser._id });

      const response = await request(app)
        .post('/api/price-tracking/check-wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary.total).toBe(0);
      expect(response.body.results).toHaveLength(0);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/price-tracking/check-wishlist')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/price-tracking/alerts', () => {
    beforeEach(async () => {
      const testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Alert Product' },
        tracking: { originalPrice: 100, currentPrice: 80 },
        status: 'active'
      });

      // Create test alerts
      await PriceAlert.create([
        {
          userId: testUser._id,
          wishlistItemId: testItem._id,
          alertType: 'price_drop',
          trigger: {
            previousPrice: 100,
            currentPrice: 80,
            dropAmount: 20,
            dropPercentage: 20
          },
          product: {
            name: 'Alert Product',
            brand: 'Test Brand'
          },
          source: {
            name: 'Test Store',
            domain: 'teststore.com',
            url: 'https://teststore.com/product'
          },
          status: 'sent'
        },
        {
          userId: testUser._id,
          wishlistItemId: testItem._id,
          alertType: 'target_price',
          trigger: {
            targetPrice: 75,
            currentPrice: 75
          },
          product: {
            name: 'Alert Product',
            brand: 'Test Brand'
          },
          source: {
            name: 'Test Store',
            domain: 'teststore.com'
          },
          status: 'pending',
          notification: {
            inApp: { read: false }
          }
        }
      ]);
    });

    test('should get user alerts successfully', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(2);
      expect(response.body.pagination.totalCount).toBe(2);
      expect(response.body.alerts[0].type).toMatch(/price_drop|target_price/);
      expect(response.body.alerts[0].message).toBeDefined();
      expect(response.body.alerts[0].product.name).toBe('Alert Product');
    });

    test('should filter alerts by status', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts?status=pending')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].status).toBe('pending');
    });

    test('should filter alerts by type', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts?alertType=price_drop')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].type).toBe('price_drop');
    });

    test('should filter unread alerts only', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts?unreadOnly=true')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.alerts[0].isRead).toBe(false);
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts?limit=1&page=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.alerts).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.hasPrevPage).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('PUT /api/price-tracking/alerts/:alertId/read', () => {
    let testAlert;

    beforeEach(async () => {
      const testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Alert Product' },
        tracking: { originalPrice: 100, currentPrice: 80 },
        status: 'active'
      });

      testAlert = await PriceAlert.create({
        userId: testUser._id,
        wishlistItemId: testItem._id,
        alertType: 'price_drop',
        trigger: { previousPrice: 100, currentPrice: 80 },
        product: { name: 'Alert Product' },
        source: { name: 'Test Store', domain: 'teststore.com' },
        status: 'sent',
        notification: { inApp: { read: false } }
      });
    });

    test('should mark alert as read successfully', async () => {
      const response = await request(app)
        .put(`/api/price-tracking/alerts/${testAlert._id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Alert marked as read');
      expect(response.body.alert.isRead).toBe(true);
      expect(response.body.alert.readAt).toBeDefined();

      // Verify in database
      const updatedAlert = await PriceAlert.findById(testAlert._id);
      expect(updatedAlert.notification.inApp.read).toBe(true);
    });

    test('should return 404 for non-existent alert', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/price-tracking/alerts/${fakeId}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ALERT_NOT_FOUND');
    });

    test('should not allow accessing other users alerts', async () => {
      const otherUserAlert = await PriceAlert.create({
        userId: proUser._id,
        wishlistItemId: testAlert.wishlistItemId,
        alertType: 'price_drop',
        trigger: { previousPrice: 100, currentPrice: 80 },
        product: { name: 'Other User Alert' },
        source: { name: 'Test Store', domain: 'teststore.com' },
        status: 'sent'
      });

      const response = await request(app)
        .put(`/api/price-tracking/alerts/${otherUserAlert._id}/read`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ALERT_NOT_FOUND');
    });
  });

  describe('DELETE /api/price-tracking/alerts/:alertId', () => {
    let testAlert;

    beforeEach(async () => {
      const testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Alert Product' },
        tracking: { originalPrice: 100, currentPrice: 80 },
        status: 'active'
      });

      testAlert = await PriceAlert.create({
        userId: testUser._id,
        wishlistItemId: testItem._id,
        alertType: 'price_drop',
        trigger: { previousPrice: 100, currentPrice: 80 },
        product: { name: 'Alert Product' },
        source: { name: 'Test Store', domain: 'teststore.com' },
        status: 'sent'
      });
    });

    test('should dismiss alert successfully', async () => {
      const response = await request(app)
        .delete(`/api/price-tracking/alerts/${testAlert._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Alert dismissed successfully');
      expect(response.body.alertId).toBe(testAlert._id.toString());

      // Verify in database
      const dismissedAlert = await PriceAlert.findById(testAlert._id);
      expect(dismissedAlert.status).toBe('dismissed');
    });

    test('should return 404 for non-existent alert', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/price-tracking/alerts/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ALERT_NOT_FOUND');
    });
  });

  describe('GET /api/price-tracking/alerts/stats', () => {
    beforeEach(async () => {
      const testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Stats Product' },
        tracking: { originalPrice: 100, currentPrice: 80 },
        status: 'active'
      });

      // Create alerts for statistics
      await PriceAlert.create([
        {
          userId: testUser._id,
          wishlistItemId: testItem._id,
          alertType: 'price_drop',
          trigger: { previousPrice: 100, currentPrice: 80, dropAmount: 20 },
          product: { name: 'Stats Product' },
          source: { name: 'Test Store', domain: 'teststore.com' },
          status: 'sent',
          notification: { inApp: { read: false } }
        },
        {
          userId: testUser._id,
          wishlistItemId: testItem._id,
          alertType: 'target_price',
          trigger: { targetPrice: 75, currentPrice: 75 },
          product: { name: 'Stats Product' },
          source: { name: 'Test Store', domain: 'teststore.com' },
          status: 'sent',
          notification: { inApp: { read: true } }
        }
      ]);
    });

    test('should get alert statistics successfully', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary.unreadAlerts).toBe(1);
      expect(response.body.summary.totalSavingsFromAlerts).toBe(20);
      expect(response.body.summary.totalAlertsTriggered).toBe(1); // Only price_drop alerts count for savings
      expect(response.body.breakdown).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
    });

    test('should filter by date range', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      const response = await request(app)
        .get(`/api/price-tracking/alerts/stats?dateFrom=${today}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.dateRange.from).toBe(today);
      expect(response.body.summary).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/price-tracking/alerts/stats')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('Admin Routes', () => {
    describe('POST /api/price-tracking/service/control', () => {
      test('should control service for pro users', async () => {
        const response = await request(app)
          .post('/api/price-tracking/service/control')
          .set('Authorization', `Bearer ${proToken}`)
          .send({ action: 'start' })
          .expect(200);

        expect(response.body.message).toContain('started successfully');
        expect(response.body.status).toBeDefined();
      });

      test('should reject invalid actions', async () => {
        const response = await request(app)
          .post('/api/price-tracking/service/control')
          .set('Authorization', `Bearer ${proToken}`)
          .send({ action: 'invalid' })
          .expect(400);

        expect(response.body.error.code).toBe('INVALID_ACTION');
      });

      test('should require pro features', async () => {
        const response = await request(app)
          .post('/api/price-tracking/service/control')
          .set('Authorization', `Bearer ${authToken}`) // Free user
          .send({ action: 'start' })
          .expect(403);

        expect(response.body.error.code).toBe('PRO_SUBSCRIPTION_REQUIRED');
      });
    });

    describe('POST /api/price-tracking/notifications/process', () => {
      test('should process pending notifications for pro users', async () => {
        const response = await request(app)
          .post('/api/price-tracking/notifications/process')
          .set('Authorization', `Bearer ${proToken}`)
          .expect(200);

        expect(response.body.message).toBeDefined();
        expect(response.body.statistics).toBeDefined();
        expect(response.body.processedAt).toBeDefined();
      });

      test('should require pro features', async () => {
        const response = await request(app)
          .post('/api/price-tracking/notifications/process')
          .set('Authorization', `Bearer ${authToken}`) // Free user
          .expect(403);

        expect(response.body.error.code).toBe('PRO_SUBSCRIPTION_REQUIRED');
      });
    });
  });
});