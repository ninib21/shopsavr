const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Mock Redis for tests
const mockRedisStore = new Map();

const mockRedisClient = {
  setEx: jest.fn().mockImplementation((key, ttl, value) => {
    mockRedisStore.set(key, value);
    return Promise.resolve('OK');
  }),
  get: jest.fn().mockImplementation((key) => {
    return Promise.resolve(mockRedisStore.get(key) || null);
  }),
  del: jest.fn().mockImplementation((...keys) => {
    let deleted = 0;
    keys.forEach(key => {
      if (mockRedisStore.has(key)) {
        mockRedisStore.delete(key);
        deleted++;
      }
    });
    return Promise.resolve(deleted);
  }),
  keys: jest.fn().mockResolvedValue([]),
  isOpen: true,
  connect: jest.fn().mockResolvedValue(true),
  quit: jest.fn().mockResolvedValue(true)
};

jest.mock('../backend/config/redis', () => ({
  getRedisClient: () => mockRedisClient,
  connectRedis: jest.fn().mockResolvedValue(true),
  disconnectRedis: jest.fn().mockResolvedValue(true)
}));

// Make the mock client available globally for tests
global.mockRedisClient = mockRedisClient;
global.mockRedisStore = mockRedisStore;

// Setup test environment
beforeAll(async () => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-purposes-only';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-purposes-only';
  process.env.REDIS_URL = 'redis://localhost:6379/1'; // Use different DB for tests
  
  // Start in-memory MongoDB instance
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  // Connect to the in-memory database
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
  
  // Clear Redis mock store
  global.mockRedisStore.clear();
});

// Cleanup after all tests
afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
});

// Global test timeout
jest.setTimeout(30000);