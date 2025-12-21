import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { PrerequisitesService } from '../../services/prerequisites.service';

const router = Router();
const prerequisitesService = new PrerequisitesService();

/**
 * @swagger
 * /api/courses/{courseId}/prerequisites:
 *   get:
 *     summary: Get all prerequisites for a course
 *     description: Returns list of courses that must be completed before enrolling
 *     tags: [Prerequisites]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prerequisites retrieved successfully
 */
router.get('/:courseId/prerequisites', async (req, res) => {
  try {
    const { courseId } = req.params;
    const prerequisites = await prerequisitesService.getCoursePrerequisites(courseId);
    res.json({ data: prerequisites });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/prerequisites/check:
 *   get:
 *     summary: Check if student can enroll (prerequisites check)
 *     description: Checks if authenticated student has completed all required prerequisites
 *     tags: [Prerequisites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prerequisite check result
 */
router.get('/:courseId/prerequisites/check', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.id;
    const result = await prerequisitesService.checkPrerequisites(userId, courseId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/prerequisites:
 *   post:
 *     summary: Add a prerequisite to a course
 *     description: Adds a prerequisite course (Teacher/Admin only)
 *     tags: [Prerequisites]
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
 *             required: [prerequisiteId]
 *             properties:
 *               prerequisiteId:
 *                 type: string
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *     responses:
 *       201:
 *         description: Prerequisite added successfully
 *       400:
 *         description: Invalid request or circular dependency
 */
router.post('/:courseId/prerequisites', requireRole('TEACHER'), async (req, res) => {
  try {
    const { courseId } = req.params;
    const { prerequisiteId, isRequired } = req.body;

    const result = await prerequisitesService.addPrerequisite({
      courseId,
      prerequisiteId,
      isRequired,
    });
    res.status(201).json(result);
  } catch (err) {
    const error = err as Error;
    if (
      error.message.includes('circular dependency') ||
      error.message.includes('cannot be a prerequisite of itself') ||
      error.message.includes('already exists')
    ) {
      res.status(400).json({ error: error.message });
    } else if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/prerequisites/{prerequisiteId}:
 *   delete:
 *     summary: Remove a prerequisite from a course
 *     description: Removes a prerequisite course (Teacher/Admin only)
 *     tags: [Prerequisites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: prerequisiteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Prerequisite removed successfully
 *       404:
 *         description: Prerequisite not found
 */
router.delete(
  '/:courseId/prerequisites/:prerequisiteId',
  requireRole('TEACHER'),
  async (req, res) => {
    try {
      const { courseId, prerequisiteId } = req.params;
      await prerequisitesService.removePrerequisite(courseId, prerequisiteId);
      res.json({ message: 'Prerequisite removed successfully' });
    } catch (err) {
      const error = err as Error;
      if (error.message.includes('not found')) {
        res.status(404).json({ error: error.message });
      } else {
        res.status(500).json({ error: error.message });
      }
    }
  }
);

/**
 * @swagger
 * /api/courses/{courseId}/dependents:
 *   get:
 *     summary: Get courses that require this course as a prerequisite
 *     description: Returns list of courses that have this course as a prerequisite
 *     tags: [Prerequisites]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dependent courses retrieved successfully
 */
router.get('/:courseId/dependents', async (req, res) => {
  try {
    const { courseId } = req.params;
    const dependents = await prerequisitesService.getDependentCourses(courseId);
    res.json({ data: dependents });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
