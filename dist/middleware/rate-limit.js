"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginRateLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const rate_limit_redis_1 = __importDefault(require("rate-limit-redis"));
const redis_1 = __importDefault(require("../utils/redis"));
exports.loginRateLimiter = (0, express_rate_limit_1.default)({
    store: new rate_limit_redis_1.default({
        sendCommand: (command, ...args) => redis_1.default.call(command, ...args),
    }),
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 20, // max 20 requests per window per IP
    message: 'Too many login attempts from this IP, please try again later.',
});
