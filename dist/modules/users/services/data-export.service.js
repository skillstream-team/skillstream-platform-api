"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataExportService = void 0;
const prisma_1 = require("../../../utils/prisma");
const email_service_1 = require("./email.service");
class DataExportService {
    /**
     * Export all user data (GDPR compliance)
     */
    async exportUserData(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Get all user data
        const [enrollments, progress, quizAttempts, submissions, certificates, payments, messages, notifications, settings,] = await Promise.all([
            prisma_1.prisma.enrollment.findMany({
                where: { studentId: userId },
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                            price: true,
                        },
                    },
                    payment: true,
                },
            }),
            prisma_1.prisma.progress.findMany({
                where: { studentId: userId },
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.quizAttempt.findMany({
                where: { studentId: userId },
                include: {
                    quiz: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.submission.findMany({
                where: { studentId: userId },
                include: {
                    assignment: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.certificate.findMany({
                where: { studentId: userId },
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.payment.findMany({
                where: { studentId: userId },
                include: {
                    program: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.message.findMany({
                where: {
                    OR: [
                        { senderId: userId },
                        { receiverId: userId },
                    ],
                },
                include: {
                    sender: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    receiver: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.notification.findMany({
                where: { userId },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.userSettings.findFirst({
                where: { userId },
            }),
        ]);
        return {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.firstName || undefined,
                lastName: user.lastName || undefined,
                role: user.role,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
            enrollments,
            progress,
            quizAttempts,
            submissions,
            certificates,
            payments,
            messages,
            notifications,
            settings: settings || undefined,
        };
    }
    /**
     * Export user data and send via email
     */
    async exportAndEmailUserData(userId) {
        const data = await this.exportUserData(userId);
        // Convert to JSON
        const jsonData = JSON.stringify(data, null, 2);
        // Send email with data
        await email_service_1.emailService.sendEmail(data.user.email, 'Your Data Export - SkillStream Platform', `Dear ${data.user.username},<br><br>Please find your exported data attached.<br><br>This export contains all your personal data stored on our platform.<br><br>Best regards,<br>SkillStream Team`, false, jsonData, 'user-data-export.json');
    }
    /**
     * Delete user account and all associated data (GDPR right to be forgotten)
     */
    async deleteUserAccount(userId) {
        // Use transaction to ensure all data is deleted
        await prisma_1.prisma.$transaction(async (tx) => {
            // Delete in order to respect foreign key constraints
            await tx.notification.deleteMany({ where: { userId } });
            await tx.userSettings.deleteMany({ where: { userId } });
            await tx.progress.deleteMany({ where: { studentId: userId } });
            await tx.quizAttempt.deleteMany({ where: { studentId: userId } });
            await tx.submission.deleteMany({ where: { studentId: userId } });
            await tx.certificate.deleteMany({ where: { studentId: userId } });
            await tx.enrollment.deleteMany({ where: { studentId: userId } });
            await tx.payment.deleteMany({ where: { studentId: userId } });
            await tx.message.deleteMany({
                where: {
                    OR: [
                        { senderId: userId },
                        { receiverId: userId },
                    ],
                },
            });
            await tx.conversationParticipant.deleteMany({ where: { userId } });
            await tx.activityLog.deleteMany({ where: { userId } });
            await tx.auditLog.deleteMany({ where: { userId } });
            // Delete user
            await tx.user.delete({
                where: { id: userId },
            });
        });
    }
}
exports.DataExportService = DataExportService;
