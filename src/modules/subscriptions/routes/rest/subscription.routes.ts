import { Router } from 'express';
import { SubscriptionService } from '../../services/subscription.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { createSubscriptionSchema, activateSubscriptionSchema } from '../../../../utils/validation-schemas';

const router = Router();
const subscriptionService = new SubscriptionService();

/**
 * @swagger
 * /api/subscriptions/status:
 *   get:
 *     summary: Get current subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription status
 *       401:
 *         description: Unauthorized
 */
router.get('/status', requireAuth, async (req: any, res) => {
  try {
    const status = await subscriptionService.getSubscriptionStatus(req.user.id);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

/**
 * @swagger
 * /api/subscriptions/fee:
 *   get:
 *     summary: Get subscription fee
 *     tags: [Subscriptions]
 *     responses:
 *       200:
 *         description: Subscription fee information
 */
router.get('/fee', async (req, res) => {
  try {
    res.json({
      fee: subscriptionService.getSubscriptionFee(),
      currency: 'USD',
      duration: '30 days',
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscription fee' });
  }
});

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription payment
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *             properties:
 *               provider:
 *                 type: string
 *                 example: "stripe"
 *               transactionId:
 *                 type: string
 *                 example: "txn_123456"
 *     responses:
 *       201:
 *         description: Subscription created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/',
  requireAuth,
  validate({ body: createSubscriptionSchema }),
  async (req: any, res) => {
    try {
      const subscription = await subscriptionService.createSubscription({
        userId: req.user.id,
        provider: req.body.provider,
        transactionId: req.body.transactionId,
      });
      res.status(201).json(subscription);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /api/subscriptions/activate:
 *   post:
 *     summary: Activate subscription after payment confirmation
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transactionId
 *               - provider
 *             properties:
 *               transactionId:
 *                 type: string
 *               provider:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription activated successfully
 *       400:
 *         description: Invalid input or subscription already active
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/activate',
  requireAuth,
  validate({ body: activateSubscriptionSchema }),
  async (req: any, res) => {
    try {
      const subscription = await subscriptionService.activateSubscription(req.user.id, {
        transactionId: req.body.transactionId,
        provider: req.body.provider,
      });
      res.json(subscription);
    } catch (error) {
      res.status(400).json({ error: (error as Error).message });
    }
  }
);

/**
 * @swagger
 * /api/subscriptions/cancel:
 *   post:
 *     summary: Cancel subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 *       400:
 *         description: Subscription not found or already cancelled
 *       401:
 *         description: Unauthorized
 */
router.post('/cancel', requireAuth, async (req: any, res) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user.id);
    res.json(subscription);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

export default router;
