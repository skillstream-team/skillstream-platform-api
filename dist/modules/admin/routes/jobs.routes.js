"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../middleware/auth");
const roles_1 = require("../../../middleware/roles");
const subscription_access_service_1 = require("../../subscriptions/services/subscription-access.service");
const subscription_revenue_service_1 = require("../../earnings/services/subscription-revenue.service");
const subscription_service_1 = require("../../subscriptions/services/subscription.service");
const lesson_payment_service_1 = require("../../courses/services/lesson-payment.service");
const prisma_1 = require("../../../utils/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/admin/jobs/distribute-revenue:
 *   post:
 *     summary: Manually trigger revenue distribution (admin only)
 */
router.post('/distribute-revenue', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
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
        const existingPool = await prisma_1.prisma.subscriptionRevenuePool.findUnique({
            where: { period: targetPeriod },
            select: { status: true },
        });
        if (existingPool?.status === 'DISTRIBUTED') {
            return res.status(400).json({
                error: `Revenue for ${targetPeriod} already distributed`,
                period: targetPeriod,
            });
        }
        const revenueService = new subscription_revenue_service_1.SubscriptionRevenueService();
        const result = await revenueService.distributeRevenue(targetPeriod);
        res.json({
            success: true,
            period: targetPeriod,
            ...result,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/jobs/revoke-expired-access:
 *   post:
 *     summary: Manually revoke expired subscription access (admin only)
 */
router.post('/revoke-expired-access', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const accessService = new subscription_access_service_1.SubscriptionAccessService();
        const count = await accessService.revokeExpiredAccess();
        res.json({
            success: true,
            revoked: count,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/jobs/check-expired-subscriptions:
 *   post:
 *     summary: Manually check expired subscriptions (admin only)
 */
router.post('/check-expired-subscriptions', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const subscriptionService = new subscription_service_1.SubscriptionService();
        const count = await subscriptionService.checkExpiredSubscriptions();
        res.json({
            success: true,
            expired: count,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/jobs/check-unpaid-lessons:
 *   post:
 *     summary: Manually check and cancel unpaid lessons (admin only)
 */
router.post('/check-unpaid-lessons', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const paymentService = new lesson_payment_service_1.LessonPaymentService();
        const count = await paymentService.checkAndCancelUnpaidLessons();
        res.json({
            success: true,
            cancelled: count,
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/jobs/status:
 *   get:
 *     summary: Get status of scheduled jobs (admin only)
 */
router.get('/status', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        // Check last execution times from database or logs
        const lastRevenueDistribution = await prisma_1.prisma.subscriptionRevenuePool.findFirst({
            orderBy: { distributedAt: 'desc' },
            select: { period: true, distributedAt: true, status: true },
        });
        res.json({
            lastRevenueDistribution,
            note: 'Scheduled tasks run in-process. Check server logs for execution history.',
        });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
