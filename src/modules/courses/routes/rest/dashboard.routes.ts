import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { DashboardService } from '../../services/dashboard.service';

const router = Router();
const dashboardService = new DashboardService();

/**
 * @swagger
 * /api/dashboard:
 *   get:
 *     summary: Get student dashboard
 *     description: Returns comprehensive dashboard data including enrolled courses, progress, deadlines, recommendations, and statistics
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const dashboard = await dashboardService.getStudentDashboard(userId);
    res.json(dashboard);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
