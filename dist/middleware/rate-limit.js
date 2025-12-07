"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generalRateLimiter = exports.enrollmentRateLimiter = exports.passwordResetRateLimiter = exports.registrationRateLimiter = exports.loginRateLimiter = void 0;
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
    max: 20,
    message: 'Too many login attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.registrationRateLimiter = (0, express_rate_limit_1.default)({
    store: rateLimitStore,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 registrations per 15 minutes
    message: 'Too many registration attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.passwordResetRateLimiter = (0, express_rate_limit_1.default)({
    store: rateLimitStore,
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // 3 password reset attempts per hour
    message: 'Too many password reset attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.enrollmentRateLimiter = (0, express_rate_limit_1.default)({
    store: rateLimitStore,
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // 10 enrollments per minute
    message: 'Too many enrollment requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
exports.generalRateLimiter = (0, express_rate_limit_1.default)({
    store: rateLimitStore,
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per 15 minutes per IP
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
});
