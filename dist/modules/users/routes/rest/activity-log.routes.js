"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const activity_log_service_1 = require("../../services/activity-log.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const activityLogService = new activity_log_service_1.ActivityLogService();
/**
 * @swagger
 * /api/users/{userId}/activity:
 *   get:
 *     summary: Get user activity feed
 *     tags: [Activity Log]
 */
router.get('/users/:userId/activity', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const page = typeof req.query.page === 'number' ? req.query.page : 1;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
        const result = await activityLogService.getUserActivityFeed(userId, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching user activity:', error);
        res.status(500).json({ error: 'Failed to fetch user activity' });
    }
});
/**
 * @swagger
 * /api/activity/recent:
 *   get:
 *     summary: Get recent activities (global feed)
 *     tags: [Activity Log]
 */
router.get('/activity/recent', auth_1.requireAuth, async (req, res) => {
    try {
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : (typeof req.query.page === 'number' ? req.query.page : 1);
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : (typeof req.query.limit === 'number' ? req.query.limit : 20);
        const action = req.query.action;
        const result = await activityLogService.getRecentActivities(page, limit, action);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching recent activities:', error);
        res.status(500).json({ error: 'Failed to fetch recent activities' });
    }
});
/**
 * @swagger
 * /api/activity/{entity}/{entityId}:
 *   get:
 *     summary: Get activity feed for an entity
 *     tags: [Activity Log]
 */
router.get('/activity/:entity/:entityId', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        entity: zod_1.z.string().min(1),
        entityId: zod_1.z.string().min(1),
    }),
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
}), async (req, res) => {
    try {
        const { entity, entityId } = req.params;
        const page = typeof req.query.page === 'number' ? req.query.page : 1;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
        const result = await activityLogService.getEntityActivityFeed(entity, entityId, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching entity activity:', error);
        res.status(500).json({ error: 'Failed to fetch entity activity' });
    }
});
exports.default = router;
