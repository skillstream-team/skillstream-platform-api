"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const gamification_service_1 = require("../../services/gamification.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const gamificationService = new gamification_service_1.GamificationService();
/**
 * @swagger
 * /api/users/{userId}/gamification:
 *   get:
 *     summary: Get user gamification data
 *     tags: [Gamification]
 */
router.get('/users/:userId/gamification', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const data = await gamificationService.getUserGamification(userId);
        res.json({
            success: true,
            data
        });
    }
    catch (error) {
        console.error('Error fetching gamification data:', error);
        res.status(500).json({ error: 'Failed to fetch gamification data' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/login:
 *   post:
 *     summary: Record daily login (updates streak)
 *     tags: [Gamification]
 */
router.post('/users/:userId/login', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const result = await gamificationService.recordLogin(userId);
        res.json({
            success: true,
            data: result,
            message: `Login recorded! ${result.streak} day streak`
        });
    }
    catch (error) {
        console.error('Error recording login:', error);
        res.status(500).json({ error: 'Failed to record login' });
    }
});
/**
 * @swagger
 * /api/leaderboard:
 *   get:
 *     summary: Get leaderboard
 *     tags: [Gamification]
 */
router.get('/leaderboard', (0, validation_1.validate)({
    query: zod_1.z.object({
        period: zod_1.z.enum(['daily', 'weekly', 'monthly', 'all_time']).optional(),
        courseId: zod_1.z.string().optional(),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 100),
    }),
}), async (req, res) => {
    try {
        const period = req.query.period || 'all_time';
        const courseId = req.query.courseId;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 100;
        const leaderboard = await gamificationService.getLeaderboard(period, courseId, limit);
        res.json({
            success: true,
            data: leaderboard
        });
    }
    catch (error) {
        console.error('Error fetching leaderboard:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});
exports.default = router;
