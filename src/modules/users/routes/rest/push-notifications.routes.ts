import { Router } from 'express';
import { PushNotificationsService } from '../../services/push-notifications.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const pushService = new PushNotificationsService();

/**
 * @swagger
 * /api/users/push/subscribe:
 *   post:
 *     summary: Subscribe to push notifications
 *     description: Store push subscription for the authenticated user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscription
 *             properties:
 *               subscription:
 *                 type: object
 *                 required:
 *                   - endpoint
 *                   - keys
 *                 properties:
 *                   endpoint:
 *                     type: string
 *                     example: https://fcm.googleapis.com/fcm/send/...
 *                   keys:
 *                     type: object
 *                     required:
 *                       - p256dh
 *                       - auth
 *                     properties:
 *                       p256dh:
 *                         type: string
 *                       auth:
 *                         type: string
 *     responses:
 *       200:
 *         description: Successfully subscribed
 *       400:
 *         description: Invalid subscription data
 *       401:
 *         description: Unauthorized
 */
const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string(),
    }),
  }),
});

router.post('/push/subscribe',
  requireAuth,
  validate({ body: subscribeSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user.id;
      const { subscription } = req.body;

      await pushService.subscribe(userId, subscription);

      res.json({
        success: true,
        message: 'Successfully subscribed to push notifications',
      });
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      res.status(400).json({
        error: (error as Error).message || 'Failed to subscribe to push notifications',
      });
    }
  }
);

/**
 * @swagger
 * /api/users/push/unsubscribe:
 *   post:
 *     summary: Unsubscribe from push notifications
 *     description: Remove push subscription for the authenticated user
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully unsubscribed
 *       401:
 *         description: Unauthorized
 */
router.post('/push/unsubscribe',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;

      await pushService.unsubscribe(userId);

      res.json({
        success: true,
        message: 'Successfully unsubscribed from push notifications',
      });
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      res.status(500).json({
        error: 'Failed to unsubscribe from push notifications',
      });
    }
  }
);

/**
 * @swagger
 * /api/users/push/subscription:
 *   get:
 *     summary: Get push subscription status
 *     description: Check if the current user has an active push subscription
 *     tags: [Push Notifications]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 subscribed:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/push/subscription',
  requireAuth,
  async (req, res) => {
    try {
      const userId = (req as any).user.id;

      const status = await pushService.getSubscriptionStatus(userId);

      res.json(status);
    } catch (error) {
      console.error('Error getting push subscription status:', error);
      res.status(500).json({
        error: 'Failed to get push subscription status',
      });
    }
  }
);

/**
 * @swagger
 * /api/users/push/vapid-key:
 *   get:
 *     summary: Get VAPID public key
 *     description: Get the VAPID public key for frontend push subscription
 *     tags: [Push Notifications]
 *     security: []
 *     responses:
 *       200:
 *         description: VAPID public key
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 publicKey:
 *                   type: string
 *       500:
 *         description: VAPID key not configured
 */
router.get('/push/vapid-key',
  async (req, res) => {
    try {
      const publicKey = pushService.getVapidPublicKey();

      res.json({
        publicKey,
      });
    } catch (error) {
      res.status(500).json({
        error: (error as Error).message || 'VAPID key not configured',
      });
    }
  }
);

export default router;

