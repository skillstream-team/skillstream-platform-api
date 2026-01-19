import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { EngagementService } from '../../services/engagement.service';

const router = Router();
const engagementService = new EngagementService();

/**
 * @swagger
 * /api/engagement/track:
 *   post:
 *     summary: Track student engagement (watch time)
 */
router.post('/track', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { contentId, contentType, minutes } = req.body;

    if (!contentId || !contentType || !minutes) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['COLLECTION', 'LESSON'].includes(contentType)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const engagement = await engagementService.trackWatchTime(
      userId,
      contentId,
      contentType,
      minutes
    );

    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/engagement/complete:
 *   post:
 *     summary: Mark content as completed
 */
router.post('/complete', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { contentId, contentType } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const engagement = await engagementService.markCompleted(
      userId,
      contentId,
      contentType
    );

    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/engagement/progress:
 *   put:
 *     summary: Update completion percentage
 */
router.put('/progress', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { contentId, contentType, percent } = req.body;

    if (!contentId || !contentType || percent === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const engagement = await engagementService.updateCompletionPercent(
      userId,
      contentId,
      contentType,
      percent
    );

    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/engagement/my-engagement:
 *   get:
 *     summary: Get current user's engagement data
 */
router.get('/my-engagement', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { period } = req.query;

    const engagement = await engagementService.getStudentEngagement(
      userId,
      period as string
    );

    res.json(engagement);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
