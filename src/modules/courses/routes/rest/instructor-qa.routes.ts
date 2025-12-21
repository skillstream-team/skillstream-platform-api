import { Router } from 'express';
import { requireAuth, requireRole } from '../../../../middleware/auth';
import { InstructorQAService } from '../../services/instructor-qa.service';

const router = Router();
const qaService = new InstructorQAService();

/**
 * @swagger
 * /api/courses/{courseId}/qa:
 *   get:
 *     summary: Get questions for a course
 *     description: Returns all Q&A questions for a course
 *     tags: [Instructor Q&A]
 *     parameters:
 *       - in: path
 *         name: courseId
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
 *           default: 20
 *       - in: query
 *         name: answeredOnly
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
 */
router.get('/:courseId/qa', async (req, res) => {
  try {
    const { courseId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const answeredOnly = req.query.answeredOnly === 'true';

    const result = await qaService.getCourseQuestions(courseId, page, limit, answeredOnly);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/qa:
 *   post:
 *     summary: Ask a question (Student only)
 *     description: Students can ask questions about a course
 *     tags: [Instructor Q&A]
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
 *             required: [question]
 *             properties:
 *               question:
 *                 type: string
 *     responses:
 *       201:
 *         description: Question posted successfully
 */
router.post('/:courseId/qa', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = (req as any).user.id;
    const { question } = req.body;

    const qa = await qaService.askQuestion({
      courseId,
      studentId: userId,
      question,
    });
    res.status(201).json(qa);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/qa/{qaId}/answer:
 *   post:
 *     summary: Answer a question (Instructor only)
 *     description: Course instructor can answer student questions
 *     tags: [Instructor Q&A]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: qaId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [answer]
 *             properties:
 *               answer:
 *                 type: string
 *     responses:
 *       200:
 *         description: Answer posted successfully
 */
router.post('/qa/:qaId/answer', requireRole('TEACHER'), async (req, res) => {
  try {
    const { qaId } = req.params;
    const userId = (req as any).user.id;
    const { answer } = req.body;

    const qa = await qaService.answerQuestion({
      qaId,
      instructorId: userId,
      answer,
    });
    res.json(qa);
  } catch (err) {
    res.status(400).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/qa/my-questions:
 *   get:
 *     summary: Get student's questions
 *     description: Returns all questions asked by the authenticated student
 *     tags: [Instructor Q&A]
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *         description: Questions retrieved successfully
 */
router.get('/qa/my-questions', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await qaService.getStudentQuestions(userId, page, limit);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
