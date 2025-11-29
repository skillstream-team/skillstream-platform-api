"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMessagingService = exports.AdminMessagingService = void 0;
exports.setSocketIO = setSocketIO;
const prisma_1 = require("../../../utils/prisma");
const email_service_1 = require("./email.service");
// Global io instance - will be set by server initialization
let globalIo = null;
function setSocketIO(io) {
    globalIo = io;
}
class AdminMessagingService {
    /**
     * Send system notification to users
     */
    async sendNotification(data) {
        try {
            let userIds = [];
            // Get user IDs from emails if provided
            if (data.userEmails && data.userEmails.length > 0) {
                const users = await prisma_1.prisma.user.findMany({
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
            const notifications = await Promise.all(userIds.map(userId => prisma_1.prisma.notification.create({
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
            })));
            // Send real-time notifications via Socket.IO
            if (globalIo) {
                notifications.forEach(notification => {
                    globalIo.to(`user-${notification.toUserId}`).emit('notification', {
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
                await Promise.all(notifications.map(async (notification) => {
                    try {
                        await email_service_1.emailService.sendSystemNotificationEmail(notification.toUser.email, notification.title, notification.message, data.link);
                    }
                    catch (error) {
                        console.error(`Error sending email to ${notification.toUser.email}:`, error);
                        // Continue with other emails even if one fails
                    }
                }));
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
        }
        catch (error) {
            throw new Error('Failed to send notifications: ' + error.message);
        }
    }
    /**
     * Send promotional email to users
     */
    async sendPromotionalEmail(data) {
        try {
            let emails = [];
            // Get emails from user IDs if provided
            if (data.userIds && data.userIds.length > 0) {
                const users = await prisma_1.prisma.user.findMany({
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
            const results = await Promise.allSettled(emails.map(async (email) => {
                try {
                    await email_service_1.emailService.sendPromotionalEmail(email, data.subject, data.content, data.ctaText, data.ctaLink);
                    return { email, success: true };
                }
                catch (error) {
                    console.error(`Error sending promotional email to ${email}:`, error);
                    return { email, success: false, error: error.message };
                }
            }));
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
        }
        catch (error) {
            throw new Error('Failed to send promotional emails: ' + error.message);
        }
    }
    /**
     * Send notification to all users
     */
    async sendNotificationToAll(data) {
        try {
            const allUsers = await prisma_1.prisma.user.findMany({
                select: { id: true, email: true }
            });
            return await this.sendNotification({
                ...data,
                userIds: allUsers.map(u => u.id)
            });
        }
        catch (error) {
            throw new Error('Failed to send notification to all users: ' + error.message);
        }
    }
    /**
     * Send promotional email to all users
     */
    async sendPromotionalEmailToAll(data) {
        try {
            const allUsers = await prisma_1.prisma.user.findMany({
                select: { email: true }
            });
            return await this.sendPromotionalEmail({
                ...data,
                userEmails: allUsers.map(u => u.email)
            });
        }
        catch (error) {
            throw new Error('Failed to send promotional email to all users: ' + error.message);
        }
    }
}
exports.AdminMessagingService = AdminMessagingService;
exports.adminMessagingService = new AdminMessagingService();
