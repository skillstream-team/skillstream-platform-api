import { Router } from 'express';
import { GamificationService } from '../../services/gamification.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const gamificationService = new GamificationService();

/**
 * @swagger
 * /api/users/{userId}/gamification:
 *   get:
 *     summary: Get user gamification data
 *     tags: [Gamification]
 */
router.get('/users/:userId/gamification',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const data = await gamificationService.getUserGamification(userId);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      console.error('Error fetching gamification data:', error);
      res.status(500).json({ error: 'Failed to fetch gamification data' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/login:
 *   post:
 *     summary: Record daily login (updates streak)
 *     tags: [Gamification]
 */
router.post('/users/:userId/login',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const result = await gamificationService.recordLogin(userId);

      res.json({
        success: true,
        data: result,
        message: `Login recorded! ${result.streak} day streak`
      });
    } catch (error) {
      console.error('Error recording login:', error);
      res.status(500).json({ error: 'Failed to record login' });
    }
  }
);

/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Gamification]
 */
router.get('/leaderboard',
  validate({
    query: z.object({
      period: z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
      courseId: z.string().optional(),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
    }),
  }),
  async (req, res) => {
    try {
      const period = (req.query.period as any) || 'all_time';
      const courseId = req.query.courseId as string | undefined;
      const limit = typeof req.query.limit === 'number' ? req.query.limit : 100;

      const leaderboard = await gamificationService.getLeaderboard(period, courseId, limit);

      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
  }
);

export default router;
