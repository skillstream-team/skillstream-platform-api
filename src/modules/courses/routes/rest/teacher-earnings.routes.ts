import { Router } from 'express';
import { TeacherEarningsService } from '../../services/teacher-earnings.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const earningsService = new TeacherEarningsService();

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/summary:
 *   get:
 *     summary: Get teacher earnings summary
 *     description: Returns lifetime earnings, total paid, pending, and available amounts
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/summary',
  requireAuth,
  requireRole('TEACHER'),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const summary = await earningsService.getTeacherEarningsSummary(teacherId);
      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      console.error('Error fetching earnings summary:', error);
      res.status(500).json({ error: 'Failed to fetch earnings summary' });
    }
  }
);

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/available:
 *   get:
 *     summary: Get available earnings ready for cashout
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/available',
  requireAuth,
  requireRole('TEACHER'),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const available = await earningsService.getAvailableEarnings(teacherId);
      res.json({
        success: true,
        data: available,
      });
    } catch (error) {
      console.error('Error fetching available earnings:', error);
      res.status(500).json({ error: 'Failed to fetch available earnings' });
    }
  }
);

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/monthly:
 *   get:
 *     summary: Get monthly earnings breakdown
 *     tags: [Teacher Earnings]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 */
router.get('/teachers/:teacherId/earnings/monthly',
  requireAuth,
  requireRole('TEACHER'),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;

      const breakdown = await earningsService.getMonthlyEarningsBreakdown(teacherId, year, month);
      res.json({
        success: true,
        data: breakdown,
      });
    } catch (error) {
      console.error('Error fetching monthly earnings:', error);
      res.status(500).json({ error: 'Failed to fetch monthly earnings' });
    }
  }
);

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/calculate:
 *   post:
 *     summary: Calculate monthly earnings for a course
 *     description: Calculates earnings for a specific month based on active users (15/30 days)
 *     tags: [Teacher Earnings]
 */
const calculateEarningsSchema = z.object({
  courseId: z.string().min(1).optional(),
  year: z.number().int().min(2020).max(2100),
  month: z.number().int().min(1).max(12),
  allCourses: z.boolean().optional().default(false),
});

router.post('/teachers/:teacherId/earnings/calculate',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ teacherId: z.string().min(1) }),
    body: calculateEarningsSchema,
  }),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { courseId, year, month, allCourses } = req.body;

      if (allCourses) {
        // Calculate for all courses
        const result = await earningsService.calculateAllCoursesEarnings(teacherId, year, month);
        res.json({
          success: true,
          data: result,
        });
      } else {
        if (!courseId) {
          return res.status(400).json({ error: 'courseId is required when allCourses is false' });
        }

        // Verify teacher owns the collection
        const { prisma } = await import('../../../../utils/prisma');
        const program = await prisma.program.findUnique({
          where: { id: courseId },
        });

        if (!program || program.instructorId !== teacherId) {
          return res.status(403).json({ error: 'Program not found or unauthorized' });
        }

        const result = await earningsService.calculateMonthlyEarnings(teacherId, courseId, year, month);
        res.json({
          success: true,
          data: result,
        });
      }
    } catch (error) {
      console.error('Error calculating earnings:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to calculate earnings' });
    }
  }
);

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/payout:
 *   post:
 *     summary: Request a payout (cashout)
 *     description: Creates a payout request for available earnings
 *     tags: [Teacher Earnings]
 */
const requestPayoutSchema = z.object({
  amount: z.number().min(0.01).optional(),
  paymentMethod: z.string().optional(),
  paymentDetails: z.any().optional(),
});

router.post('/teachers/:teacherId/earnings/payout',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ teacherId: z.string().min(1) }),
    body: requestPayoutSchema,
  }),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const { amount, paymentMethod, paymentDetails } = req.body;

      const result = await earningsService.requestPayout(teacherId, amount, paymentMethod, paymentDetails);
      res.json({
        success: true,
        data: result,
        message: 'Payout request created successfully',
      });
    } catch (error) {
      console.error('Error requesting payout:', error);
      res.status(400).json({ error: (error as Error).message || 'Failed to request payout' });
    }
  }
);

/**
 * @swagger
 * /api/teachers/{teacherId}/earnings/payouts:
 *   get:
 *     summary: Get payout history
 *     tags: [Teacher Earnings]
 */
router.get('/teachers/:teacherId/earnings/payouts',
  requireAuth,
  requireRole('TEACHER'),
  async (req: any, res) => {
    try {
      const { teacherId } = req.params;
      const currentUserId = req.user?.id;

      if (teacherId !== currentUserId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const history = await earningsService.getPayoutHistory(teacherId, page, limit);
      res.json({
        success: true,
        ...history,
      });
    } catch (error) {
      console.error('Error fetching payout history:', error);
      res.status(500).json({ error: 'Failed to fetch payout history' });
    }
  }
);

export default router;
