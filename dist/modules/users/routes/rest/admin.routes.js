"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_messaging_service_1 = require("../../services/admin-messaging.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/admin/notifications/send:
 *   post:
 *     summary: Send system notification to users (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user IDs to send notification to
 *               userEmails:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of user emails to send notification to
 *               title:
 *                 type: string
 *                 required: true
 *               message:
 *                 type: string
 *                 required: true
 *               type:
 *                 type: string
 *                 default: system
 *               metadata:
 *                 type: object
 *               sendEmail:
 *                 type: boolean
 *                 default: false
 *               link:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notifications sent successfully
 */
router.post('/admin/notifications/send', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const result = await admin_messaging_service_1.adminMessagingService.sendNotification(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error sending notifications:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/notifications/send-all:
 *   post:
 *     summary: Send system notification to all users (Admin only)
 *     tags: [Admin]
 */
router.post('/admin/notifications/send-all', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const result = await admin_messaging_service_1.adminMessagingService.sendNotificationToAll(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error sending notifications to all:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/promotional-email/send:
 *   post:
 *     summary: Send promotional email to users (Admin only)
 *     tags: [Admin]
 */
router.post('/admin/promotional-email/send', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const result = await admin_messaging_service_1.adminMessagingService.sendPromotionalEmail(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error sending promotional emails:', error);
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/admin/promotional-email/send-all:
 *   post:
 *     summary: Send promotional email to all users (Admin only)
 *     tags: [Admin]
 */
router.post('/admin/promotional-email/send-all', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const result = await admin_messaging_service_1.adminMessagingService.sendPromotionalEmailToAll(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error sending promotional emails to all:', error);
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
