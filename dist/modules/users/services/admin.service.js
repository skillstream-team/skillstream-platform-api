"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminService = void 0;
const prisma_1 = require("../../../utils/prisma");
const push_notifications_service_1 = require("./push-notifications.service");
const notifications_service_1 = require("./notifications.service");
const activity_log_service_1 = require("./activity-log.service");
const sync_1 = require("csv-parse/sync");
const sync_2 = require("csv-stringify/sync");
const bcrypt_1 = __importDefault(require("bcrypt"));
class AdminService {
    constructor() {
        this.pushService = new push_notifications_service_1.PushNotificationsService();
        this.notificationsService = new notifications_service_1.NotificationsService();
        this.activityLogService = new activity_log_service_1.ActivityLogService();
    }
    // ============================================================
    // DASHBOARD STATS
    // ============================================================
    /**
     * Get admin dashboard statistics
     */
    async getDashboardStats() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const [totalUsers, totalTeachers, totalStudents, totalCourses, activeCourses, pendingCourses, allPayments, monthlyPayments, pendingReviews, activeReports, recentSignups, coursesThisMonth,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.user.count({ where: { role: 'TEACHER' } }),
            prisma_1.prisma.user.count({ where: { role: 'STUDENT' } }),
            prisma_1.prisma.collection.count(),
            prisma_1.prisma.collection.count({ where: { isPublished: true } }),
            prisma_1.prisma.collection.count({ where: { isPublished: false } }),
            prisma_1.prisma.payment.findMany({ where: { status: 'COMPLETED' } }),
            prisma_1.prisma.payment.findMany({
                where: { status: 'COMPLETED', createdAt: { gte: startOfMonth } },
            }),
            prisma_1.prisma.collectionReview.count({ where: { isPublished: false } }),
            prisma_1.prisma.contentFlag.count({ where: { status: 'PENDING' } }),
            prisma_1.prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma_1.prisma.collection.count({ where: { createdAt: { gte: startOfMonth } } }),
        ]);
        const totalRevenue = allPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
        return {
            totalUsers,
            totalTeachers,
            totalStudents,
            totalCourses,
            activeCourses,
            pendingCourses,
            totalRevenue,
            monthlyRevenue,
            pendingReviews,
            activeReports,
            recentSignups,
            coursesThisMonth,
        };
    }
    // ============================================================
    // USER MANAGEMENT
    // ============================================================
    /**
     * Get all users with filtering and pagination
     */
    async getUsers(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.search) {
            where.OR = [
                { username: { contains: options.search, mode: 'insensitive' } },
                { email: { contains: options.search, mode: 'insensitive' } },
                { firstName: { contains: options.search, mode: 'insensitive' } },
                { lastName: { contains: options.search, mode: 'insensitive' } },
            ];
        }
        if (options.role) {
            where.role = options.role;
        }
        if (options.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        const [users, total] = await Promise.all([
            prisma_1.prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    isActive: true,
                    isVerified: true,
                    createdAt: true,
                    updatedAt: true,
                },
            }),
            prisma_1.prisma.user.count({ where }),
        ]);
        return {
            users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }
    /**
     * Update user
     */
    async updateUser(userId, data) {
        const updateData = {};
        if (data.role)
            updateData.role = data.role;
        if (data.isActive !== undefined)
            updateData.isActive = data.isActive;
        if (data.isVerified !== undefined)
            updateData.isVerified = data.isVerified;
        const user = await prisma_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                avatar: true,
                isActive: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        // Log activity
        try {
            await this.activityLogService.logActivity({
                userId,
                action: 'USER_UPDATED',
                entity: 'USER',
                entityId: userId,
                metadata: { changes: data },
            });
        }
        catch (error) {
            console.error('Failed to log activity:', error);
        }
        return user;
    }
    /**
     * Delete user
     */
    async deleteUser(userId) {
        // Check if user exists
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new Error('User not found');
        }
        // Soft delete preferred - set isActive to false
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { isActive: false },
        });
        // Log activity
        try {
            await this.activityLogService.logActivity({
                userId,
                action: 'USER_DELETED',
                entity: 'USER',
                entityId: userId,
            });
        }
        catch (error) {
            console.error('Failed to log activity:', error);
        }
        return { success: true };
    }
    // ============================================================
    // COURSE MODERATION
    // ============================================================
    /**
     * Get pending courses
     */
    async getPendingCourses(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const [courses, total] = await Promise.all([
            prisma_1.prisma.collection.findMany({
                where: { isPublished: false },
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    instructor: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.collection.count({ where: { isPublished: false } }),
        ]);
        return {
            courses,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Moderate collection (approve/reject)
     */
    async moderateCollection(courseId, status, rejectionReason, adminId) {
        const course = await prisma_1.prisma.collection.findUnique({
            where: { id: courseId },
        });
        if (!course) {
            throw new Error('Course not found');
        }
        const updateData = { status };
        if (status === 'REJECTED' && rejectionReason) {
            updateData.rejectionReason = rejectionReason;
        }
        if (status === 'APPROVED') {
            updateData.isPublished = true;
        }
        const updatedCourse = await prisma_1.prisma.collection.update({
            where: { id: courseId },
            data: updateData,
            include: {
                instructor: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // Log activity
        if (adminId) {
            try {
                await this.activityLogService.logActivity({
                    userId: adminId,
                    action: `COURSE_${status}`,
                    entity: 'COURSE',
                    entityId: courseId,
                    metadata: { rejectionReason },
                });
            }
            catch (error) {
                console.error('Failed to log activity:', error);
            }
        }
        return updatedCourse;
    }
    // ============================================================
    // REVIEWS MANAGEMENT
    // ============================================================
    /**
     * Get all reviews with filtering and pagination
     */
    async getAllReviews(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.courseId) {
            where.courseId = options.courseId;
        }
        if (options.userId) {
            where.studentId = options.userId;
        }
        if (options.rating) {
            where.rating = options.rating;
        }
        // Map status to isPublished
        if (options.status) {
            const status = options.status.toUpperCase();
            if (status === 'APPROVED' || status === 'PUBLISHED') {
                where.isPublished = true;
            }
            else if (status === 'REJECTED' || status === 'HIDDEN' || status === 'DELETED' || status === 'PENDING') {
                where.isPublished = false;
            }
        }
        const [reviews, total] = await Promise.all([
            prisma_1.prisma.collectionReview.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                            avatar: true,
                        },
                    },
                    collection: {
                        select: {
                            id: true,
                            title: true,
                            instructor: {
                                select: {
                                    id: true,
                                    username: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma_1.prisma.collectionReview.count({ where }),
        ]);
        return {
            reviews,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Moderate review (approve/reject/hide/delete)
     */
    async moderateReview(reviewId, action, reason, adminId) {
        const review = await prisma_1.prisma.collectionReview.findUnique({
            where: { id: reviewId },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        let updateData = {};
        // Store moderation info in a metadata-like structure if needed
        // Since Review model doesn't have status/rejectionReason, we use isPublished
        if (action === 'approve') {
            updateData.isPublished = true;
        }
        else if (action === 'reject') {
            updateData.isPublished = false;
            // Note: Review model doesn't have rejectionReason field
            // Could store in a separate moderation table or use metadata if available
        }
        else if (action === 'hide') {
            updateData.isPublished = false;
        }
        else if (action === 'delete') {
            // Soft delete - unpublish
            updateData.isPublished = false;
        }
        const updatedReview = await prisma_1.prisma.collectionReview.update({
            where: { id: reviewId },
            data: updateData,
            include: {
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                collection: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        // Log activity
        if (adminId) {
            try {
                await this.activityLogService.logActivity({
                    userId: adminId,
                    action: `REVIEW_${action.toUpperCase()}`,
                    entity: 'REVIEW',
                    entityId: reviewId,
                    metadata: { reason },
                });
            }
            catch (error) {
                console.error('Failed to log activity:', error);
            }
        }
        return updatedReview;
    }
    // ============================================================
    // CERTIFICATES MANAGEMENT
    // ============================================================
    /**
     * Get all certificates with filtering and pagination
     */
    async getAllCertificates(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.userId) {
            where.studentId = options.userId;
        }
        if (options.courseId) {
            where.courseId = options.courseId;
        }
        if (options.startDate || options.endDate) {
            where.issuedAt = {};
            if (options.startDate)
                where.issuedAt.gte = options.startDate;
            if (options.endDate)
                where.issuedAt.lte = options.endDate;
        }
        where.isActive = true; // Only show active (non-revoked) by default
        const [certificates, total] = await Promise.all([
            prisma_1.prisma.certificate.findMany({
                where,
                skip,
                take: limit,
                orderBy: { issuedAt: 'desc' },
                include: {
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    collection: {
                        select: {
                            id: true,
                            title: true,
                            instructor: {
                                select: {
                                    id: true,
                                    username: true,
                                },
                            },
                        },
                    },
                },
            }),
            prisma_1.prisma.certificate.count({ where }),
        ]);
        return {
            certificates,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Revoke certificate
     */
    async revokeCertificate(certificateId, reason, adminId) {
        const certificate = await prisma_1.prisma.certificate.findUnique({
            where: { id: certificateId },
        });
        if (!certificate) {
            throw new Error('Certificate not found');
        }
        if (!certificate.isActive) {
            throw new Error('Certificate is already revoked');
        }
        // Store revocation info in metadata
        const metadata = certificate.metadata || {};
        metadata.revoked = true;
        metadata.revokedAt = new Date().toISOString();
        metadata.revocationReason = reason;
        metadata.revokedBy = adminId;
        const updatedCertificate = await prisma_1.prisma.certificate.update({
            where: { id: certificateId },
            data: {
                isActive: false,
                metadata: metadata,
            },
            include: {
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                collection: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
        // Log activity
        if (adminId) {
            try {
                await this.activityLogService.logActivity({
                    userId: adminId,
                    action: 'CERTIFICATE_REVOKED',
                    entity: 'CERTIFICATE',
                    entityId: certificateId,
                    metadata: { reason },
                });
            }
            catch (error) {
                console.error('Failed to log activity:', error);
            }
        }
        return updatedCertificate;
    }
    // ============================================================
    // PAYOUT MANAGEMENT
    // ============================================================
    /**
     * Get all payouts with filtering and pagination
     */
    async getPayouts(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.status) {
            where.status = options.status.toUpperCase();
        }
        if (options.teacherId) {
            where.teacherId = options.teacherId;
        }
        const [payouts, total] = await Promise.all([
            prisma_1.prisma.teacherPayout.findMany({
                where,
                skip,
                take: limit,
                orderBy: { requestedAt: 'desc' },
                include: {
                    teacher: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    earnings: {
                        select: {
                            id: true,
                            amount: true,
                            period: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.teacherPayout.count({ where }),
        ]);
        return {
            payouts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Approve a payout request
     */
    async approvePayout(payoutId, adminId, transactionId, requestInfo) {
        const payout = await prisma_1.prisma.teacherPayout.findUnique({
            where: { id: payoutId },
            include: { teacher: true },
        });
        if (!payout) {
            throw new Error('Payout not found');
        }
        if (payout.status !== 'PENDING') {
            throw new Error(`Cannot approve payout with status: ${payout.status}`);
        }
        const updated = await prisma_1.prisma.teacherPayout.update({
            where: { id: payoutId },
            data: {
                status: 'PROCESSING',
                processedAt: new Date(),
                transactionId: transactionId || payout.transactionId,
            },
            include: {
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // Log activity
        try {
            await this.activityLogService.logActivity({
                userId: adminId,
                action: 'payout.approved',
                entity: 'payout',
                entityId: payoutId,
                metadata: { teacherId: payout.teacherId, amount: payout.amount },
                ipAddress: requestInfo?.ipAddress,
                userAgent: requestInfo?.userAgent,
            });
        }
        catch (error) {
            // Ignore logging errors
            console.error('Failed to log activity:', error);
        }
        return updated;
    }
    /**
     * Reject a payout request
     */
    async rejectPayout(payoutId, adminId, reason, requestInfo) {
        const payout = await prisma_1.prisma.teacherPayout.findUnique({
            where: { id: payoutId },
            include: { teacher: true, earnings: true },
        });
        if (!payout) {
            throw new Error('Payout not found');
        }
        if (payout.status !== 'PENDING') {
            throw new Error(`Cannot reject payout with status: ${payout.status}`);
        }
        // Revert earnings status back to AVAILABLE
        await prisma_1.prisma.$transaction(async (tx) => {
            // Update payout status
            await tx.teacherPayout.update({
                where: { id: payoutId },
                data: {
                    status: 'FAILED',
                    notes: reason || 'Rejected by admin',
                },
            });
            // Revert earnings status
            await tx.teacherEarnings.updateMany({
                where: {
                    payoutId: payoutId,
                },
                data: {
                    status: 'AVAILABLE',
                    payoutId: null,
                    paidAt: null,
                },
            });
        });
        const updated = await prisma_1.prisma.teacherPayout.findUnique({
            where: { id: payoutId },
            include: {
                teacher: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // Log activity
        try {
            await this.activityLogService.logActivity({
                userId: adminId,
                action: 'payout.rejected',
                entity: 'payout',
                entityId: payoutId,
                metadata: { teacherId: payout.teacherId, reason },
                ipAddress: requestInfo?.ipAddress,
                userAgent: requestInfo?.userAgent,
            });
        }
        catch (error) {
            console.error('Failed to log activity:', error);
        }
        return updated;
    }
    // ============================================================
    // BULK OPERATIONS
    // ============================================================
    /**
     * Bulk update users
     */
    async bulkUpdateUsers(userIds, updates, adminId, requestInfo) {
        const results = { updated: 0, failed: 0, errors: [] };
        const ipAddress = requestInfo?.ipAddress;
        const userAgent = requestInfo?.userAgent;
        for (const userId of userIds) {
            try {
                const updateData = {};
                if (updates.role !== undefined) {
                    updateData.role = updates.role;
                }
                if (updates.isActive !== undefined) {
                    updateData.isActive = updates.isActive;
                }
                if (updates.isVerified !== undefined) {
                    updateData.isVerified = updates.isVerified;
                }
                await prisma_1.prisma.user.update({
                    where: { id: userId },
                    data: updateData,
                });
                results.updated++;
                // Log activity
                try {
                    await this.activityLogService.logActivity({
                        userId: adminId,
                        action: 'user.bulk_updated',
                        entity: 'user',
                        entityId: userId,
                        metadata: updates,
                        ipAddress: ipAddress,
                        userAgent: userAgent,
                    });
                }
                catch (error) {
                    // Ignore logging errors
                }
            }
            catch (error) {
                results.failed++;
                results.errors.push(`User ${userId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return results;
    }
    /**
     * Bulk update courses
     */
    async bulkUpdateCourses(courseIds, status, rejectionReason, adminId, requestInfo) {
        const results = { updated: 0, failed: 0, errors: [] };
        const updateData = {
            moderationStatus: status,
        };
        if (status === 'APPROVED') {
            updateData.isPublished = true;
            updateData.rejectionReason = null;
        }
        else if (status === 'REJECTED') {
            updateData.isPublished = false;
            if (rejectionReason) {
                updateData.rejectionReason = rejectionReason;
            }
        }
        else if (status === 'PENDING') {
            updateData.isPublished = false;
        }
        for (const courseId of courseIds) {
            try {
                await prisma_1.prisma.collection.update({
                    where: { id: courseId },
                    data: updateData,
                });
                results.updated++;
                // Log activity
                if (adminId) {
                    try {
                        await this.activityLogService.logActivity({
                            userId: adminId,
                            action: `collection.bulk_${status.toLowerCase()}`,
                            entity: 'collection',
                            entityId: courseId,
                            metadata: { status, rejectionReason },
                            ipAddress: requestInfo?.ipAddress,
                            userAgent: requestInfo?.userAgent,
                        });
                    }
                    catch (error) {
                        // Ignore logging errors
                    }
                }
            }
            catch (error) {
                results.failed++;
                results.errors.push(`Course ${courseId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        }
        return results;
    }
    // ============================================================
    // BROADCAST MANAGEMENT
    // ============================================================
    /**
     * Send broadcast notification
     */
    async sendBroadcast(data, adminId) {
        let targetUserIds = [];
        // Determine target users
        if (data.userIds && data.userIds.length > 0) {
            targetUserIds = data.userIds;
        }
        else {
            const where = {};
            if (data.targetAudience === 'students') {
                where.role = 'STUDENT';
            }
            else if (data.targetAudience === 'teachers') {
                where.role = 'TEACHER';
            }
            else if (data.targetAudience === 'admins') {
                where.role = 'ADMIN';
            }
            const users = await prisma_1.prisma.user.findMany({
                where,
                select: { id: true },
            });
            targetUserIds = users.map((u) => u.id);
        }
        // Create broadcast record
        const broadcast = await prisma_1.prisma.broadcast.create({
            data: {
                createdBy: adminId,
                title: data.title,
                message: data.message,
                targetAudience: data.targetAudience || 'all',
                userIds: data.userIds || [],
                sendEmail: data.sendEmail || false,
                sendPush: data.sendPush || false,
                sentTo: 0,
            },
        });
        let sentCount = 0;
        // Send notifications
        for (const userId of targetUserIds) {
            try {
                // Create in-app notification
                await this.notificationsService.createNotification({
                    userId,
                    type: 'system',
                    title: data.title,
                    message: data.message,
                }, { sendPush: data.sendPush });
                // Send push notification if requested
                if (data.sendPush) {
                    try {
                        await this.pushService.sendNotification(userId, {
                            title: data.title,
                            body: data.message,
                            icon: '/vite.svg',
                            tag: 'broadcast',
                        });
                    }
                    catch (error) {
                        // Ignore push errors
                    }
                }
                sentCount++;
            }
            catch (error) {
                console.error(`Failed to send broadcast to user ${userId}:`, error);
            }
        }
        // Update broadcast with sent count
        await prisma_1.prisma.broadcast.update({
            where: { id: broadcast.id },
            data: { sentTo: sentCount },
        });
        // Log activity
        try {
            await prisma_1.prisma.activityLog.create({
                data: {
                    userId: adminId,
                    action: 'broadcast.sent',
                    entity: 'broadcast',
                    entityId: broadcast.id,
                    metadata: { targetAudience: data.targetAudience, sentTo: sentCount },
                },
            });
        }
        catch (error) {
            console.error('Failed to log activity:', error);
        }
        return {
            success: true,
            sentTo: sentCount,
            broadcast,
        };
    }
    /**
     * Get broadcast history
     */
    async getBroadcasts(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                where.createdAt.gte = options.startDate;
            }
            if (options.endDate) {
                where.createdAt.lte = options.endDate;
            }
        }
        const [broadcasts, total] = await Promise.all([
            prisma_1.prisma.broadcast.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.broadcast.count({ where }),
        ]);
        return {
            broadcasts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    // ============================================================
    // ACTIVITY LOGS
    // ============================================================
    /**
     * Get activity logs with filtering
     */
    async getActivityLogs(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.userId) {
            where.userId = options.userId;
        }
        if (options.action) {
            where.action = options.action;
        }
        if (options.startDate || options.endDate) {
            where.createdAt = {};
            if (options.startDate) {
                where.createdAt.gte = options.startDate;
            }
            if (options.endDate) {
                where.createdAt.lte = options.endDate;
            }
        }
        const [logs, total] = await Promise.all([
            prisma_1.prisma.activityLog.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
            }),
            prisma_1.prisma.activityLog.count({ where }),
        ]);
        return {
            logs: logs.map((log) => ({
                id: log.id,
                userId: log.userId,
                user: log.user,
                action: log.action,
                entityType: log.entity,
                entityId: log.entityId,
                details: log.metadata,
                ipAddress: log.metadata?.ipAddress,
                userAgent: log.metadata?.userAgent,
                createdAt: log.createdAt,
            })),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    // ============================================================
    // USER IMPORT/EXPORT
    // ============================================================
    /**
     * Import users from CSV
     */
    async importUsersFromCSV(csvContent, adminId) {
        const results = {
            imported: 0,
            failed: 0,
            errors: [],
        };
        try {
            const records = (0, sync_1.parse)(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
            });
            for (const [index, record] of records.entries()) {
                try {
                    const recordData = record;
                    // Validate required fields
                    if (!recordData.email || !recordData.username) {
                        results.failed++;
                        results.errors.push(`Row ${index + 2}: Missing email or username`);
                        continue;
                    }
                    // Check if user already exists
                    const existing = await prisma_1.prisma.user.findFirst({
                        where: {
                            OR: [{ email: recordData.email }, { username: recordData.username }],
                        },
                    });
                    if (existing) {
                        results.failed++;
                        results.errors.push(`Row ${index + 2}: User already exists (${recordData.email})`);
                        continue;
                    }
                    // Create user
                    await prisma_1.prisma.user.create({
                        data: {
                            email: recordData.email,
                            username: recordData.username,
                            password: recordData.password ? await this.hashPassword(recordData.password) : null,
                            role: recordData.role || 'STUDENT',
                            firstName: recordData.firstName,
                            lastName: recordData.lastName,
                        },
                    });
                    results.imported++;
                    // Log activity
                    try {
                        await this.activityLogService.logActivity({
                            userId: adminId,
                            action: 'user.imported',
                            entity: 'user',
                            metadata: { email: recordData.email, source: 'csv' },
                        });
                    }
                    catch (error) {
                        // Ignore logging errors
                    }
                }
                catch (error) {
                    results.failed++;
                    results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
        return results;
    }
    /**
     * Export users to CSV
     */
    async exportUsersToCSV(options) {
        const where = {};
        if (options.role) {
            where.role = options.role;
        }
        if (options.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        const users = await prisma_1.prisma.user.findMany({
            where,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                createdAt: true,
            },
        });
        const csvData = (0, sync_2.stringify)(users, {
            header: true,
            columns: ['id', 'username', 'email', 'firstName', 'lastName', 'role', 'createdAt'],
        });
        return csvData;
    }
    /**
     * Hash password for imported users
     */
    async hashPassword(password) {
        return bcrypt_1.default.hash(password, 10);
    }
    // ============================================================
    // CERTIFICATE TEMPLATES
    // ============================================================
    /**
     * Get all certificate templates
     */
    async getCertificateTemplates() {
        return prisma_1.prisma.certificateTemplate.findMany({
            orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        });
    }
    /**
     * Create certificate template
     */
    async createCertificateTemplate(data) {
        // If this is set as default, unset other defaults
        if (data.isDefault) {
            await prisma_1.prisma.certificateTemplate.updateMany({
                where: { isDefault: true },
                data: { isDefault: false },
            });
        }
        return prisma_1.prisma.certificateTemplate.create({
            data: {
                name: data.name,
                design: data.design,
                fields: data.fields,
                isDefault: data.isDefault || false,
            },
        });
    }
    /**
     * Update certificate template
     */
    async updateCertificateTemplate(id, data) {
        // If this is set as default, unset other defaults
        if (data.isDefault) {
            await prisma_1.prisma.certificateTemplate.updateMany({
                where: { isDefault: true, id: { not: id } },
                data: { isDefault: false },
            });
        }
        return prisma_1.prisma.certificateTemplate.update({
            where: { id },
            data,
        });
    }
    /**
     * Delete certificate template
     */
    async deleteCertificateTemplate(id) {
        const template = await prisma_1.prisma.certificateTemplate.findUnique({
            where: { id },
        });
        if (!template) {
            throw new Error('Certificate template not found');
        }
        if (template.isDefault) {
            throw new Error('Cannot delete default template');
        }
        await prisma_1.prisma.certificateTemplate.delete({
            where: { id },
        });
        return { success: true };
    }
    // ============================================================
    // BANNER MANAGEMENT
    // ============================================================
    /**
     * Get all banners
     */
    async getBanners(options) {
        const page = options.page || 1;
        const limit = Math.min(options.limit || 20, 100);
        const skip = (page - 1) * limit;
        const where = {};
        if (options.isActive !== undefined) {
            where.isActive = options.isActive;
        }
        const [banners, total] = await Promise.all([
            prisma_1.prisma.banner.findMany({
                where,
                skip,
                take: limit,
                orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
            }),
            prisma_1.prisma.banner.count({ where }),
        ]);
        return {
            banners,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Create banner
     */
    async createBanner(data) {
        return prisma_1.prisma.banner.create({
            data: {
                title: data.title,
                description: data.description,
                imageUrl: data.imageUrl,
                linkUrl: data.linkUrl,
                startDate: data.startDate,
                endDate: data.endDate,
                isActive: data.isActive !== undefined ? data.isActive : true,
                position: data.position || 'top',
                priority: data.priority || 0,
                targetAudience: data.targetAudience,
            },
        });
    }
    /**
     * Update banner
     */
    async updateBanner(id, data) {
        return prisma_1.prisma.banner.update({
            where: { id },
            data,
        });
    }
    /**
     * Delete banner
     */
    async deleteBanner(id) {
        await prisma_1.prisma.banner.delete({
            where: { id },
        });
        return { success: true };
    }
}
exports.AdminService = AdminService;
