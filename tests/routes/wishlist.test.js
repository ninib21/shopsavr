const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const WishlistItem = require('../../backend/models/WishlistItem');

describe('Wishlist Routes', () => {
  let testUser, authToken, proUser, proToken;

  beforeEach(async () => {
    // Create test users
    testUser = await User.create({
      email: 'wishlist@example.com',
      password: 'Password123',
      profile: { name: 'Wishlist User' }
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

  describe('GET /api/wishlist', () => {
    beforeEach(async () => {
      // Create test wishlist items
      await WishlistItem.create([
        {
          userId: testUser._id,
          product: {
            name: 'iPhone 15 Pro',
            brand: 'Apple',
            category: 'electronics',
            image: 'https://example.com/iphone.jpg'
          },
          tracking: {
            originalPrice: 999,
            currentPrice: 949,
            currency: 'USD'
          },
          metadata: {
            priority: 'high',
            tags: ['smartphone', 'apple']
          },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: {
            name: 'MacBook Pro',
            brand: 'Apple',
            category: 'electronics'
          },
          tracking: {
            originalPrice: 2499,
            currentPrice: 2399,
            currency: 'USD'
          },
          metadata: {
            priority: 'medium'
          },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: {
            name: 'Purchased Item',
            brand: 'Test'
          },
          tracking: {
            originalPrice: 100,
            currentPrice: 90
          },
          status: 'purchased',
          purchasedAt: new Date(),
          purchasePrice: 85
        }
      ]);
    });

    test('should get user wishlist successfully', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2); // Only active items by default
      expect(response.body.pagination.totalCount).toBe(2);
      expect(response.body.items[0].product.name).toBe('MacBook Pro'); // Most recent first
      expect(response.body.items[0].pricing.savingsAmount).toBe(100);
      expect(response.body.items[0].pricing.hasPriceDropped).toBe(true);
    });

    test('should filter by status', async () => {
      const response = await request(app)
        .get('/api/wishlist?status=purchased')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].status).toBe('purchased');
      expect(response.body.items[0].purchasePrice).toBe(85);
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/wishlist?category=electronics')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.items.every(item => item.product.category === 'electronics')).toBe(true);
    });

    test('should filter by tags', async () => {
      const response = await request(app)
        .get('/api/wishlist?tags=smartphone,apple')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].product.name).toBe('iPhone 15 Pro');
    });

    test('should filter by priority', async () => {
      const response = await request(app)
        .get('/api/wishlist?priority=high')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].metadata.priority).toBe('high');
    });

    test('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/wishlist?priceMin=1000&priceMax=3000')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].product.name).toBe('MacBook Pro');
    });

    test('should sort by price', async () => {
      const response = await request(app)
        .get('/api/wishlist?sortBy=price_low')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items[0].pricing.currentPrice).toBeLessThanOrEqual(
        response.body.items[1].pricing.currentPrice
      );
    });

    test('should paginate results', async () => {
      const response = await request(app)
        .get('/api/wishlist?limit=1&page=2')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.pagination.currentPage).toBe(2);
      expect(response.body.pagination.hasNextPage).toBe(false);
      expect(response.body.pagination.hasPrevPage).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/wishlist')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/wishlist', () => {
    test('should add item to wishlist successfully', async () => {
      const itemData = {
        product: {
          name: 'AirPods Pro',
          brand: 'Apple',
          category: 'electronics',
          image: 'https://example.com/airpods.jpg',
          barcode: '123456789012'
        },
        pricing: {
          originalPrice: 249,
          currentPrice: 229,
          currency: 'USD'
        },
        sources: [{
          name: 'Apple Store',
          url: 'https://apple.com/airpods',
          domain: 'apple.com',
          price: 229
        }],
        alerts: {
          priceDropThreshold: 15,
          targetPrice: 200
        },
        metadata: {
          tags: ['audio', 'wireless'],
          notes: 'Want these for gym',
          priority: 'high'
        }
      };

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.message).toBe('Item added to wishlist successfully');
      expect(response.body.item.product.name).toBe('AirPods Pro');
      expect(response.body.item.pricing.originalPrice).toBe(249);
      expect(response.body.item.alerts.targetPrice).toBe(200);
      expect(response.body.item.metadata.tags).toEqual(['audio', 'wireless']);
      expect(response.body.item.sources).toHaveLength(1);

      // Verify item was created in database
      const savedItem = await WishlistItem.findById(response.body.item.id);
      expect(savedItem).toBeTruthy();
      expect(savedItem.product.name).toBe('AirPods Pro');
    });

    test('should prevent duplicate items with same barcode', async () => {
      // Create existing item
      await WishlistItem.create({
        userId: testUser._id,
        product: {
          name: 'Existing Product',
          barcode: '123456789012'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 100
        }
      });

      const itemData = {
        product: {
          name: 'Duplicate Product',
          barcode: '123456789012'
        },
        pricing: {
          originalPrice: 100
        }
      };

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(409);

      expect(response.body.error.code).toBe('DUPLICATE_ITEM');
    });

    test('should enforce wishlist limits for free users', async () => {
      // Create 50 items (free tier limit)
      const items = Array(50).fill().map((_, i) => ({
        userId: testUser._id,
        product: { name: `Product ${i}` },
        tracking: { originalPrice: 100, currentPrice: 100 }
      }));
      
      await WishlistItem.create(items);

      const itemData = {
        product: { name: 'Limit Exceeded Product' },
        pricing: { originalPrice: 100 }
      };

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send(itemData)
        .expect(403);

      expect(response.body.error.code).toBe('WISHLIST_LIMIT_EXCEEDED');
      expect(response.body.error.limit).toBe(50);
      expect(response.body.error.upgradeUrl).toBe('/upgrade');
    });

    test('should allow higher limits for pro users', async () => {
      // Create 50 items for pro user (should be allowed)
      const items = Array(50).fill().map((_, i) => ({
        userId: proUser._id,
        product: { name: `Pro Product ${i}` },
        tracking: { originalPrice: 100, currentPrice: 100 }
      }));
      
      await WishlistItem.create(items);

      const itemData = {
        product: { name: 'Pro User Product' },
        pricing: { originalPrice: 100 }
      };

      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${proToken}`)
        .send(itemData)
        .expect(201);

      expect(response.body.item.product.name).toBe('Pro User Product');
    });

    test('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/wishlist')
        .send({ product: { name: 'Test' }, pricing: { originalPrice: 100 } })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('GET /api/wishlist/:itemId', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await WishlistItem.create({
        userId: testUser._id,
        product: {
          name: 'Test Product',
          brand: 'Test Brand',
          category: 'electronics'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 90,
          priceHistory: [
            { price: 100, source: 'Store A', recordedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) },
            { price: 95, source: 'Store B', recordedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) },
            { price: 90, source: 'Store A', recordedAt: new Date() }
          ]
        },
        sources: [{
          name: 'Store A',
          url: 'https://storea.com/product',
          domain: 'storea.com',
          price: 90
        }]
      });
    });

    test('should get item details successfully', async () => {
      const response = await request(app)
        .get(`/api/wishlist/${testItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.item.id).toBe(testItem._id.toString());
      expect(response.body.item.product.name).toBe('Test Product');
      expect(response.body.item.pricing.savingsAmount).toBe(10);
      expect(response.body.item.tracking.priceHistory).toHaveLength(3);
      expect(response.body.item.sources).toHaveLength(1);
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/wishlist/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    test('should not allow access to other users items', async () => {
      const otherUserItem = await WishlistItem.create({
        userId: proUser._id,
        product: { name: 'Other User Product' },
        tracking: { originalPrice: 100, currentPrice: 100 }
      });

      const response = await request(app)
        .get(`/api/wishlist/${otherUserItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    test('should fail with invalid item ID', async () => {
      const response = await request(app)
        .get('/api/wishlist/invalid-id')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/wishlist/:itemId', () => {
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
          currentPrice: 100
        },
        alerts: {
          priceDropThreshold: 10,
          targetPrice: 80
        },
        metadata: {
          tags: ['old-tag'],
          notes: 'Old notes',
          priority: 'medium'
        }
      });
    });

    test('should update item successfully', async () => {
      const updates = {
        product: {
          name: 'Updated Product Name',
          description: 'New description'
        },
        alerts: {
          priceDropThreshold: 20,
          targetPrice: 75
        },
        metadata: {
          tags: ['new-tag', 'updated'],
          notes: 'Updated notes',
          priority: 'high'
        },
        tracking: {
          checkFrequency: 'hourly',
          isTracking: false
        }
      };

      const response = await request(app)
        .put(`/api/wishlist/${testItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates)
        .expect(200);

      expect(response.body.message).toBe('Item updated successfully');
      expect(response.body.item.product.name).toBe('Updated Product Name');
      expect(response.body.item.alerts.priceDropThreshold).toBe(20);
      expect(response.body.item.metadata.tags).toEqual(['new-tag', 'updated']);
      expect(response.body.item.tracking.checkFrequency).toBe('hourly');

      // Verify in database
      const updatedItem = await WishlistItem.findById(testItem._id);
      expect(updatedItem.product.name).toBe('Updated Product Name');
      expect(updatedItem.alerts.targetPrice).toBe(75);
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .put(`/api/wishlist/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ product: { name: 'Updated' } })
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });

    test('should not allow updating other users items', async () => {
      const otherUserItem = await WishlistItem.create({
        userId: proUser._id,
        product: { name: 'Other User Product' },
        tracking: { originalPrice: 100, currentPrice: 100 }
      });

      const response = await request(app)
        .put(`/api/wishlist/${otherUserItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ product: { name: 'Hacked' } })
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('POST /api/wishlist/:itemId/purchase', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Test Product' },
        tracking: { originalPrice: 100, currentPrice: 90 },
        status: 'active'
      });
    });

    test('should mark item as purchased successfully', async () => {
      const purchaseData = {
        purchasePrice: 85,
        purchaseDate: new Date().toISOString()
      };

      const response = await request(app)
        .post(`/api/wishlist/${testItem._id}/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(purchaseData)
        .expect(200);

      expect(response.body.message).toBe('Item marked as purchased successfully');
      expect(response.body.item.status).toBe('purchased');
      expect(response.body.item.purchasePrice).toBe(85);
      expect(response.body.item.savings).toBe(15); // 100 - 85

      // Verify in database
      const updatedItem = await WishlistItem.findById(testItem._id);
      expect(updatedItem.status).toBe('purchased');
      expect(updatedItem.tracking.isTracking).toBe(false);
    });

    test('should use current price if no purchase price provided', async () => {
      const response = await request(app)
        .post(`/api/wishlist/${testItem._id}/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(200);

      expect(response.body.item.purchasePrice).toBe(90); // Current price
    });

    test('should return 404 for non-active item', async () => {
      testItem.status = 'purchased';
      await testItem.save();

      const response = await request(app)
        .post(`/api/wishlist/${testItem._id}/purchase`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ purchasePrice: 85 })
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('DELETE /api/wishlist/:itemId', () => {
    let testItem;

    beforeEach(async () => {
      testItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Test Product' },
        tracking: { originalPrice: 100, currentPrice: 100 },
        status: 'active'
      });
    });

    test('should remove item successfully', async () => {
      const response = await request(app)
        .delete(`/api/wishlist/${testItem._id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Item removed from wishlist successfully');
      expect(response.body.itemId).toBe(testItem._id.toString());

      // Verify item is marked as removed
      const removedItem = await WishlistItem.findById(testItem._id);
      expect(removedItem.status).toBe('removed');
      expect(removedItem.tracking.isTracking).toBe(false);
    });

    test('should return 404 for non-existent item', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .delete(`/api/wishlist/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('ITEM_NOT_FOUND');
    });
  });

  describe('GET /api/wishlist/stats', () => {
    beforeEach(async () => {
      await WishlistItem.create([
        {
          userId: testUser._id,
          product: { name: 'Active Item 1' },
          tracking: { originalPrice: 100, currentPrice: 90 },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Active Item 2' },
          tracking: { originalPrice: 200, currentPrice: 180 },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Purchased Item' },
          tracking: { originalPrice: 50, currentPrice: 45 },
          status: 'purchased',
          purchasePrice: 40
        }
      ]);
    });

    test('should get wishlist statistics successfully', async () => {
      const response = await request(app)
        .get('/api/wishlist/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.summary.totalItems).toBe(3);
      expect(response.body.summary.totalValue).toBe(270); // 90 + 180
      expect(response.body.summary.totalSavings).toBe(30); // 10 + 20
      expect(response.body.breakdown.active.count).toBe(2);
      expect(response.body.breakdown.purchased.count).toBe(1);
      expect(response.body.recentPriceDrops).toHaveLength(2);
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/wishlist/stats')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });
});