"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const content_moderation_service_1 = require("../../services/content-moderation.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const moderationService = new content_moderation_service_1.ContentModerationService();
/**
 * @swagger
 * /api/content/flag:
 *   post:
 *     summary: Flag content for review
 *     tags: [Content Moderation]
 */
const flagContentSchema = zod_1.z.object({
    contentId: zod_1.z.string().min(1),
    contentType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment', 'message', 'comment']),
    reason: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
router.post('/content/flag', auth_1.requireAuth, (0, validation_1.validate)({ body: flagContentSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        const flag = await moderationService.flagContent({
            ...req.body,
            reportedBy: userId,
        });
        res.status(201).json({
            success: true,
            data: flag,
            message: 'Content flagged successfully'
        });
    }
    catch (error) {
        console.error('Error flagging content:', error);
        res.status(500).json({ error: error.message || 'Failed to flag content' });
    }
});
/**
 * @swagger
 * /api/content/flags:
 *   get:
 *     summary: Get flagged content (Admin/Moderator only)
 *     tags: [Content Moderation]
 */
router.get('/content/flags', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const status = req.query.status;
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : (typeof req.query.page === 'number' ? req.query.page : 1);
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : (typeof req.query.limit === 'number' ? req.query.limit : 20);
        const result = await moderationService.getFlaggedContent(status, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching flagged content:', error);
        res.status(500).json({ error: 'Failed to fetch flagged content' });
    }
});
/**
 * @swagger
 * /api/content/flags/{flagId}/review:
 *   post:
 *     summary: Review flagged content (Admin/Moderator only)
 *     tags: [Content Moderation]
 */
router.post('/content/flags/:flagId/review', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    params: zod_1.z.object({ flagId: zod_1.z.string().min(1) }),
    body: zod_1.z.object({
        action: zod_1.z.enum(['approve', 'reject', 'remove']),
        notes: zod_1.z.string().optional(),
    }),
}), async (req, res) => {
    try {
        const { flagId } = req.params;
        const reviewerId = req.user?.id;
        const flag = await moderationService.reviewFlag(flagId, reviewerId, req.body.action, req.body.notes);
        res.json({
            success: true,
            data: flag,
            message: 'Flag reviewed successfully'
        });
    }
    catch (error) {
        console.error('Error reviewing flag:', error);
        res.status(500).json({ error: error.message || 'Failed to review flag' });
    }
});
/**
 * @swagger
 * /api/content/flags/statistics:
 *   get:
 *     summary: Get flag statistics (Admin only)
 *     tags: [Content Moderation]
 */
router.get('/content/flags/statistics', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const stats = await moderationService.getFlagStatistics();
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching flag statistics:', error);
        res.status(500).json({ error: 'Failed to fetch flag statistics' });
    }
});
exports.default = router;
