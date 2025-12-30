import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../utils/redis';

// Helper function to create a Redis store with a unique prefix
const createRateLimitStore = (prefix: string) => {
  if (!redisClient) {
    return undefined; // Use default in-memory store if Redis is not available
  }
  
  return new RedisStore({
    prefix: `rate-limit:${prefix}:`,
    sendCommand: (command: string, ...args: any[]): Promise<any> => {
      if (!redisClient) {
        throw new Error('Redis client is not available');
      }
      return redisClient.call(command, ...args) as Promise<any>;
    },
  });
};

export const loginRateLimiter = rateLimit({
  store: createRateLimitStore('login'),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const registrationRateLimiter = rateLimit({
  store: createRateLimitStore('registration'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 registrations per 15 minutes
  message: 'Too many registration attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const passwordResetRateLimiter = rateLimit({
  store: createRateLimitStore('password-reset'),
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset attempts per hour
  message: 'Too many password reset attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const enrollmentRateLimiter = rateLimit({
  store: createRateLimitStore('enrollment'),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 enrollments per minute
  message: 'Too many enrollment requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  store: createRateLimitStore('general'),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for messaging endpoints
export const messagingRateLimiter = rateLimit({
  store: createRateLimitStore('messaging'),
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 messages per minute per user
  message: 'Too many messages sent, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    return (req as any).user?.id || req.ip || 'unknown';
  },
});