import { Router } from 'express';
import { ActivityLogService } from '../../services/activity-log.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const activityLogService = new ActivityLogService();

/**
 * @swagger
 * /api/users/{userId}/activity:
 *   get:
 *     summary: Get user activity feed
 *     tags: [Activity Log]
 */
router.get('/users/:userId/activity',
  requireAuth,
  validate({
    params: z.object({ userId: z.string().min(1) }),
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const page = typeof req.query.page === 'number' ? req.query.page : 1;
      const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;

      const result = await activityLogService.getUserActivityFeed(userId, page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
      res.status(500).json({ error: 'Failed to fetch user activity' });
    }
  }
);

/**
 * @swagger
 * /api/activity/recent:
 *   get:
 *     summary: Get recent activities (global feed)
 *     tags: [Activity Log]
 */
router.get('/activity/recent',
  requireAuth,
  async (req, res) => {
    try {
      const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : (typeof req.query.page === 'number' ? req.query.page : 1);
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : (typeof req.query.limit === 'number' ? req.query.limit : 20);
      const action = req.query.action as string | undefined;

      const result = await activityLogService.getRecentActivities(page, limit, action);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({ error: 'Failed to fetch recent activities' });
    }
  }
);

/**
 * @swagger
 * /api/activity/{entity}/{entityId}:
 *   get:
 *     summary: Get activity feed for an entity
 *     tags: [Activity Log]
 */
router.get('/activity/:entity/:entityId',
  requireAuth,
  validate({
    params: z.object({
      entity: z.string().min(1),
      entityId: z.string().min(1),
    }),
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
  }),
  async (req, res) => {
    try {
      const { entity, entityId } = req.params;
      const page = typeof req.query.page === 'number' ? req.query.page : 1;
      const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;

      const result = await activityLogService.getEntityActivityFeed(entity, entityId, page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching entity activity:', error);
      res.status(500).json({ error: 'Failed to fetch entity activity' });
    }
  }
);

export default router;
