import { Router } from 'express';
import { AnalyticsService } from '../../services/analytics.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const analyticsService = new AnalyticsService();

/**
 * @swagger
 * /api/analytics/platform:
 *   get:
 *     summary: Get platform-wide analytics (Admin only)
 *     tags: [Analytics]
 */
router.get('/analytics/platform',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const analytics = await analyticsService.getPlatformAnalytics();
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      res.status(500).json({ error: 'Failed to fetch platform analytics' });
    }
  }
);

/**
 * @swagger
 * /api/analytics/courses/{courseId}:
 *   get:
 *     summary: Get course analytics (Teacher/Admin only)
 *     tags: [Analytics]
 */
router.get('/analytics/courses/:courseId',
  requireAuth,
  validate({ params: z.object({ courseId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const currentUser = (req as any).user;
      
      // Check if user is admin or course instructor
      if (currentUser.role !== 'ADMIN') {
        const course = await require('../../../utils/prisma').prisma.course.findUnique({
          where: { id: courseId },
          select: { instructorId: true },
        });
        
        if (!course || course.instructorId !== currentUser.id) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      }

      const analytics = await analyticsService.getCourseAnalytics(courseId);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching course analytics:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to fetch course analytics' });
    }
  }
);

export default router;
