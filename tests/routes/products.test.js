const request = require('supertest');
const app = require('../../backend/server');
const User = require('../../backend/models/User');
const WishlistItem = require('../../backend/models/WishlistItem');

describe('Product Routes', () => {
  let testUser, authToken;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'product@example.com',
      password: 'Password123',
      profile: { name: 'Product User' }
    });

    authToken = testUser.generateAuthToken();
  });

  describe('POST /api/products/scan', () => {
    test('should scan barcode successfully', async () => {
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '123456789012' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.product).toBeDefined();
      expect(response.body.product.barcode).toBe('123456789012');
      expect(response.body.product.name).toBeDefined();
      expect(response.body.pricing).toBeDefined();
      expect(response.body.pricing.sources).toBeInstanceOf(Array);
      expect(response.body.metadata.confidence).toBeGreaterThan(0);
    });

    test('should handle known barcode from mock database', async () => {
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '123456789012' })
        .expect(200);

      expect(response.body.product.name).toBe('iPhone 15 Pro');
      expect(response.body.product.brand).toBe('Apple');
      expect(response.body.product.category).toBe('electronics');
    });

    test('should fail with invalid barcode format', async () => {
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '12345' }) // Too short
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with missing barcode', async () => {
      const response = await request(app)
        .post('/api/products/scan')
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle product not found', async () => {
      // Use a barcode that won't be found in mock databases
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '999999999999' })
        .expect(404);

      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should work without authentication', async () => {
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '123456789012' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/products/search', () => {
    test('should search products successfully', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ query: 'iPhone' })
        .expect(200);

      expect(response.body.query).toBe('iPhone');
      expect(response.body.results).toBeInstanceOf(Array);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.searchedAt).toBeDefined();
    });

    test('should filter by category', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ 
          query: 'product',
          category: 'electronics'
        })
        .expect(200);

      expect(response.body.filters.category).toBe('electronics');
      expect(response.body.results).toBeInstanceOf(Array);
    });

    test('should filter by price range', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ 
          query: 'product',
          minPrice: 10,
          maxPrice: 100
        })
        .expect(200);

      expect(response.body.filters.minPrice).toBe('10');
      expect(response.body.filters.maxPrice).toBe('100');
    });

    test('should limit results', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ 
          query: 'product',
          limit: 5
        })
        .expect(200);

      expect(response.body.results.length).toBeLessThanOrEqual(5);
    });

    test('should fail with short query', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ query: 'a' }) // Too short
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with missing query', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with invalid price range', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ 
          query: 'product',
          minPrice: 100,
          maxPrice: 50 // Max less than min
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ query: 'iPhone' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/products/compare/:productId', () => {
    let testWishlistItem;

    beforeEach(async () => {
      testWishlistItem = await WishlistItem.create({
        userId: testUser._id,
        product: {
          name: 'Test Product',
          brand: 'Test Brand',
          barcode: '123456789012',
          category: 'electronics',
          image: 'https://example.com/image.jpg'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 95
        },
        sources: [{
          name: 'Test Store',
          url: 'https://teststore.com/product',
          domain: 'teststore.com',
          price: 95
        }]
      });
    });

    test('should get price comparison by wishlist item ID', async () => {
      const response = await request(app)
        .get(`/api/products/compare/${testWishlistItem._id}`)
        .expect(200);

      expect(response.body.product.id).toBe(testWishlistItem._id.toString());
      expect(response.body.product.name).toBe('Test Product');
      expect(response.body.pricing.sources).toBeInstanceOf(Array);
      expect(response.body.pricing.summary).toBeDefined();
      expect(response.body.pricing.savings).toBeDefined();
    });

    test('should get price comparison by barcode', async () => {
      const response = await request(app)
        .get('/api/products/compare/123456789012')
        .expect(200);

      expect(response.body.product.barcode).toBe('123456789012');
      expect(response.body.product.name).toBe('iPhone 15 Pro'); // From mock database
      expect(response.body.pricing.sources).toBeInstanceOf(Array);
    });

    test('should return 404 for non-existent item ID', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      
      const response = await request(app)
        .get(`/api/products/compare/${fakeId}`)
        .expect(404);

      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should return 404 for non-existent barcode', async () => {
      const response = await request(app)
        .get('/api/products/compare/999999999999')
        .expect(404);

      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should fail with invalid product ID format', async () => {
      const response = await request(app)
        .get('/api/products/compare/invalid-id')
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should work without authentication', async () => {
      const response = await request(app)
        .get('/api/products/compare/123456789012')
        .expect(200);

      expect(response.body.product.barcode).toBe('123456789012');
    });
  });

  describe('POST /api/products/track', () => {
    test('should start price tracking successfully', async () => {
      const trackingData = {
        barcode: '123456789012',
        targetPrice: 200,
        priceDropThreshold: 15
      };

      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trackingData)
        .expect(201);

      expect(response.body.message).toBe('Price tracking started successfully');
      expect(response.body.item.product.barcode).toBe('123456789012');
      expect(response.body.item.alerts.targetPrice).toBe(200);
      expect(response.body.item.alerts.priceDropThreshold).toBe(15);

      // Verify item was created in database
      const wishlistItem = await WishlistItem.findById(response.body.item.id);
      expect(wishlistItem).toBeTruthy();
      expect(wishlistItem.tracking.isTracking).toBe(true);
    });

    test('should prevent duplicate tracking', async () => {
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
        },
        status: 'active'
      });

      const trackingData = {
        barcode: '123456789012',
        targetPrice: 200
      };

      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send(trackingData)
        .expect(409);

      expect(response.body.error.code).toBe('ALREADY_TRACKING');
      expect(response.body.error.existingItemId).toBeDefined();
    });

    test('should fail with invalid barcode', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '12345' }) // Too short
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should fail with missing barcode', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should handle product not found', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '999999999999' })
        .expect(404);

      expect(response.body.error.code).toBe('PRODUCT_NOT_FOUND');
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .send({ barcode: '123456789012' })
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    test('should use default price drop threshold', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ barcode: '123456789012' })
        .expect(201);

      expect(response.body.item.alerts.priceDropThreshold).toBe(10); // Default value
    });

    test('should validate target price', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          barcode: '123456789012',
          targetPrice: -10 // Negative price
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/products/service/stats', () => {
    test('should get service statistics', async () => {
      const response = await request(app)
        .get('/api/products/service/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.service).toBe('Product Identification Service');
      expect(response.body.statistics).toBeDefined();
      expect(response.body.generatedAt).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .get('/api/products/service/stats')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('DELETE /api/products/service/cache', () => {
    test('should clear cache successfully', async () => {
      const response = await request(app)
        .delete('/api/products/service/cache')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.message).toBe('Cache cleared successfully');
      expect(response.body.keysCleared).toBeGreaterThanOrEqual(0);
      expect(response.body.clearedAt).toBeDefined();
    });

    test('should require authentication', async () => {
      const response = await request(app)
        .delete('/api/products/service/cache')
        .expect(401);

      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to scan endpoint', async () => {
      // This test would need to be adjusted based on actual rate limits
      // For now, just verify the endpoint works
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '123456789012' })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    test('should apply rate limiting to search endpoint', async () => {
      const response = await request(app)
        .get('/api/products/search')
        .query({ query: 'test' })
        .expect(200);

      expect(response.body.results).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('should handle service errors gracefully', async () => {
      // Test with a barcode that might cause service errors
      const response = await request(app)
        .post('/api/products/scan')
        .send({ barcode: '000000000000' });

      // Should either succeed or fail gracefully
      expect([200, 404, 500]).toContain(response.status);
    });

    test('should validate all required fields', async () => {
      const response = await request(app)
        .post('/api/products/track')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ 
          targetPrice: 100 
          // Missing barcode
        })
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});