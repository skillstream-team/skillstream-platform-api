"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CACHE_TTL = exports.cacheKeys = void 0;
exports.getCache = getCache;
exports.setCache = setCache;
exports.deleteCache = deleteCache;
exports.deleteCachePattern = deleteCachePattern;
const redis_1 = __importDefault(require("./redis"));
/**
 * Cache utilities using Redis
 * Falls back to no-op if Redis is not available
 */
const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
};
exports.CACHE_TTL = CACHE_TTL;
/**
 * Get value from cache
 */
async function getCache(key) {
    if (!redis_1.default)
        return null;
    try {
        const value = await redis_1.default.get(key);
        return value ? JSON.parse(value) : null;
    }
    catch (error) {
        console.error('Cache get error:', error);
        return null;
    }
}
/**
 * Set value in cache
 */
async function setCache(key, value, ttl = CACHE_TTL.MEDIUM) {
    if (!redis_1.default)
        return;
    try {
        await redis_1.default.setex(key, ttl, JSON.stringify(value));
    }
    catch (error) {
        console.error('Cache set error:', error);
    }
}
/**
 * Delete from cache
 */
async function deleteCache(key) {
    if (!redis_1.default)
        return;
    try {
        await redis_1.default.del(key);
    }
    catch (error) {
        console.error('Cache delete error:', error);
    }
}
/**
 * Delete cache by pattern
 */
async function deleteCachePattern(pattern) {
    if (!redis_1.default)
        return;
    try {
        const keys = await redis_1.default.keys(pattern);
        if (keys.length > 0) {
            await redis_1.default.del(...keys);
        }
    }
    catch (error) {
        console.error('Cache pattern delete error:', error);
    }
}
/**
 * Cache key generators
 */
exports.cacheKeys = {
    course: (id) => `course:${id}`,
    courseList: (page, limit) => `courses:list:${page}:${limit}`,
    user: (id) => `user:${id}`,
    userProfile: (id) => `user:profile:${id}`,
    enrollments: (courseId, page, limit) => `enrollments:${courseId}:${page}:${limit}`,
    studentEnrollments: (studentId, page, limit) => `enrollments:student:${studentId}:${page}:${limit}`,
};
