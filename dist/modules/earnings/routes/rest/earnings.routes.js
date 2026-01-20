"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const teacher_earnings_service_1 = require("../../services/teacher-earnings.service");
const subscription_revenue_service_1 = require("../../services/subscription-revenue.service");
const router = (0, express_1.Router)();
const earningsService = new teacher_earnings_service_1.TeacherEarningsService();
const revenueService = new subscription_revenue_service_1.SubscriptionRevenueService();
/**
 * @swagger
 * /api/earnings/breakdown:
 *   get:
 *     summary: Get teacher earnings breakdown
 */
router.get('/breakdown', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { period } = req.query;
        const breakdown = await earningsService.getEarningsBreakdown(userId, period);
        res.json(breakdown);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/earnings/upcoming-payout:
 *   get:
 *     summary: Get upcoming payout information
 */
router.get('/upcoming-payout', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const payout = await earningsService.getUpcomingPayout(userId);
        res.json(payout);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/earnings/history:
 *   get:
 *     summary: Get earnings history
 */
router.get('/history', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const limit = parseInt(req.query.limit) || 50;
        const history = await earningsService.getEarningsHistory(userId, limit);
        res.json(history);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/earnings/by-source:
 *   get:
 *     summary: Get earnings by revenue source
 */
router.get('/by-source', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { source, period } = req.query;
        if (!source) {
            return res.status(400).json({ error: 'Source is required' });
        }
        const earnings = await earningsService.getEarningsBySource(userId, source, period);
        res.json(earnings);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/earnings/distribute-subscription:
 *   post:
 *     summary: Distribute subscription revenue (admin only)
 */
router.post('/distribute-subscription', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const { period } = req.body;
        if (!period) {
            return res.status(400).json({ error: 'Period is required (format: YYYY-MM)' });
        }
        const result = await revenueService.distributeRevenue(period);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
