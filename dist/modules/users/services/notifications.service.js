"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class NotificationsService {
    /**
     * Create a notification
     */
    async createNotification(data) {
        const notification = await prisma_1.prisma.notification.create({
            data: {
                userId: data.userId,
                type: data.type,
                title: data.title,
                message: data.message,
                link: data.link,
                metadata: data.metadata ? JSON.stringify(data.metadata) : null,
            },
        });
        // Invalidate user notifications cache
        await (0, cache_1.deleteCache)(`notifications:${data.userId}:*`);
        return this.mapToDto(notification);
    }
    /**
     * Create multiple notifications (bulk)
     */
    async createBulkNotifications(notifications) {
        const created = await prisma_1.prisma.notification.createMany({
            data: notifications.map(n => ({
                userId: n.userId,
                type: n.type,
                title: n.title,
                message: n.message,
                link: n.link,
                metadata: n.metadata ? JSON.stringify(n.metadata) : null,
            })),
        });
        // Invalidate cache for all affected users
        const userIds = [...new Set(notifications.map(n => n.userId))];
        for (const userId of userIds) {
            await (0, cache_1.deleteCache)(`notifications:${userId}:*`);
        }
        // Fetch created notifications
        const result = await prisma_1.prisma.notification.findMany({
            where: {
                userId: { in: userIds },
                createdAt: { gte: new Date(Date.now() - 1000) }, // Created in last second
            },
            orderBy: { createdAt: 'desc' },
            take: notifications.length,
        });
        return result.map(this.mapToDto);
    }
    /**
     * Get user notifications
     */
    async getUserNotifications(userId, page = 1, limit = 20, unreadOnly = false) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = { userId };
        if (unreadOnly) {
            where.read = false;
        }
        const [notifications, total, unreadCount] = await Promise.all([
            prisma_1.prisma.notification.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.notification.count({ where }),
            prisma_1.prisma.notification.count({ where: { userId, read: false } }),
        ]);
        return {
            data: notifications.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
                unreadCount,
            },
        };
    }
    /**
     * Mark notification as read
     */
    async markAsRead(notificationId, userId) {
        const notification = await prisma_1.prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        const updated = await prisma_1.prisma.notification.update({
            where: { id: notificationId },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
        await (0, cache_1.deleteCache)(`notifications:${userId}:*`);
        return this.mapToDto(updated);
    }
    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId) {
        const result = await prisma_1.prisma.notification.updateMany({
            where: { userId, read: false },
            data: {
                read: true,
                readAt: new Date(),
            },
        });
        await (0, cache_1.deleteCache)(`notifications:${userId}:*`);
        return result.count;
    }
    /**
     * Delete notification
     */
    async deleteNotification(notificationId, userId) {
        const notification = await prisma_1.prisma.notification.findFirst({
            where: { id: notificationId, userId },
        });
        if (!notification) {
            throw new Error('Notification not found');
        }
        await prisma_1.prisma.notification.delete({
            where: { id: notificationId },
        });
        await (0, cache_1.deleteCache)(`notifications:${userId}:*`);
    }
    /**
     * Delete all read notifications for a user
     */
    async deleteAllRead(userId) {
        const result = await prisma_1.prisma.notification.deleteMany({
            where: { userId, read: true },
        });
        await (0, cache_1.deleteCache)(`notifications:${userId}:*`);
        return result.count;
    }
    /**
     * Get unread count
     */
    async getUnreadCount(userId) {
        return prisma_1.prisma.notification.count({
            where: { userId, read: false },
        });
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(notification) {
        return {
            id: notification.id,
            userId: notification.userId,
            type: notification.type,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            read: notification.read,
            readAt: notification.readAt,
            metadata: notification.metadata
                ? (typeof notification.metadata === 'string'
                    ? JSON.parse(notification.metadata)
                    : notification.metadata)
                : undefined,
            createdAt: notification.createdAt,
        };
    }
}
exports.NotificationsService = NotificationsService;
