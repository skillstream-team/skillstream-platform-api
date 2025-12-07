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
  max: 20,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const registrationRateLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registrations per 15 minutes
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetRateLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const enrollmentRateLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 enrollments per minute
  message: 'Too many enrollment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  store: rateLimitStore,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});