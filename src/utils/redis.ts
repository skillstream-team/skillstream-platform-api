// src/utils/redis.ts
import Redis, { Redis as RedisClient } from 'ioredis';

// Support both REDIS_URL (for Render) and individual connection parameters
const getRedisConfig = () => {
  // If REDIS_URL is provided (common in cloud platforms like Render), use it
  if (process.env.REDIS_URL) {
    return {
      url: process.env.REDIS_URL,
    };
  }
};

let redisClient: RedisClient | null = null;

try {
  const config = getRedisConfig();
  // @ts-ignore
    if ('url' in config && config.url) {
    redisClient = new Redis(config.url, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });
  } else {
      console.error('Redis URL must be provided.');
  }
  if (redisClient) {
    redisClient.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis connected');
    });
  }
} catch (error) {
  console.warn('⚠️  Redis not configured or connection failed. Rate limiting will use in-memory store.', error);
}

export default redisClient;