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
  course: (id: string) => `course:${id}`,
  courseList: (page: number, limit: number) => `courses:list:${page}:${limit}`,
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:profile:${id}`,
  enrollments: (courseId: string, page: number, limit: number) => `enrollments:${courseId}:${page}:${limit}`,
  studentEnrollments: (studentId: string, page: number, limit: number) => `enrollments:student:${studentId}:${page}:${limit}`,
};

export { CACHE_TTL };
