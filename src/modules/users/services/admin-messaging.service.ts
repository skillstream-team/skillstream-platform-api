import { prisma } from '../../../utils/prisma';
import { emailService } from './email.service';
import { Server as SocketIOServer } from 'socket.io';

// Global io instance - will be set by server initialization
let globalIo: SocketIOServer | null = null;

export function setSocketIO(io: SocketIOServer) {
  globalIo = io;
}

export interface SendNotificationDto {
  userIds?: string[];
  userEmails?: string[];
  title: string;
  message: string;
  type?: string;
  metadata?: any;
  sendEmail?: boolean;
  link?: string;
}

export interface SendPromotionalEmailDto {
  userEmails?: string[];
  userIds?: string[];
  subject: string;
  content: string;
  ctaText?: string;
  ctaLink?: string;
}

export class AdminMessagingService {
  /**
   * Send system notification to users
   */
  async sendNotification(data: SendNotificationDto) {
    try {
      let userIds: string[] = [];

      // Get user IDs from emails if provided
      if (data.userEmails && data.userEmails.length > 0) {
        const users = await prisma.user.findMany({
          where: { email: { in: data.userEmails } },
          select: { id: true }
        });
        userIds = [...userIds, ...users.map(u => u.id)];
      }

      // Add provided user IDs
      if (data.userIds && data.userIds.length > 0) {
        userIds = [...userIds, ...data.userIds];
      }

      // Remove duplicates
      userIds = [...new Set(userIds)];

      if (userIds.length === 0) {
        throw new Error('No valid users found');
      }

      // Create notifications
      const notifications = await Promise.all(
        userIds.map(userId =>
          prisma.notification.create({
            data: {
              toUserId: userId,
              title: data.title,
              message: data.message,
              type: data.type || 'system',
              metadata: data.metadata || {},
            },
            include: {
              toUser: {
                select: { id: true, email: true, username: true }
              }
            }
          })
        )
      );

      // Send real-time notifications via Socket.IO
      if (globalIo) {
        notifications.forEach(notification => {
          globalIo!.to(`user-${notification.toUserId}`).emit('notification', {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            createdAt: notification.createdAt,
          });
        });
      }

      // Send email notifications if requested
      if (data.sendEmail) {
        await Promise.all(
          notifications.map(async (notification) => {
            try {
              await emailService.sendSystemNotificationEmail(
                notification.toUser.email,
                notification.title,
                notification.message,
                data.link
              );
            } catch (error) {
              console.error(`Error sending email to ${notification.toUser.email}:`, error);
              // Continue with other emails even if one fails
            }
          })
        );
      }

      return {
        success: true,
        sentCount: notifications.length,
        notifications: notifications.map(n => ({
          id: n.id,
          userId: n.toUserId,
          email: n.toUser.email
        }))
      };
    } catch (error) {
      throw new Error('Failed to send notifications: ' + (error as Error).message);
    }
  }

  /**
   * Send promotional email to users
   */
  async sendPromotionalEmail(data: SendPromotionalEmailDto) {
    try {
      let emails: string[] = [];

      // Get emails from user IDs if provided
      if (data.userIds && data.userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: data.userIds } },
          select: { email: true }
        });
        emails = [...emails, ...users.map(u => u.email)];
      }

      // Add provided emails
      if (data.userEmails && data.userEmails.length > 0) {
        emails = [...emails, ...data.userEmails];
      }

      // Remove duplicates
      emails = [...new Set(emails)];

      if (emails.length === 0) {
        throw new Error('No valid emails found');
      }

      // Send promotional emails
      const results = await Promise.allSettled(
        emails.map(async (email) => {
          try {
            await emailService.sendPromotionalEmail(
              email,
              data.subject,
              data.content,
              data.ctaText,
              data.ctaLink
            );
            return { email, success: true };
          } catch (error) {
            console.error(`Error sending promotional email to ${email}:`, error);
            return { email, success: false, error: (error as Error).message };
          }
        })
      );

      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;

      return {
        success: true,
        sentCount: successful,
        failedCount: failed,
        totalCount: emails.length,
        results: results.map((r, i) => ({
          email: emails[i],
          success: r.status === 'fulfilled' && r.value.success,
          error: r.status === 'rejected' ? r.reason : (r.status === 'fulfilled' && !r.value.success ? r.value.error : undefined)
        }))
      };
    } catch (error) {
      throw new Error('Failed to send promotional emails: ' + (error as Error).message);
    }
  }

  /**
   * Send notification to all users
   */
  async sendNotificationToAll(data: Omit<SendNotificationDto, 'userIds' | 'userEmails'>) {
    try {
      const allUsers = await prisma.user.findMany({
        select: { id: true, email: true }
      });

      return await this.sendNotification({
        ...data,
        userIds: allUsers.map(u => u.id)
      });
    } catch (error) {
      throw new Error('Failed to send notification to all users: ' + (error as Error).message);
    }
  }

  /**
   * Send promotional email to all users
   */
  async sendPromotionalEmailToAll(data: Omit<SendPromotionalEmailDto, 'userIds' | 'userEmails'>) {
    try {
      const allUsers = await prisma.user.findMany({
        select: { email: true }
      });

      return await this.sendPromotionalEmail({
        ...data,
        userEmails: allUsers.map(u => u.email)
      });
    } catch (error) {
      throw new Error('Failed to send promotional email to all users: ' + (error as Error).message);
    }
  }
}

export const adminMessagingService = new AdminMessagingService();

