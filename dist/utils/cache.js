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
 *
 * Caching is enabled with very short TTLs (5-30 seconds) for immediate updates
 */
// Caching is enabled with very short TTLs for immediate updates
const CACHE_DISABLED = false;
// Very short cache TTLs - data is fresh for only a few seconds
const CACHE_TTL = {
    SHORT: 5, // 5 seconds - for frequently changing data
    MEDIUM: 10, // 10 seconds - for moderately changing data
    LONG: 30, // 30 seconds - for rarely changing data
    DISABLED: 0,
};
exports.CACHE_TTL = CACHE_TTL;
/**
 * Get value from cache
 * Returns cached value if available and not expired
 */
async function getCache(key) {
    if (CACHE_DISABLED || !redis_1.default)
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
 * Caches value with specified TTL (default: MEDIUM = 10 seconds)
 */
async function setCache(key, value, ttl = CACHE_TTL.MEDIUM) {
    if (CACHE_DISABLED || !redis_1.default)
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
            console.log(`[Cache] Deleted ${keys.length} keys matching pattern: ${pattern}`);
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
    program: (id) => `program:${id}`,
    programSections: (programId) => `program:${programId}:sections`,
    programList: (page, limit, filters) => {
        const filterParts = [];
        if (filters?.instructorId)
            filterParts.push(`instructor:${filters.instructorId}`);
        if (filters?.categoryId)
            filterParts.push(`category:${filters.categoryId}`);
        if (filters?.difficulty)
            filterParts.push(`difficulty:${filters.difficulty}`);
        if (filters?.search)
            filterParts.push(`search:${filters.search}`);
        if (filters?.sortBy)
            filterParts.push(`sort:${filters.sortBy}:${filters.sortOrder || 'desc'}`);
        const filterStr = filterParts.length > 0 ? `:${filterParts.join(':')}` : '';
        return `programs:list:${page}:${limit}${filterStr}`;
    },
    // Backward compatibility aliases
    collection: (id) => `program:${id}`,
    collectionModules: (collectionId) => `program:${collectionId}:sections`,
    collectionList: (page, limit, filters) => {
        const filterParts = [];
        if (filters?.instructorId)
            filterParts.push(`instructor:${filters.instructorId}`);
        if (filters?.categoryId)
            filterParts.push(`category:${filters.categoryId}`);
        if (filters?.difficulty)
            filterParts.push(`difficulty:${filters.difficulty}`);
        if (filters?.search)
            filterParts.push(`search:${filters.search}`);
        if (filters?.sortBy)
            filterParts.push(`sort:${filters.sortBy}:${filters.sortOrder || 'desc'}`);
        const filterStr = filterParts.length > 0 ? `:${filterParts.join(':')}` : '';
        return `programs:list:${page}:${limit}${filterStr}`;
    },
    user: (id) => `user:${id}`,
    userProfile: (id) => `user:profile:${id}`,
    enrollments: (programId, page, limit) => `enrollments:${programId}:${page}:${limit}`,
    studentEnrollments: (studentId, page, limit) => `enrollments:student:${studentId}:${page}:${limit}`,
};
