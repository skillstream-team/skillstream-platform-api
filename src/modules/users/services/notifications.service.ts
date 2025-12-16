import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateNotificationDto {
  userId: string;
  type: 'system' | 'course' | 'message' | 'assignment' | 'quiz' | 'certificate' | 'announcement';
  title: string;
  message: string;
  link?: string;
  metadata?: any;
}

export interface NotificationResponseDto {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: Date;
  metadata?: any;
  createdAt: Date;
}

export class NotificationsService {
  /**
   * Create a notification
   */
  async createNotification(data: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await prisma.notification.create({
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
    await deleteCache(`notifications:${data.userId}:*`);

    return this.mapToDto(notification);
  }

  /**
   * Create multiple notifications (bulk)
   */
  async createBulkNotifications(notifications: CreateNotificationDto[]): Promise<NotificationResponseDto[]> {
    const created = await prisma.notification.createMany({
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
      await deleteCache(`notifications:${userId}:*`);
    }

    // Fetch created notifications
    const result = await prisma.notification.findMany({
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
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    unreadOnly: boolean = false
  ): Promise<{
    data: NotificationResponseDto[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
      unreadCount: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100);

    const where: any = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, read: false } }),
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
  async markAsRead(notificationId: string, userId: string): Promise<NotificationResponseDto> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    await deleteCache(`notifications:${userId}:*`);

    return this.mapToDto(updated);
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.notification.updateMany({
      where: { userId, read: false },
      data: {
        read: true,
        readAt: new Date(),
      },
    });

    await deleteCache(`notifications:${userId}:*`);

    return result.count;
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    await prisma.notification.delete({
      where: { id: notificationId },
    });

    await deleteCache(`notifications:${userId}:*`);
  }

  /**
   * Delete all read notifications for a user
   */
  async deleteAllRead(userId: string): Promise<number> {
    const result = await prisma.notification.deleteMany({
      where: { userId, read: true },
    });

    await deleteCache(`notifications:${userId}:*`);

    return result.count;
  }

  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: { userId, read: false },
    });
  }

  /**
   * Map Prisma model to DTO
   */
  private mapToDto(notification: any): NotificationResponseDto {
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
