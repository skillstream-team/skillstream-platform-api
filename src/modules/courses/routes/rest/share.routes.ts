import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { ShareService } from '../../services/share.service';

const router = Router();
const shareService = new ShareService();

/**
 * @swagger
 * /api/courses/{courseId}/share:
 *   post:
 *     summary: Share a course
 *     description: Tracks when a user shares a course on social media
 *     tags: [Sharing]
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
 *             required: [platform]
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [facebook, twitter, linkedin, whatsapp]
 *     responses:
 *       200:
 *         description: Share tracked successfully
 */
router.post('/:programId/share', requireAuth, async (req, res) => {
  try {
    const { programId } = req.params;
    const userId = (req as any).user.id;
    const { platform } = req.body;

    await shareService.shareProgram({
      programId,
      userId,
      platform,
    });

    const shareableLink = shareService.getShareableLink(programId, platform);
    res.json({ shareableLink });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/share/link:
 *   get:
 *     summary: Get shareable link
 *     description: Returns a shareable link for a course on a specific platform
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: platform
 *         required: true
 *         schema:
 *           type: string
 *           enum: [facebook, twitter, linkedin, whatsapp]
 *     responses:
 *       200:
 *         description: Shareable link generated
 */
router.get('/:programId/share/link', async (req, res) => {
  try {
    const { programId } = req.params;
    const { platform } = req.query;

    if (!platform || typeof platform !== 'string') {
      return res.status(400).json({ error: 'Platform is required' });
    }

    const shareableLink = shareService.getShareableLink(programId, platform);
    res.json({ shareableLink });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * @swagger
 * /api/courses/{courseId}/share/stats:
 *   get:
 *     summary: Get course share statistics
 *     description: Returns sharing statistics for a course
 *     tags: [Sharing]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 */
router.get('/:programId/share/stats', async (req, res) => {
  try {
    const { programId } = req.params;
    const stats = await shareService.getProgramShareStats(programId);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
