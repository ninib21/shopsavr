const redis = require('redis');

let redisClient = null;

const getRedisClient = () => {
  if (!redisClient) {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          // End reconnecting on a specific error and flush all commands with a individual error
          return new Error('The server refused the connection');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          // End reconnecting after a specific timeout and flush all commands with a individual error
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          // End reconnecting with built in error
          return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisClient.on('ready', () => {
      console.log('Redis client ready');
    });

    redisClient.on('end', () => {
      console.log('Redis connection ended');
    });
  }

  return redisClient;
};

const connectRedis = async () => {
  try {
    const client = getRedisClient();
    if (!client.isOpen) {
      await client.connect();
    }
    return client;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw error;
  }
};

const disconnectRedis = async () => {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      redisClient = null;
    }
  } catch (error) {
    console.error('Error disconnecting from Redis:', error);
  }
};

module.exports = {
  getRedisClient,
  connectRedis,
  disconnectRedis
};