import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { TeacherEarningsService } from '../../services/teacher-earnings.service';
import { SubscriptionRevenueService } from '../../services/subscription-revenue.service';

const router = Router();
const earningsService = new TeacherEarningsService();
const revenueService = new SubscriptionRevenueService();

/**
 * @swagger
 * /api/earnings/breakdown:
 *   get:
 *     summary: Get teacher earnings breakdown
 */
router.get('/breakdown', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { period } = req.query;

    const breakdown = await earningsService.getEarningsBreakdown(
      userId,
      period as string
    );

    res.json(breakdown);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/earnings/upcoming-payout:
 *   get:
 *     summary: Get upcoming payout information
 */
router.get('/upcoming-payout', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const payout = await earningsService.getUpcomingPayout(userId);
    res.json(payout);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/earnings/history:
 *   get:
 *     summary: Get earnings history
 */
router.get('/history', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const history = await earningsService.getEarningsHistory(userId, limit);
    res.json(history);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/earnings/by-source:
 *   get:
 *     summary: Get earnings by revenue source
 */
router.get('/by-source', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { source, period } = req.query;

    if (!source) {
      return res.status(400).json({ error: 'Source is required' });
    }

    const earnings = await earningsService.getEarningsBySource(
      userId,
      source as string,
      period as string
    );

    res.json(earnings);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/earnings/distribute-subscription:
 *   post:
 *     summary: Distribute subscription revenue (admin only)
 */
router.post('/distribute-subscription', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { period } = req.body;

    if (!period) {
      return res.status(400).json({ error: 'Period is required (format: YYYY-MM)' });
    }

    const result = await revenueService.distributeRevenue(period);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
