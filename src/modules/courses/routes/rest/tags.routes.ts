import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../middleware/auth';
import { TagsService } from '../../services/tags.service';

const router = Router();
const tagsService = new TagsService();

/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   get:
 *     summary: Get tags for a course
 *     description: Returns all tags associated with a course
 *     tags: [Tags]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Tags retrieved successfully
 */
router.get('/:courseId/tags', async (req, res) => {
  try {
    const { courseId } = req.params;
    const tags = await tagsService.getCourseTags(courseId);
    res.json({ data: tags });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   post:
 *     summary: Add tags to a course (Teacher only)
 *     description: Adds one or more tags to a course
 *     tags: [Tags]
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
 *             required: [tags]
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags added successfully
 */
router.post('/:courseId/tags', requireRole('TEACHER'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { tags } = req.body;
    await tagsService.addTagsToCourse(courseId, tags);
    res.json({ message: 'Tags added successfully' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/tags:
 *   delete:
 *     summary: Remove tags from a course (Teacher only)
 *     description: Removes specified tags from a course
 *     tags: [Tags]
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
 *             required: [tags]
 *             properties:
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Tags removed successfully
 */
router.delete('/:courseId/tags', requireRole('TEACHER'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { tags } = req.body;
    await tagsService.removeTagsFromCourse(courseId, tags);
    res.json({ message: 'Tags removed successfully' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

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
router.get('/tags', async (req, res) => {
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
router.get('/tags/:tag/courses', async (req, res) => {
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
