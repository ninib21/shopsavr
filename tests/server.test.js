const request = require('supertest');
const app = require('../backend/server');

describe('Server Setup', () => {
  test('Health check endpoint should return OK status', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'OK');
    expect(response.body).toHaveProperty('timestamp');
    expect(response.body).toHaveProperty('mongodb');
    expect(response.body).toHaveProperty('redis');
  });

  test('API root should return welcome message', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200);

    expect(response.body).toHaveProperty('message', 'ShopSavr API is running');
  });

  test('404 handler should work for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404);

    expect(response.body.error).toHaveProperty('code', 'NOT_FOUND');
    expect(response.body.error).toHaveProperty('message', 'Route not found');
  });
});