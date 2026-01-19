import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { SubscriptionAccessService } from '../../services/subscription-access.service';

const router = Router();
const accessService = new SubscriptionAccessService();

/**
 * @swagger
 * /api/subscriptions/access/check:
 *   post:
 *     summary: Check if user has access to content
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { contentId, contentType } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({ error: 'contentId and contentType are required' });
    }

    const hasAccess = await accessService.hasAccess(userId, contentId, contentType);
    res.json({ hasAccess });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/subscriptions/access/grant:
 *   post:
 *     summary: Grant subscription access to content (admin/teacher)
 */
router.post('/grant', requireAuth, requireRole('TEACHER', 'ADMIN'), async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { contentId, contentType, accessType, expiresAt } = req.body;

    if (!contentId || !contentType) {
      return res.status(400).json({ error: 'contentId and contentType are required' });
    }

    const access = await accessService.grantAccess(
      userId,
      contentId,
      contentType,
      accessType,
      expiresAt ? new Date(expiresAt) : undefined
    );

    res.json(access);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/subscriptions/access/accessible:
 *   get:
 *     summary: Get all accessible content for current user
 */
router.get('/accessible', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const content = await accessService.getAccessibleContent(userId);
    res.json(content);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
