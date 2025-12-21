import { Router } from 'express';
import { TagsService } from '../../services/tags.service';

const router = Router();
const tagsService = new TagsService();

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Get all tags
 *     description: Returns all unique tags across the platform with usage counts
 *     tags: [Tags]
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 */
router.get('/', async (req, res) => {
  try {
    const tags = await tagsService.getAllTags();
    res.json({ data: tags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/tags/{tag}/courses:
 *   get:
 *     summary: Get courses by tag
 *     description: Returns courses that have a specific tag
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: tag
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Courses retrieved successfully
 */
router.get('/:tag/courses', async (req, res) => {
  try {
    const { tag } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const result = await tagsService.getCoursesByTag(tag, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
