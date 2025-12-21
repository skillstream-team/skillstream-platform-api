import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../middleware/auth';
import { BundlesService } from '../../services/bundles.service';

const router = Router();
const bundlesService = new BundlesService();

/**
 * @swagger
 * /api/bundles:
 *   get:
 *     summary: Get all active course bundles
 *     description: Returns list of all active course bundles
 *     tags: [Bundles]
 *     responses:
 *       200:
 *         description: Bundles retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const bundles = await bundlesService.getAllBundles();
    res.json({ data: bundles });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/bundles/{bundleId}:
 *   get:
 *     summary: Get bundle by ID
 *     description: Returns detailed information about a specific bundle
 *     tags: [Bundles]
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Bundle retrieved successfully
 *       404:
 *         description: Bundle not found
 */
router.get('/:bundleId', async (req, res) => {
  try {
    const { bundleId } = req.params;
    const bundle = await bundlesService.getBundleById(bundleId);
    if (!bundle) {
      return res.status(404).json({ error: 'Bundle not found' });
    }
    res.json(bundle);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/bundles:
 *   post:
 *     summary: Create a course bundle (Admin/Teacher only)
 *     description: Creates a new course bundle with multiple courses
 *     tags: [Bundles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, price, courseIds]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               thumbnailUrl:
 *                 type: string
 *               courseIds:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Bundle created successfully
 */
router.post('/', requireRole('TEACHER'), async (req, res) => {
  try {
    const bundle = await bundlesService.createBundle(req.body);
    res.status(201).json(bundle);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/bundles/{bundleId}/enroll:
 *   post:
 *     summary: Enroll in bundle
 *     description: Enrolls the authenticated student in all courses in the bundle
 *     tags: [Bundles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: bundleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully enrolled in bundle
 */
router.post('/:bundleId/enroll', requireAuth, async (req, res) => {
  try {
    const { bundleId } = req.params;
    const userId = (req as any).user.id;
    const result = await bundlesService.enrollInBundle(bundleId, userId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
