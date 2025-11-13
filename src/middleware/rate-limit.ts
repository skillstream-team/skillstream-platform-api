import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../utils/redis';

// Use Redis store if available, otherwise fall back to in-memory store
const rateLimitStore = redisClient 
  ? new RedisStore({
      sendCommand: (command: string, ...args: any[]): Promise<any> => {
        if (!redisClient) {
          throw new Error('Redis client is not available');
        }
        return redisClient.call(command, ...args) as Promise<any>;
      },
    })
  : undefined; // undefined means use default in-memory store

export const loginRateLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // max 20 requests per window per IP
  message: 'Too many login attempts from this IP, please try again later.',
});