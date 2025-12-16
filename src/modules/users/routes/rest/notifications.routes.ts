import { Router } from 'express';
import { NotificationsService } from '../../services/notifications.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const notificationsService = new NotificationsService();

/**
 * @swagger
 * /api/users/{userId}/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Notifications]
 */
const getNotificationsSchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
  unreadOnly: z.string().optional().transform(val => val === 'true'),
});

router.get('/users/:userId/notifications',
  requireAuth,
  validate({ 
    params: z.object({ userId: z.string().min(1) }),
    query: getNotificationsSchema 
  }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
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
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 */
router.get('/users/:userId/notifications/unread-count',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const count = await notificationsService.getUnreadCount(userId);
      
      res.json({
        success: true,
        data: { unreadCount: count }
      });
    } catch (error) {
      console.error('Error fetching unread count:', error);
      res.status(500).json({ error: 'Failed to fetch unread count' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/notifications/{notificationId}/read:
 *   put:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 */
router.put('/users/:userId/notifications/:notificationId/read',
  requireAuth,
  validate({ 
    params: z.object({ 
      userId: z.string().min(1),
      notificationId: z.string().min(1)
    })
  }),
  async (req, res) => {
    try {
      const { userId, notificationId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const notification = await notificationsService.markAsRead(notificationId, userId);
      
      res.json({
        success: true,
        data: notification
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to mark notification as read' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/notifications/read-all:
 *   put:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 */
router.put('/users/:userId/notifications/read-all',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const count = await notificationsService.markAllAsRead(userId);
      
      res.json({
        success: true,
        data: { markedAsRead: count },
        message: `Marked ${count} notifications as read`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({ error: 'Failed to mark all notifications as read' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/notifications/{notificationId}:
 *   delete:
 *     summary: Delete notification
 *     tags: [Notifications]
 */
router.delete('/users/:userId/notifications/:notificationId',
  requireAuth,
  validate({ 
    params: z.object({ 
      userId: z.string().min(1),
      notificationId: z.string().min(1)
    })
  }),
  async (req, res) => {
    try {
      const { userId, notificationId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      await notificationsService.deleteNotification(notificationId, userId);
      
      res.json({
        success: true,
        message: 'Notification deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete notification' });
    }
  }
);

/**
 * @swagger
 * /api/users/{userId}/notifications/read:
 *   delete:
 *     summary: Delete all read notifications
 *     tags: [Notifications]
 */
router.delete('/users/:userId/notifications/read',
  requireAuth,
  validate({ params: z.object({ userId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { userId } = req.params;
      const currentUserId = (req as any).user?.id;

      if (userId !== currentUserId && (req as any).user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      const count = await notificationsService.deleteAllRead(userId);
      
      res.json({
        success: true,
        data: { deleted: count },
        message: `Deleted ${count} read notifications`
      });
    } catch (error) {
      console.error('Error deleting read notifications:', error);
      res.status(500).json({ error: 'Failed to delete read notifications' });
    }
  }
);

export default router;
