import { Router } from 'express';
import { ContentModerationService } from '../../services/content-moderation.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const moderationService = new ContentModerationService();

/**
 * @swagger
 * /api/content/flag:
 *   post:
 *     summary: Flag content for review
 *     tags: [Content Moderation]
 */
const flagContentSchema = z.object({
  contentId: z.string().min(1),
  contentType: z.enum(['course', 'lesson', 'quiz', 'assignment', 'message', 'comment']),
  reason: z.string().min(1),
  description: z.string().optional(),
});

router.post('/content/flag',
  requireAuth,
  validate({ body: flagContentSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;

      const flag = await moderationService.flagContent({
        ...req.body,
        reportedBy: userId,
      });

      res.status(201).json({
        success: true,
        data: flag,
        message: 'Content flagged successfully'
      });
    } catch (error) {
      console.error('Error flagging content:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to flag content' });
    }
  }
);

/**
 * @swagger
 * /api/content/flags:
 *   get:
 *     summary: Get flagged content (Admin/Moderator only)
 *     tags: [Content Moderation]
 */
router.get('/content/flags',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const status = req.query.status as string | undefined;
      const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : (typeof req.query.page === 'number' ? req.query.page : 1);
      const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : (typeof req.query.limit === 'number' ? req.query.limit : 20);

      const result = await moderationService.getFlaggedContent(status, page, limit);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching flagged content:', error);
      res.status(500).json({ error: 'Failed to fetch flagged content' });
    }
  }
);

/**
 * @swagger
 * /api/content/flags/{flagId}/review:
 *   post:
 *     summary: Review flagged content (Admin/Moderator only)
 *     tags: [Content Moderation]
 */
router.post('/content/flags/:flagId/review',
  requireAuth,
  requireRole('ADMIN'),
  validate({
    params: z.object({ flagId: z.string().min(1) }),
    body: z.object({
      action: z.enum(['approve', 'reject', 'remove']),
      notes: z.string().optional(),
    }),
  }),
  async (req, res) => {
    try {
      const { flagId } = req.params;
      const reviewerId = (req as any).user?.id;

      const flag = await moderationService.reviewFlag(
        flagId,
        reviewerId,
        req.body.action,
        req.body.notes
      );

      res.json({
        success: true,
        data: flag,
        message: 'Flag reviewed successfully'
      });
    } catch (error) {
      console.error('Error reviewing flag:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to review flag' });
    }
  }
);

/**
 * @swagger
 * /api/content/flags/statistics:
 *   get:
 *     summary: Get flag statistics (Admin only)
 *     tags: [Content Moderation]
 */
router.get('/content/flags/statistics',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const stats = await moderationService.getFlagStatistics();

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error fetching flag statistics:', error);
      res.status(500).json({ error: 'Failed to fetch flag statistics' });
    }
  }
);

export default router;
