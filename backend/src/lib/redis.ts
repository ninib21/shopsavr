import { createClient, RedisClientType } from 'redis';
import env from '../config/env';

let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client instance
 * @returns Redis client instance
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (redisClient && redisClient.isOpen) {
    return redisClient;
  }

  const url = env.REDIS_URL || 'redis://localhost:6379';

  redisClient = createClient({
    url,
  }) as RedisClientType;

  // Error handling
  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  redisClient.on('connect', () => {
    console.log('✅ Redis Client Connected');
  });

  redisClient.on('disconnect', () => {
    console.log('⚠️  Redis Client Disconnected');
  });

  // Connect to Redis
  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}

/**
 * Close Redis connection
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    redisClient = null;
    console.log('Redis connection closed');
  }
}

/**
 * Redis helper functions
 */
export const redis = {
  /**
   * Get value from Redis
   */
  async get(key: string): Promise<string | null> {
    const client = await getRedisClient();
    return await client.get(key);
  },

  /**
   * Set value in Redis
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const client = await getRedisClient();
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, value);
    } else {
      await client.set(key, value);
    }
  },

  /**
   * Delete key from Redis
   */
  async del(key: string): Promise<void> {
    const client = await getRedisClient();
    await client.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const client = await getRedisClient();
    const result = await client.exists(key);
    return result === 1;
  },

  /**
   * Set expiration on key
   */
  async expire(key: string, seconds: number): Promise<void> {
    const client = await getRedisClient();
    await client.expire(key, seconds);
  },
};

export default redis;

