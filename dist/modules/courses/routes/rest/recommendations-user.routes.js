"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const recommendation_service_1 = require("../../services/recommendation.service");
const auth_1 = require("../../../../middleware/auth");
const router = (0, express_1.Router)();
const recommendationService = new recommendation_service_1.RecommendationService();
/**
 * @swagger
 * /api/users/{userId}/recommendations/courses:
 *   get:
 *     summary: Get personalized course recommendations for a user
 *     tags: [Recommendations]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 */
router.get('/users/:userId/recommendations/courses', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const filters = {
            userId,
            limit,
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
exports.default = router;
