import redisClient from './redis';

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

/**
 * Get value from cache
 * Returns cached value if available and not expired
 */
export async function getCache(key: string): Promise<any | null> {
  if (CACHE_DISABLED || !redisClient) return null;
  
  try {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache get error:', error);
    return null;
  }
}

/**
 * Set value in cache
 * Caches value with specified TTL (default: MEDIUM = 10 seconds)
 */
export async function setCache(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  if (CACHE_DISABLED || !redisClient) return;
  
  try {
    await redisClient.setex(key, ttl, JSON.stringify(value));
  } catch (error) {
    console.error('Cache set error:', error);
  }
}

/**
 * Delete from cache
 */
export async function deleteCache(key: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error('Cache delete error:', error);
  }
}

/**
 * Delete cache by pattern
 */
export async function deleteCachePattern(pattern: string): Promise<void> {
  if (!redisClient) return;
  
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`[Cache] Deleted ${keys.length} keys matching pattern: ${pattern}`);
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  program: (id: string) => `program:${id}`,
  programSections: (programId: string) => `program:${programId}:sections`,
  programList: (page: number, limit: number, filters?: {
    instructorId?: string;
    categoryId?: string;
    difficulty?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const filterParts: string[] = [];
    if (filters?.instructorId) filterParts.push(`instructor:${filters.instructorId}`);
    if (filters?.categoryId) filterParts.push(`category:${filters.categoryId}`);
    if (filters?.difficulty) filterParts.push(`difficulty:${filters.difficulty}`);
    if (filters?.search) filterParts.push(`search:${filters.search}`);
    if (filters?.sortBy) filterParts.push(`sort:${filters.sortBy}:${filters.sortOrder || 'desc'}`);
    const filterStr = filterParts.length > 0 ? `:${filterParts.join(':')}` : '';
    return `programs:list:${page}:${limit}${filterStr}`;
  },
  // Backward compatibility aliases
  collection: (id: string) => `program:${id}`,
  collectionModules: (collectionId: string) => `program:${collectionId}:sections`,
  collectionList: (page: number, limit: number, filters?: {
    instructorId?: string;
    categoryId?: string;
    difficulty?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }) => {
    const filterParts: string[] = [];
    if (filters?.instructorId) filterParts.push(`instructor:${filters.instructorId}`);
    if (filters?.categoryId) filterParts.push(`category:${filters.categoryId}`);
    if (filters?.difficulty) filterParts.push(`difficulty:${filters.difficulty}`);
    if (filters?.search) filterParts.push(`search:${filters.search}`);
    if (filters?.sortBy) filterParts.push(`sort:${filters.sortBy}:${filters.sortOrder || 'desc'}`);
    const filterStr = filterParts.length > 0 ? `:${filterParts.join(':')}` : '';
    return `programs:list:${page}:${limit}${filterStr}`;
  },
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  enrollments: (programId: string, page: number, limit: number) => `enrollments:${programId}:${page}:${limit}`,
  studentEnrollments: (studentId: string, page: number, limit: number) => `enrollments:student:${studentId}:${page}:${limit}`,
};

export { CACHE_TTL };
