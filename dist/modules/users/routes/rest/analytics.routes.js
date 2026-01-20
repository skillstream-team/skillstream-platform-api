"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_service_1 = require("../../services/analytics.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const analyticsService = new analytics_service_1.AnalyticsService();
/**
 * @swagger
 * /api/analytics/platform:
 *   get:
 *     summary: Get platform-wide analytics (Admin only)
 *     tags: [Analytics]
 */
router.get('/analytics/platform', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const analytics = await analyticsService.getPlatformAnalytics();
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching platform analytics:', error);
        res.status(500).json({ error: 'Failed to fetch platform analytics' });
    }
});
/**
 * @swagger
 * /api/analytics/courses/{courseId}:
 *   get:
 *     summary: Get course analytics (Teacher/Admin only)
 *     tags: [Analytics]
 */
router.get('/analytics/courses/:courseId', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ courseId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { courseId } = req.params;
        const currentUser = req.user;
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
        const analytics = await analyticsService.getCollectionAnalytics(courseId);
        res.json({
            success: true,
            data: analytics
        });
    }
    catch (error) {
        console.error('Error fetching course analytics:', error);
        res.status(500).json({ error: error.message || 'Failed to fetch course analytics' });
    }
});
exports.default = router;
