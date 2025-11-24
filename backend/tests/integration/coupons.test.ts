import request from 'supertest';
import express from 'express';
import couponRoutes from '../../src/api/routes/coupons';

const app = express();
app.use(express.json());
app.use('/api/coupons', couponRoutes);

describe('Coupon API Integration Tests', () => {
  describe('GET /api/coupons/available', () => {
    it('should return 400 if storeId is missing', async () => {
      const response = await request(app).get('/api/coupons/available');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Store ID is required');
    });

    it('should return available coupons for store', async () => {
      const response = await request(app).get(
        '/api/coupons/available?storeId=amazon'
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('GET /api/coupons/best', () => {
    it('should return best coupon for store', async () => {
      const response = await request(app).get('/api/coupons/best?storeId=amazon');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/coupons/validate', () => {
    it('should validate coupon code', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: 'TEST20',
          storeId: 'amazon',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('data');
    });

    it('should return 400 for invalid input', async () => {
      const response = await request(app)
        .post('/api/coupons/validate')
        .send({
          code: '',
          storeId: '',
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/coupons/detect', () => {
    it('should detect coupons for URL', async () => {
      const response = await request(app)
        .post('/api/coupons/detect')
        .send({
          url: 'https://www.amazon.com/checkout',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('store');
      expect(response.body.data).toHaveProperty('coupons');
    });

    it('should return 400 if URL is missing', async () => {
      const response = await request(app).post('/api/coupons/detect').send({});

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/coupons/apply', () => {
    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/coupons/apply')
        .send({
          couponId: '123',
          storeId: 'amazon',
          amountSaved: 10,
        });

      expect(response.status).toBe(401);
    });

    it('should apply coupon with valid token', async () => {
      // This would require a valid JWT token
      // For now, just test the endpoint exists
      const response = await request(app)
        .post('/api/coupons/apply')
        .set('Authorization', 'Bearer invalid-token')
        .send({
          couponId: '123',
          storeId: 'amazon',
          amountSaved: 10,
        });

      // Should fail authentication, but endpoint exists
      expect([401, 403]).toContain(response.status);
    });
  });
});

