import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
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
router.get('/:programId/tags', async (req, res) => {
  try {
    const { programId } = req.params;
    const tags = await tagsService.getProgramTags(programId);
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
router.post('/:programId/tags', requireRole('TEACHER'), async (req, res) => {
  try {
    const { programId } = req.params;
    const { tags } = req.body;
    await tagsService.addTagsToProgram(programId, tags);
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
router.delete('/:programId/tags', requireRole('TEACHER'), async (req, res) => {
  try {
    const { programId } = req.params;
    const { tags } = req.body;
    await tagsService.removeTagsFromProgram(programId, tags);
    res.json({ message: 'Tags removed successfully' });
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

export default router;
