const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Set up test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.BCRYPT_ROUNDS = '10';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_testing';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_webhook_secret';

// Setup test database
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
});

// Clean up after each test
afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Teardown test database
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Mock Redis for tests
const mockRedisData = new Map();

jest.mock('../backend/config/redis', () => ({
  getRedisClient: () => ({
    get: jest.fn((key) => Promise.resolve(mockRedisData.get(key) || null)),
    set: jest.fn((key, value) => {
      mockRedisData.set(key, value);
      return Promise.resolve();
    }),
    setEx: jest.fn((key, ttl, value) => {
      mockRedisData.set(key, value);
      // In a real implementation, we'd set a timeout to delete the key
      return Promise.resolve();
    }),
    del: jest.fn((key) => {
      mockRedisData.delete(key);
      return Promise.resolve();
    }),
    exists: jest.fn((key) => Promise.resolve(mockRedisData.has(key) ? 1 : 0)),
    expire: jest.fn(() => Promise.resolve())
  }),
  connectRedis: jest.fn()
}));

// Clear Redis mock data between tests
afterEach(() => {
  mockRedisData.clear();
});