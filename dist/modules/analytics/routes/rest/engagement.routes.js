"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const engagement_service_1 = require("../../services/engagement.service");
const router = (0, express_1.Router)();
const engagementService = new engagement_service_1.EngagementService();
/**
 * @swagger
 * /api/engagement/track:
 *   post:
 *     summary: Track student engagement (watch time)
 */
router.post('/track', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contentId, contentType, minutes } = req.body;
        if (!contentId || !contentType || !minutes) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        if (!['COLLECTION', 'LESSON'].includes(contentType)) {
            return res.status(400).json({ error: 'Invalid content type' });
        }
        const engagement = await engagementService.trackWatchTime(userId, contentId, contentType, minutes);
        res.json(engagement);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/engagement/complete:
 *   post:
 *     summary: Mark content as completed
 */
router.post('/complete', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contentId, contentType } = req.body;
        if (!contentId || !contentType) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const engagement = await engagementService.markCompleted(userId, contentId, contentType);
        res.json(engagement);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/engagement/progress:
 *   put:
 *     summary: Update completion percentage
 */
router.put('/progress', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contentId, contentType, percent } = req.body;
        if (!contentId || !contentType || percent === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const engagement = await engagementService.updateCompletionPercent(userId, contentId, contentType, percent);
        res.json(engagement);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/engagement/my-engagement:
 *   get:
 *     summary: Get current user's engagement data
 */
router.get('/my-engagement', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { period } = req.query;
        const engagement = await engagementService.getStudentEngagement(userId, period);
        res.json(engagement);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
