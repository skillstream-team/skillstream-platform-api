import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import redisClient from '../utils/redis';

export const loginRateLimiter = rateLimit({
  store: new RedisStore({
    sendCommand: (command: string, ...args: any[]): Promise<any> => redisClient.call(command, ...args) as Promise<any>,
  }),
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // max 20 requests per window per IP
  message: 'Too many login attempts from this IP, please try again later.',
});