"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnrollmentService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
const subscription_service_1 = require("../../subscriptions/services/subscription.service");
const prerequisites_service_1 = require("./prerequisites.service");
const email_service_1 = require("../../users/services/email.service");
const referral_service_1 = require("./referral.service");
class EnrollmentService {
    constructor() {
        this.subscriptionService = new subscription_service_1.SubscriptionService();
        this.prerequisitesService = new prerequisites_service_1.PrerequisitesService();
        this.referralService = new referral_service_1.ReferralService();
    }
    /**
     * @swagger
     * /enrollments:
     *   post:
     *     summary: Enroll a student in a course
     *     description: Creates an enrollment record for a student, including a linked payment record.
     *     tags: [Enrollments]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateEnrollmentDto'
     *     responses:
     *       201:
     *         description: Successfully enrolled the student
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/EnrollmentResponseDto'
     *       400:
     *         description: Student already enrolled or invalid data
     */
    async enrollStudent(data) {
        // Check if student has active subscription
        const hasSubscription = await this.subscriptionService.hasActiveSubscription(data.studentId);
        if (!hasSubscription) {
            throw new Error('Active subscription required to enroll in courses. Please subscribe ($6/month) to continue.');
        }
        // Check prerequisites
        const prerequisiteCheck = await this.prerequisitesService.checkPrerequisites(data.studentId, data.courseId);
        if (!prerequisiteCheck.canEnroll) {
            const missing = prerequisiteCheck.missingPrerequisites
                .map((p) => p.title)
                .join(', ');
            throw new Error(`Cannot enroll: You must complete the following required prerequisites first: ${missing}`);
        }
        // Use transaction with unique constraint to prevent race conditions
        // The unique constraint will throw if duplicate enrollment attempted
        const result = await prisma_1.prisma.$transaction(async (tx) => {
            // Check inside transaction to minimize race condition window
            // Using findFirst since composite unique constraints in MongoDB need this approach
            const existingEnrollment = await tx.enrollment.findFirst({
                where: {
                    courseId: data.courseId,
                    studentId: data.studentId
                },
            });
            if (existingEnrollment) {
                throw new Error('Student is already enrolled in this course');
            }
            const payment = await tx.payment.create({
                data: {
                    studentId: data.studentId,
                    courseId: data.courseId,
                    amount: data.amount,
                    currency: data.currency || 'USD',
                    status: 'PENDING',
                    provider: data.provider,
                    transactionId: data.transactionId,
                },
            });
            const enrollment = await tx.enrollment.create({
                data: {
                    courseId: data.courseId,
                    studentId: data.studentId,
                    paymentId: payment.id,
                },
                include: {
                    course: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
            });
            return enrollment;
        });
        // Invalidate enrollment caches
        await (0, cache_1.deleteCachePattern)(`enrollments:*`);
        await (0, cache_1.deleteCachePattern)(`dashboard:${data.studentId}`);
        // Send enrollment confirmation email
        try {
            const student = await prisma_1.prisma.user.findUnique({
                where: { id: data.studentId },
                select: { email: true, username: true },
            });
            if (student) {
                await email_service_1.emailService.sendEnrollmentConfirmation(student.email, student.username, result.course.title, result.course.id);
            }
        }
        catch (emailError) {
            console.warn('Failed to send enrollment email:', emailError);
            // Don't fail enrollment if email fails
        }
        // Track referral activity
        try {
            await this.referralService.trackReferralActivity(data.studentId, 'ENROLLMENT', data.amount);
        }
        catch (referralError) {
            console.warn('Failed to track referral activity:', referralError);
            // Don't fail enrollment if referral tracking fails
        }
        return result;
    }
    /**
     * @swagger
     * /enrollments/course/{courseId}:
     *   get:
     *     summary: Get all enrollments for a specific course
     *     description: Returns a list of all students enrolled in a specific course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *         description: ID of the course
     *     responses:
     *       200:
     *         description: List of enrolled students
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/CourseEnrollmentDto'
     */
    async getCourseEnrollments(courseId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [enrollments, total] = await Promise.all([
            prisma_1.prisma.enrollment.findMany({
                where: { courseId },
                skip,
                take,
                include: { student: { select: { id: true, username: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.enrollment.count({ where: { courseId } }),
        ]);
        return {
            data: enrollments.map((enrollment) => ({
                id: enrollment.student.id,
                username: enrollment.student.username,
                email: enrollment.student.email,
                enrollmentDate: enrollment.createdAt,
            })),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * @swagger
     * /enrollments/course/{courseId}/stats:
     *   get:
     *     summary: Get course enrollment statistics
     *     description: Retrieves total enrollment count and revenue for a specific course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Course statistics
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/CourseStatsDto'
     */
    async getCourseStats(courseId) {
        const [enrolledCount, totalRevenue] = await Promise.all([
            prisma_1.prisma.enrollment.count({ where: { courseId } }),
            prisma_1.prisma.payment.aggregate({
                where: { courseId, status: 'COMPLETED' },
                _sum: { amount: true },
            }),
        ]);
        return {
            enrolledCount,
            totalRevenue: totalRevenue._sum.amount || 0,
        };
    }
    /**
     * @swagger
     * /enrollments/student/{studentId}:
     *   get:
     *     summary: Get all courses a student is enrolled in
     *     description: Returns detailed enrollment and payment information for a student.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: studentId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: List of student enrollments
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/EnrollmentResponseDto'
     */
    async getStudentEnrollments(studentId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [enrollments, total] = await Promise.all([
            prisma_1.prisma.enrollment.findMany({
                where: { studentId },
                skip,
                take,
                include: {
                    course: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.enrollment.count({ where: { studentId } }),
        ]);
        return {
            data: enrollments,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * @swagger
     * /enrollments/check:
     *   get:
     *     summary: Check if a student is enrolled in a course
     *     description: Verifies if a student is enrolled in a given course.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: query
     *         name: courseId
     *         required: true
     *         schema:
     *           type: integer
     *       - in: query
     *         name: studentId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Enrollment status
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 enrolled:
     *                   type: boolean
     *                   example: true
     */
    async isStudentEnrolled(courseId, studentId) {
        const enrollment = await prisma_1.prisma.enrollment.findFirst({
            where: { courseId, studentId },
        });
        return !!enrollment;
    }
    /**
     * @swagger
     * /enrollments/course/{courseId}/active:
     *   get:
     *     summary: Get active users in a course
     *     description: Returns a list of users who have been active in the course within a specified time period (default: last 7 days). Tracks activity from multiple sources: Progress, ActivityLog, UserInteraction, Forum posts/replies, Video analytics, and Login streaks.
     *     tags: [Enrollments]
     *     parameters:
     *       - in: path
     *         name: courseId
     *         required: true
     *         schema:
     *           type: string
     *       - in: query
     *         name: days
     *         schema:
     *           type: integer
     *           default: 7
     *         description: Number of days to look back for activity
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *     responses:
     *       200:
     *         description: List of active users with detailed activity breakdown
     */
    async getActiveUsersInCourse(courseId, days = 7, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        // Calculate the cutoff date for "active" users
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        // Get all enrollments for the course
        const allEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: { courseId },
            include: {
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        const enrolledUserIds = allEnrollments.map(e => e.studentId);
        // Get course videos to filter video analytics
        const courseVideos = await prisma_1.prisma.video.findMany({
            where: { courseId },
            select: { id: true },
        });
        const videoIds = courseVideos.map(v => v.id);
        // Get course forum posts to filter forum replies
        const courseForumPosts = await prisma_1.prisma.forumPost.findMany({
            where: { courseId },
            select: { id: true },
        });
        const forumPostIds = courseForumPosts.map(p => p.id);
        // Query all activity sources in parallel
        const [activeProgress, activityLogs, userInteractions, forumPosts, forumReplies, videoAnalytics,] = await Promise.all([
            // 1. Progress records
            prisma_1.prisma.progress.findMany({
                where: {
                    courseId,
                    studentId: { in: enrolledUserIds },
                    lastAccessed: { gte: cutoffDate },
                },
                select: {
                    studentId: true,
                    lastAccessed: true,
                },
            }),
            // 2. ActivityLog records
            prisma_1.prisma.activityLog.findMany({
                where: {
                    userId: { in: enrolledUserIds },
                    entity: 'course',
                    entityId: courseId,
                    createdAt: { gte: cutoffDate },
                },
                select: {
                    userId: true,
                    createdAt: true,
                },
            }),
            // 3. UserInteraction records
            prisma_1.prisma.userInteraction.findMany({
                where: {
                    courseId,
                    userId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: {
                    userId: true,
                    createdAt: true,
                },
            }),
            // 4. Forum posts
            prisma_1.prisma.forumPost.findMany({
                where: {
                    courseId,
                    authorId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: {
                    authorId: true,
                    createdAt: true,
                },
            }),
            // 5. Forum replies (filtered by course posts)
            forumPostIds.length > 0
                ? prisma_1.prisma.forumReply.findMany({
                    where: {
                        postId: { in: forumPostIds },
                        authorId: { in: enrolledUserIds },
                        createdAt: { gte: cutoffDate },
                    },
                    select: {
                        authorId: true,
                        createdAt: true,
                    },
                })
                : [],
            // 6. Video analytics
            videoIds.length > 0
                ? prisma_1.prisma.videoAnalytics.findMany({
                    where: {
                        videoId: { in: videoIds },
                        userId: { in: enrolledUserIds },
                        lastWatchedAt: { gte: cutoffDate },
                    },
                    select: {
                        userId: true,
                        lastWatchedAt: true,
                    },
                })
                : [],
        ]);
        const studentActivity = new Map();
        // Process Progress
        activeProgress.forEach((progress) => {
            const existing = studentActivity.get(progress.studentId);
            if (!existing || progress.lastAccessed > existing.lastAccessed) {
                studentActivity.set(progress.studentId, {
                    lastAccessed: progress.lastAccessed,
                    progress: (existing?.progress || 0) + 1,
                    activityLogs: existing?.activityLogs || 0,
                    interactions: existing?.interactions || 0,
                    forumPosts: existing?.forumPosts || 0,
                    forumReplies: existing?.forumReplies || 0,
                    videoViews: existing?.videoViews || 0,
                });
            }
            else {
                existing.progress += 1;
            }
        });
        // Process ActivityLogs
        activityLogs.forEach((log) => {
            if (!log.userId)
                return; // Skip if userId is null
            const existing = studentActivity.get(log.userId);
            if (!existing || log.createdAt > existing.lastAccessed) {
                studentActivity.set(log.userId, {
                    lastAccessed: log.createdAt,
                    progress: existing?.progress || 0,
                    activityLogs: (existing?.activityLogs || 0) + 1,
                    interactions: existing?.interactions || 0,
                    forumPosts: existing?.forumPosts || 0,
                    forumReplies: existing?.forumReplies || 0,
                    videoViews: existing?.videoViews || 0,
                });
            }
            else {
                existing.activityLogs += 1;
            }
        });
        // Process UserInteractions
        userInteractions.forEach((interaction) => {
            const existing = studentActivity.get(interaction.userId);
            if (!existing || interaction.createdAt > existing.lastAccessed) {
                studentActivity.set(interaction.userId, {
                    lastAccessed: interaction.createdAt,
                    progress: existing?.progress || 0,
                    activityLogs: existing?.activityLogs || 0,
                    interactions: (existing?.interactions || 0) + 1,
                    forumPosts: existing?.forumPosts || 0,
                    forumReplies: existing?.forumReplies || 0,
                    videoViews: existing?.videoViews || 0,
                });
            }
            else {
                existing.interactions += 1;
            }
        });
        // Process Forum Posts
        forumPosts.forEach((post) => {
            const existing = studentActivity.get(post.authorId);
            if (!existing || post.createdAt > existing.lastAccessed) {
                studentActivity.set(post.authorId, {
                    lastAccessed: post.createdAt,
                    progress: existing?.progress || 0,
                    activityLogs: existing?.activityLogs || 0,
                    interactions: existing?.interactions || 0,
                    forumPosts: (existing?.forumPosts || 0) + 1,
                    forumReplies: existing?.forumReplies || 0,
                    videoViews: existing?.videoViews || 0,
                });
            }
            else {
                existing.forumPosts += 1;
            }
        });
        // Process Forum Replies
        forumReplies.forEach((reply) => {
            const existing = studentActivity.get(reply.authorId);
            if (!existing || reply.createdAt > existing.lastAccessed) {
                studentActivity.set(reply.authorId, {
                    lastAccessed: reply.createdAt,
                    progress: existing?.progress || 0,
                    activityLogs: existing?.activityLogs || 0,
                    interactions: existing?.interactions || 0,
                    forumPosts: existing?.forumPosts || 0,
                    forumReplies: (existing?.forumReplies || 0) + 1,
                    videoViews: existing?.videoViews || 0,
                });
            }
            else {
                existing.forumReplies += 1;
            }
        });
        // Process Video Analytics
        videoAnalytics.forEach((analytics) => {
            const existing = studentActivity.get(analytics.userId);
            if (!existing || analytics.lastWatchedAt > existing.lastAccessed) {
                studentActivity.set(analytics.userId, {
                    lastAccessed: analytics.lastWatchedAt,
                    progress: existing?.progress || 0,
                    activityLogs: existing?.activityLogs || 0,
                    interactions: existing?.interactions || 0,
                    forumPosts: existing?.forumPosts || 0,
                    forumReplies: existing?.forumReplies || 0,
                    videoViews: (existing?.videoViews || 0) + 1,
                });
            }
            else {
                existing.videoViews += 1;
            }
        });
        // Filter enrollments to only include active users and enrich with activity data
        const activeEnrollments = allEnrollments
            .filter((enrollment) => studentActivity.has(enrollment.studentId))
            .map((enrollment) => {
            const activity = studentActivity.get(enrollment.studentId);
            return {
                id: enrollment.student.id,
                username: enrollment.student.username,
                email: enrollment.student.email,
                enrollmentDate: enrollment.createdAt,
                lastAccessed: activity.lastAccessed,
                totalActivityCount: activity.progress +
                    activity.activityLogs +
                    activity.interactions +
                    activity.forumPosts +
                    activity.forumReplies +
                    activity.videoViews,
                activityBreakdown: {
                    progress: activity.progress,
                    activityLogs: activity.activityLogs,
                    interactions: activity.interactions,
                    forumPosts: activity.forumPosts,
                    forumReplies: activity.forumReplies,
                    videoViews: activity.videoViews,
                },
            };
        })
            .sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
        const total = activeEnrollments.length;
        const paginatedData = activeEnrollments.slice(skip, skip + take);
        return {
            data: paginatedData,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
            summary: {
                totalEnrolled: allEnrollments.length,
                activeCount: total,
                activePercentage: allEnrollments.length > 0
                    ? Math.round((total / allEnrollments.length) * 100 * 100) / 100
                    : 0,
            },
        };
    }
    /**
     * Get count of active users in a course (using all activity sources)
     */
    async getActiveUserCount(courseId, days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        // Get enrolled user IDs
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { courseId },
            select: { studentId: true },
        });
        const enrolledUserIds = enrollments.map(e => e.studentId);
        if (enrolledUserIds.length === 0) {
            return 0;
        }
        // Get course videos and forum posts for filtering
        const [courseVideos, courseForumPosts] = await Promise.all([
            prisma_1.prisma.video.findMany({
                where: { courseId },
                select: { id: true },
            }),
            prisma_1.prisma.forumPost.findMany({
                where: { courseId },
                select: { id: true },
            }),
        ]);
        const videoIds = courseVideos.map(v => v.id);
        const forumPostIds = courseForumPosts.map(p => p.id);
        // Query all activity sources
        const [activeProgress, activityLogs, userInteractions, forumPosts, forumReplies, videoAnalytics,] = await Promise.all([
            prisma_1.prisma.progress.findMany({
                where: {
                    courseId,
                    studentId: { in: enrolledUserIds },
                    lastAccessed: { gte: cutoffDate },
                },
                select: { studentId: true },
                distinct: ['studentId'],
            }),
            prisma_1.prisma.activityLog.findMany({
                where: {
                    userId: { in: enrolledUserIds },
                    entity: 'course',
                    entityId: courseId,
                    createdAt: { gte: cutoffDate },
                },
                select: { userId: true },
                distinct: ['userId'],
            }),
            prisma_1.prisma.userInteraction.findMany({
                where: {
                    courseId,
                    userId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: { userId: true },
                distinct: ['userId'],
            }),
            prisma_1.prisma.forumPost.findMany({
                where: {
                    courseId,
                    authorId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: { authorId: true },
                distinct: ['authorId'],
            }),
            forumPostIds.length > 0
                ? prisma_1.prisma.forumReply.findMany({
                    where: {
                        postId: { in: forumPostIds },
                        authorId: { in: enrolledUserIds },
                        createdAt: { gte: cutoffDate },
                    },
                    select: { authorId: true },
                    distinct: ['authorId'],
                })
                : [],
            videoIds.length > 0
                ? prisma_1.prisma.videoAnalytics.findMany({
                    where: {
                        videoId: { in: videoIds },
                        userId: { in: enrolledUserIds },
                        lastWatchedAt: { gte: cutoffDate },
                    },
                    select: { userId: true },
                    distinct: ['userId'],
                })
                : [],
        ]);
        // Combine all unique user IDs from all sources
        const activeUserIds = new Set();
        activeProgress.forEach(p => activeUserIds.add(p.studentId));
        activityLogs.forEach(l => { if (l.userId)
            activeUserIds.add(l.userId); });
        userInteractions.forEach(i => { if (i.userId)
            activeUserIds.add(i.userId); });
        forumPosts.forEach(p => activeUserIds.add(p.authorId));
        forumReplies.forEach(r => activeUserIds.add(r.authorId));
        videoAnalytics.forEach(a => activeUserIds.add(a.userId));
        return activeUserIds.size;
    }
}
exports.EnrollmentService = EnrollmentService;
