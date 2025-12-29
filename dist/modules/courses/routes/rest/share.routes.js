"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const share_service_1 = require("../../services/share.service");
const router = (0, express_1.Router)();
const shareService = new share_service_1.ShareService();
/**
 * @swagger
 * /api/courses/{courseId}/share:
 *   post:
 *     summary: Share a course
 *     description: Tracks when a user shares a course on social media
 *     tags: [Sharing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [platform]
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [facebook, twitter, linkedin, whatsapp]
 *     responses:
 *       200:
 *         description: Share tracked successfully
 */
router.post('/:courseId/share', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const userId = req.user.id;
        const { platform } = req.body;
        await shareService.shareCourse({
            courseId,
            userId,
            platform,
        });
        const shareableLink = shareService.getShareableLink(courseId, platform);
        res.json({ shareableLink });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/share/link:
 *   get:
 *     summary: Get shareable link
 *     description: Returns a shareable link for a course on a specific platform
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, twitter, linkedin, whatsapp]
 *     responses:
 *       200:
 *         description: Shareable link generated
 */
router.get('/:courseId/share/link', async (req, res) => {
    try {
        const { courseId } = req.params;
        const { platform } = req.query;
        if (!platform || typeof platform !== 'string') {
            return res.status(400).json({ error: 'Platform is required' });
        }
        const shareableLink = shareService.getShareableLink(courseId, platform);
        res.json({ shareableLink });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/share/stats:
 *   get:
 *     summary: Get course share statistics
 *     description: Returns sharing statistics for a course
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/:courseId/share/stats', async (req, res) => {
    try {
        const { courseId } = req.params;
        const stats = await shareService.getCourseShareStats(courseId);
        res.json(stats);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
