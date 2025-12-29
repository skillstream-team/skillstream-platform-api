"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const push_notifications_service_1 = require("../../services/push-notifications.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const pushService = new push_notifications_service_1.PushNotificationsService();
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
const subscribeSchema = zod_1.z.object({
    subscription: zod_1.z.object({
        endpoint: zod_1.z.string().url(),
        keys: zod_1.z.object({
            p256dh: zod_1.z.string(),
            auth: zod_1.z.string(),
        }),
    }),
});
router.post('/push/subscribe', auth_1.requireAuth, (0, validation_1.validate)({ body: subscribeSchema }), async (req, res) => {
    try {
        const userId = req.user.id;
        const { subscription } = req.body;
        await pushService.subscribe(userId, subscription);
        res.json({
            success: true,
            message: 'Successfully subscribed to push notifications',
        });
    }
    catch (error) {
        console.error('Error subscribing to push notifications:', error);
        res.status(400).json({
            error: error.message || 'Failed to subscribe to push notifications',
        });
    }
});
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
router.post('/push/unsubscribe', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        await pushService.unsubscribe(userId);
        res.json({
            success: true,
            message: 'Successfully unsubscribed from push notifications',
        });
    }
    catch (error) {
        console.error('Error unsubscribing from push notifications:', error);
        res.status(500).json({
            error: 'Failed to unsubscribe from push notifications',
        });
    }
});
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
router.get('/push/subscription', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const status = await pushService.getSubscriptionStatus(userId);
        res.json(status);
    }
    catch (error) {
        console.error('Error getting push subscription status:', error);
        res.status(500).json({
            error: 'Failed to get push subscription status',
        });
    }
});
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
router.get('/push/vapid-key', async (req, res) => {
    try {
        const publicKey = pushService.getVapidPublicKey();
        res.json({
            publicKey,
        });
    }
    catch (error) {
        res.status(500).json({
            error: error.message || 'VAPID key not configured',
        });
    }
});
exports.default = router;
