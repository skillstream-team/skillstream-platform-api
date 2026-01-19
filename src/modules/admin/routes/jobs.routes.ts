import { Router } from 'express';
import { requireAuth } from '../../../middleware/auth';
import { requireRole } from '../../../middleware/roles';
import { SubscriptionAccessService } from '../../subscriptions/services/subscription-access.service';
import { SubscriptionRevenueService } from '../../earnings/services/subscription-revenue.service';
import { SubscriptionService } from '../../subscriptions/services/subscription.service';
import { LessonPaymentService } from '../../courses/services/lesson-payment.service';
import { prisma } from '../../../utils/prisma';

const router = Router();

/**
 * @swagger
 * /api/admin/jobs/distribute-revenue:
 *   post:
 *     summary: Manually trigger revenue distribution (admin only)
 */
router.post('/distribute-revenue', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { period } = req.body;

    // If no period provided, use last month
    let targetPeriod = period;
    if (!targetPeriod) {
      const now = new Date();
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      targetPeriod = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
    }

    // Check if already distributed
    const existingPool = await prisma.subscriptionRevenuePool.findUnique({
      where: { period: targetPeriod },
      select: { status: true },
    });

    if (existingPool?.status === 'DISTRIBUTED') {
      return res.status(400).json({
        error: `Revenue for ${targetPeriod} already distributed`,
        period: targetPeriod,
      });
    }

    const revenueService = new SubscriptionRevenueService();
    const result = await revenueService.distributeRevenue(targetPeriod);

    res.json({
      success: true,
      period: targetPeriod,
      ...result,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/jobs/revoke-expired-access:
 *   post:
 *     summary: Manually revoke expired subscription access (admin only)
 */
router.post('/revoke-expired-access', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const accessService = new SubscriptionAccessService();
    const count = await accessService.revokeExpiredAccess();
    res.json({
      success: true,
      revoked: count,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/jobs/check-expired-subscriptions:
 *   post:
 *     summary: Manually check expired subscriptions (admin only)
 */
router.post('/check-expired-subscriptions', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const subscriptionService = new SubscriptionService();
    const count = await subscriptionService.checkExpiredSubscriptions();
    res.json({
      success: true,
      expired: count,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/jobs/check-unpaid-lessons:
 *   post:
 *     summary: Manually check and cancel unpaid lessons (admin only)
 */
router.post('/check-unpaid-lessons', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const paymentService = new LessonPaymentService();
    const count = await paymentService.checkAndCancelUnpaidLessons();
    res.json({
      success: true,
      cancelled: count,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/admin/jobs/status:
 *   get:
 *     summary: Get status of scheduled jobs (admin only)
 */
router.get('/status', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    // Check last execution times from database or logs
    const lastRevenueDistribution = await prisma.subscriptionRevenuePool.findFirst({
      orderBy: { distributedAt: 'desc' },
      select: { period: true, distributedAt: true, status: true },
    });

    res.json({
      lastRevenueDistribution,
      note: 'Scheduled tasks run in-process. Check server logs for execution history.',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
