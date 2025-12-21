import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../middleware/auth';
import { LearningPathsService } from '../../services/learning-paths.service';

const router = Router();
const pathsService = new LearningPathsService();

/**
 * @swagger
 * /api/learning-paths:
 *   get:
 *     summary: Get all active learning paths
 *     description: Returns list of all active learning paths
 *     tags: [Learning Paths]
 *     responses:
 *       200:
 *         description: Learning paths retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const paths = await pathsService.getAllPaths();
    res.json({ data: paths });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/learning-paths/{pathId}:
 *   get:
 *     summary: Get learning path by ID
 *     description: Returns detailed information about a specific learning path
 *     tags: [Learning Paths]
 *     parameters:
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Learning path retrieved successfully
 *       404:
 *         description: Learning path not found
 */
router.get('/:pathId', async (req, res) => {
  try {
    const { pathId } = req.params;
    const path = await pathsService.getPathById(pathId);
    if (!path) {
      return res.status(404).json({ error: 'Learning path not found' });
    }
    res.json(path);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/learning-paths:
 *   post:
 *     summary: Create a learning path (Admin/Teacher only)
 *     description: Creates a new learning path with a sequence of courses
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, courseIds]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               thumbnailUrl:
 *                 type: string
 *               categoryId:
 *                 type: string
 *               difficulty:
 *                 type: string
 *               courseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Learning path created successfully
 */
router.post('/', requireRole('TEACHER'), async (req, res) => {
  try {
    const path = await pathsService.createPath(req.body);
    res.status(201).json(path);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/learning-paths/{pathId}/enroll:
 *   post:
 *     summary: Enroll in learning path
 *     description: Enrolls the authenticated student in a learning path
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully enrolled in learning path
 */
router.post('/:pathId/enroll', requireAuth, async (req, res) => {
  try {
    const { pathId } = req.params;
    const userId = (req as any).user.id;
    await pathsService.enrollInPath(pathId, userId);
    res.json({ message: 'Successfully enrolled in learning path' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/learning-paths/{pathId}/progress:
 *   get:
 *     summary: Get learning path progress
 *     description: Returns the student's progress in a learning path
 *     tags: [Learning Paths]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pathId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 */
router.get('/:pathId/progress', requireAuth, async (req, res) => {
  try {
    const { pathId } = req.params;
    const userId = (req as any).user.id;
    const progress = await pathsService.getStudentPathProgress(pathId, userId);
    res.json(progress);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
