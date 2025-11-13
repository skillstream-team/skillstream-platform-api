"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = __importDefault(require("../utils/redis"));
// Use Redis store if available, otherwise fall back to in-memory store
const rateLimitStore = redis_1.default
    ? new rate_limit_redis_1.default({
        sendCommand: (command, ...args) => {
            if (!redis_1.default) {
                throw new Error('Redis client is not available');
            }
            return redis_1.default.call(command, ...args);
        },
    })
    : undefined; // undefined means use default in-memory store
exports.loginRateLimiter = (0, express_rate_limit_1.default)({
    store: rateLimitStore,
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // max 20 requests per window per IP
    message: 'Too many login attempts from this IP, please try again later.',
});
