"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notifications_service_1 = require("../../services/notifications.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const notificationsService = new notifications_service_1.NotificationsService();
/**
 * @swagger
 * /api/users/{userId}/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 */
const getNotificationsSchema = zod_1.z.object({
    page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
    limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
    unreadOnly: zod_1.z.string().optional().transform(val => val === 'true'),
});
router.get('/users/:userId/notifications', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ userId: zod_1.z.string().min(1) }),
    query: getNotificationsSchema
}), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const page = typeof req.query.page === 'string' ? parseInt(req.query.page) : (typeof req.query.page === 'number' ? req.query.page : 1);
        const limit = typeof req.query.limit === 'string' ? parseInt(req.query.limit) : (typeof req.query.limit === 'number' ? req.query.limit : 20);
        const unreadOnly = String(req.query.unreadOnly || '') === 'true';
        const result = await notificationsService.getUserNotifications(userId, page, limit, unreadOnly);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 */
router.get('/users/:userId/notifications/unread-count', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const count = await notificationsService.getUnreadCount(userId);
        res.json({
            success: true,
            data: { unreadCount: count }
        });
    }
    catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ error: 'Failed to fetch unread count' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 */
router.put('/users/:userId/notifications/:notificationId/read', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1),
        notificationId: zod_1.z.string().min(1)
    })
}), async (req, res) => {
    try {
        const { userId, notificationId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const notification = await notificationsService.markAsRead(notificationId, userId);
        res.json({
            success: true,
            data: notification
        });
    }
    catch (error) {
        console.error('Error marking notification as read:', error);
        res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 */
router.put('/users/:userId/notifications/read-all', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const count = await notificationsService.markAllAsRead(userId);
        res.json({
            success: true,
            data: { markedAsRead: count },
            message: `Marked ${count} notifications as read`
        });
    }
    catch (error) {
        console.error('Error marking all notifications as read:', error);
        res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 */
router.delete('/users/:userId/notifications/:notificationId', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        userId: zod_1.z.string().min(1),
        notificationId: zod_1.z.string().min(1)
    })
}), async (req, res) => {
    try {
        const { userId, notificationId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        await notificationsService.deleteNotification(notificationId, userId);
        res.json({
            success: true,
            message: 'Notification deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting notification:', error);
        res.status(500).json({ error: error.message || 'Failed to delete notification' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/notifications/read:
 *   delete:
 *     summary: Delete all read notifications
 *     tags: [Notifications]
 */
router.delete('/users/:userId/notifications/read', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ userId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?.id;
        if (userId !== currentUserId && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const count = await notificationsService.deleteAllRead(userId);
        res.json({
            success: true,
            data: { deleted: count },
            message: `Deleted ${count} read notifications`
        });
    }
    catch (error) {
        console.error('Error deleting read notifications:', error);
        res.status(500).json({ error: 'Failed to delete read notifications' });
    }
});
exports.default = router;
