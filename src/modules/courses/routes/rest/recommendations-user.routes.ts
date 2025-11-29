import { Router } from 'express';
import { RecommendationService } from '../../services/recommendation.service';
import { requireAuth } from '../../../../middleware/auth';

const router = Router();
const recommendationService = new RecommendationService();

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
router.get('/users/:userId/recommendations/courses', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

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
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

export default router;

