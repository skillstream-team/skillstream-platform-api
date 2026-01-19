import redisClient from './redis';

/**
 * Cache utilities using Redis
 * Falls back to no-op if Redis is not available
 */

const CACHE_TTL = {
  SHORT: 300, // 5 minutes
  MEDIUM: 1800, // 30 minutes
  LONG: 3600, // 1 hour
};

/**
 * Get value from cache
 */
export async function getCache(key: string): Promise<any | null> {
  if (!redisClient) return null;
  
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
 */
export async function setCache(key: string, value: any, ttl: number = CACHE_TTL.MEDIUM): Promise<void> {
  if (!redisClient) return;
  
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
    }
  } catch (error) {
    console.error('Cache pattern delete error:', error);
  }
}

/**
 * Cache key generators
 */
export const cacheKeys = {
  collection: (id: string) => `collection:${id}`,
  collectionModules: (collectionId: string) => `collection:${collectionId}:modules`,
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
    return `collections:list:${page}:${limit}${filterStr}`;
  },
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  enrollments: (collectionId: string, page: number, limit: number) => `enrollments:${collectionId}:${page}:${limit}`,
  studentEnrollments: (studentId: string, page: number, limit: number) => `enrollments:student:${studentId}:${page}:${limit}`,
};

export { CACHE_TTL };
