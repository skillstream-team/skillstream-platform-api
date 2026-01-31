import { Router } from 'express';
import { PollService } from '../../services/poll.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';
import { z } from 'zod';

const router = Router();
const pollService = new PollService();

/**
 * @swagger
 * /api/polls:
 *   post:
 *     summary: Create a new poll
 *     tags: [Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, courseId, options]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: string
 *               moduleId:
 *                 type: string
 *               liveStreamId:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 */
const createPollSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  courseId: z.string().min(1),
  moduleId: z.string().optional(),
  liveStreamId: z.string().optional(),
  options: z.array(z.string().min(1)).min(2).max(10),
});

router.post(
  '/',
  requireAuth,
  requireRole('TEACHER'),
  validate({ body: createPollSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const poll = await pollService.createPoll(req.body, userId);

      // Note: Real-time poll broadcasting is handled via Socket.IO in realtime.service.ts
      // The 'create_poll' socket event will handle broadcasting to live streams

      res.status(201).json({
        success: true,
        data: poll
      });
    } catch (error) {
      logger.error('Error creating poll', error);
      res.status(500).json({ error: 'Failed to create poll' });
    }
  }
);

/**
 * @swagger
 * /api/polls:
 *   get:
 *     summary: Get polls (optionally filtered by courseId)
 *     tags: [Polls]
 */
router.get('/',
  validate({
    query: z.object({
      courseId: z.string().optional(),
      collectionId: z.string().optional(),
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
      isActive: z.string().optional().transform(val => val === 'true'),
    }),
  }),
  async (req, res) => {
    try {
      const { courseId, collectionId, page = 1, limit = 20, isActive } = req.query as any;
      const targetCollectionId = collectionId || courseId;

      const where: any = {};
      if (targetCollectionId) {
        where.programId = targetCollectionId;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      const skip = (page - 1) * limit;
      const take = limit;

      const [polls, total] = await Promise.all([
        prisma.poll.findMany({
          where,
          skip,
          take,
          include: {
            options: true,
            creator: {
              select: { id: true, username: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }),
        prisma.poll.count({ where })
      ]);

      res.json({
        success: true,
        polls,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        }
      });
    } catch (error) {
      logger.error('Error fetching polls', error);
      res.status(500).json({ error: 'Failed to fetch polls' });
    }
  }
);

/**
 * @swagger
 * /api/polls/{pollId}:
 *   get:
 *     summary: Get a poll by ID
 *     tags: [Polls]
 */
router.get('/:pollId',
  validate({ params: z.object({ pollId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { pollId } = req.params;
      const poll = await prisma.poll.findUnique({
        where: { id: pollId },
        include: {
          options: true,
          creator: {
            select: { id: true, username: true, email: true }
          }
        }
      });

      if (!poll) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      res.json({
        success: true,
        data: poll
      });
    } catch (error) {
      logger.error('Error fetching poll', error);
      res.status(500).json({ error: 'Failed to fetch poll' });
    }
  }
);

/**
 * @swagger
 * /api/polls/{pollId}/respond:
 *   post:
 *     summary: Respond to a poll
 *     tags: [Polls]
 */
const respondToPollSchema = z.object({
  optionId: z.string().min(1),
});

router.post('/:pollId/respond',
  requireAuth,
  validate({ params: z.object({ pollId: z.string().min(1) }), body: respondToPollSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      const { pollId } = req.params;
      const { optionId } = req.body;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const response = await pollService.respondToPoll(pollId, optionId, userId);

      res.json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error('Error responding to poll', error);
      res.status(500).json({ error: 'Failed to respond to poll' });
    }
  }
);

/**
 * @swagger
 * /api/polls/{pollId}/results:
 *   get:
 *     summary: Get poll results
 *     tags: [Polls]
 */
router.get('/:pollId/results',
  requireAuth,
  validate({ params: z.object({ pollId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { pollId } = req.params;
      const results = await pollService.getPollResults(pollId);

      if (!results) {
        return res.status(404).json({ error: 'Poll not found' });
      }

      res.json({
        success: true,
        data: results
      });
    } catch (error) {
      logger.error('Error fetching poll results', error);
      res.status(500).json({ error: 'Failed to fetch poll results' });
    }
  }
);

export default router;
