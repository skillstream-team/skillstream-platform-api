"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recommendation_service_1 = require("../../services/recommendation.service");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const recommendationService = new recommendation_service_1.RecommendationService();
/**
 * @swagger
 * /api/recommendations/generate/{userId}:
 *   post:
 *     summary: Generate recommendations for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID to generate recommendations for
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of recommendations to generate
 *     responses:
 *       200:
 *         description: Recommendations generated successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/generate/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        const limit = parseInt(req.query.limit) || 10;
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const recommendations = await recommendationService.generateRecommendations(userId, limit);
        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length
        });
    }
    catch (error) {
        console.error('Error generating recommendations:', error);
        res.status(500).json({ error: 'Failed to generate recommendations' });
    }
});
/**
 * @swagger
 * /api/recommendations/{userId}:
 *   get:
 *     summary: Get user's recommendations
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Maximum number of recommendations to return
 *       - in: query
 *         name: algorithm
 *         schema:
 *           type: string
 *         description: Filter by algorithm type
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *         description: Minimum recommendation score
 *       - in: query
 *         name: excludeViewed
 *         schema:
 *           type: boolean
 *         description: Exclude already viewed recommendations
 *     responses:
 *       200:
 *         description: Recommendations retrieved successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const filters = {
            userId,
            limit: parseInt(req.query.limit) || 10,
            algorithm: req.query.algorithm,
            minScore: req.query.minScore ? parseFloat(req.query.minScore) : undefined,
            excludeViewed: req.query.excludeViewed === 'true'
        };
        const recommendations = await recommendationService.getUserRecommendations(filters);
        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length
        });
    }
    catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});
/**
 * @swagger
 * /api/recommendations/refresh/{userId}:
 *   post:
 *     summary: Refresh recommendations for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Recommendations refreshed successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/refresh/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const recommendations = await recommendationService.refreshRecommendations(userId);
        res.json({
            success: true,
            data: recommendations,
            count: recommendations.length
        });
    }
    catch (error) {
        console.error('Error refreshing recommendations:', error);
        res.status(500).json({ error: 'Failed to refresh recommendations' });
    }
});
/**
 * @swagger
 * /api/recommendations/interaction:
 *   post:
 *     summary: Record user interaction with a course
 *     tags: [Recommendations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - type
 *             properties:
 *               userId:
 *                 type: integer
 *               courseId:
 *                 type: integer
 *               type:
 *                 type: string
 *                 enum: [view, enroll, complete, rate, search]
 *               value:
 *                 type: number
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Interaction recorded successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.post('/interaction', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId, courseId, type, value, metadata } = req.body;
        if (!userId || !type) {
            return res.status(400).json({ error: 'userId and type are required' });
        }
        if (!['view', 'enroll', 'complete', 'rate', 'search'].includes(type)) {
            return res.status(400).json({ error: 'Invalid interaction type' });
        }
        await recommendationService.recordInteraction({
            userId,
            courseId,
            type,
            value,
            metadata
        });
        res.json({ success: true, message: 'Interaction recorded successfully' });
    }
    catch (error) {
        console.error('Error recording interaction:', error);
        res.status(500).json({ error: 'Failed to record interaction' });
    }
});
/**
 * @swagger
 * /api/recommendations/stats/{userId}:
 *   get:
 *     summary: Get recommendation statistics for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *       400:
 *         description: Invalid request
 *       500:
 *         description: Server error
 */
router.get('/stats/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        const stats = await recommendationService.getRecommendationStats(userId);
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        console.error('Error fetching recommendation stats:', error);
        res.status(500).json({ error: 'Failed to fetch recommendation statistics' });
    }
});
exports.default = router;
