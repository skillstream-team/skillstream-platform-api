"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// src/utils/redis.ts
const ioredis_1 = __importDefault(require("ioredis"));
// Support both REDIS_URL (for Render) and individual connection parameters
const getRedisConfig = () => {
    // If REDIS_URL is provided (common in cloud platforms like Render), use it
    if (process.env.REDIS_URL) {
        return {
            url: process.env.REDIS_URL,
        };
    }
    // Otherwise, use individual connection parameters
    return {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: Number(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD || undefined,
    };
};
let redisClient = null;
try {
    const config = getRedisConfig();
    if ('url' in config && config.url) {
        redisClient = new ioredis_1.default(config.url, {
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
    }
    else if (!('url' in config)) {
        redisClient = new ioredis_1.default({
            host: config.host,
            port: config.port,
            password: config.password,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            },
            maxRetriesPerRequest: 3,
        });
    }
    if (redisClient) {
        redisClient.on('error', (err) => {
            console.error('Redis connection error:', err);
        });
        redisClient.on('connect', () => {
            console.log('✅ Redis connected');
        });
    }
}
catch (error) {
    console.warn('⚠️  Redis not configured or connection failed. Rate limiting will use in-memory store.', error);
}
exports.default = redisClient;
