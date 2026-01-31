import { CreateEnrollmentDto, EnrollmentResponseDto, CourseEnrollmentDto, CourseStatsDto } from '../dtos/enrollment.dto';
import { CreatePaymentDto } from '../dtos/payment.dto';
import { prisma } from '../../../utils/prisma';
import { deleteCachePattern } from '../../../utils/cache';
import { SubscriptionService } from '../../subscriptions/services/subscription.service';
import { PrerequisitesService } from './prerequisites.service';
import { emailService } from '../../users/services/email.service';
import { ReferralService } from './referral.service';

export class EnrollmentService {
    private subscriptionService = new SubscriptionService();
    private prerequisitesService = new PrerequisitesService();
    private referralService = new ReferralService();

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
    async enrollStudent(data: CreateEnrollmentDto): Promise<EnrollmentResponseDto> {
        // Check program monetization type
        const program = await prisma.program.findUnique({
            where: { id: data.programId || data.collectionId },
            select: { monetizationType: true, price: true },
        });

        if (!program) {
            throw new Error('Program not found');
        }

        const programId = data.programId || data.collectionId;
        
        if (!programId) {
            throw new Error('Program ID or Collection ID is required');
        }

        // Check access based on monetization type
        const { MonetizationService } = await import('./monetization.service');
        const monetizationService = new MonetizationService();
        const canAccess = await monetizationService.canAccess(data.studentId, programId, 'PROGRAM');

        if (!canAccess) {
            if (program.monetizationType === 'SUBSCRIPTION') {
                throw new Error('Active subscription required to access this program. Please subscribe to continue.');
            } else if (program.monetizationType === 'PREMIUM') {
                throw new Error('This is a premium program. Please purchase to enroll.');
            } else {
                throw new Error('You do not have access to this program.');
            }
        }

        // Check prerequisites
        const prerequisiteCheck = await this.prerequisitesService.checkPrerequisites(
            data.studentId,
            programId
        );
        if (!prerequisiteCheck.canEnroll) {
            const missing = prerequisiteCheck.missingPrerequisites
                .map((p) => p.title)
                .join(', ');
            throw new Error(
                `Cannot enroll: You must complete the following required prerequisites first: ${missing}`
            );
        }

        // Use transaction with unique constraint to prevent race conditions
        // The unique constraint will throw if duplicate enrollment attempted
        const result = await prisma.$transaction(async (tx) => {
            // Check inside transaction to minimize race condition window
            // Using findFirst since composite unique constraints in MongoDB need this approach
            const existingEnrollment = await tx.enrollment.findFirst({
                where: { 
                    programId: programId,
                    studentId: data.studentId
                },
            });

            if (existingEnrollment) {
                throw new Error('Student is already enrolled in this course');
            }
            const payment = await tx.payment.create({
                data: {
                    studentId: data.studentId,
                    programId: programId,
                    amount: data.amount,
                    currency: data.currency || 'USD',
                    status: 'PENDING',
                    provider: data.provider,
                    transactionId: data.transactionId,
                },
            });

            const enrollment = await tx.enrollment.create({
                data: {
                    programId: programId,
                    studentId: data.studentId,
                    paymentId: payment.id,
                },
                include: {
                    program: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
            });

            return enrollment;
        });

        // Invalidate enrollment caches
        await deleteCachePattern(`enrollments:*`);
        await deleteCachePattern(`dashboard:${data.studentId}`);

        // Type assertion for result with includes
        const enrollmentResult = result as any;

        // Send enrollment confirmation email
        try {
            const student = await prisma.user.findUnique({
                where: { id: data.studentId },
                select: { email: true, username: true },
            });
            if (student && enrollmentResult.program) {
                await emailService.sendEnrollmentConfirmation(
                    student.email,
                    student.username,
                    enrollmentResult.program.title,
                    enrollmentResult.program.id
                );
            }
        } catch (emailError) {
            console.warn('Failed to send enrollment email:', emailError);
            // Don't fail enrollment if email fails
        }

        // Record teacher earnings for premium programs
        if (program.monetizationType === 'PREMIUM' && enrollmentResult.payment) {
            try {
                const { TeacherEarningsService } = await import('../../earnings/services/teacher-earnings.service');
                const earningsService = new TeacherEarningsService();
                await earningsService.recordPremiumSale(programId, enrollmentResult.payment.id);
            } catch (earningsError) {
                console.warn('Failed to record teacher earnings:', earningsError);
                // Don't fail enrollment if earnings recording fails
            }
        }

        // Track referral activity
        try {
            await this.referralService.trackReferralActivity(
                data.studentId,
                'ENROLLMENT',
                data.amount
            );
        } catch (referralError) {
            console.warn('Failed to track referral activity:', referralError);
            // Don't fail enrollment if referral tracking fails
        }

        // Map to DTO with backward compatibility
        return {
            ...enrollmentResult,
            collectionId: enrollmentResult.programId, // Backward compatibility
            collection: enrollmentResult.program, // Backward compatibility
        } as EnrollmentResponseDto;
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
    async getProgramEnrollments(programId: string, page: number = 1, limit: number = 20): Promise<{
        data: CourseEnrollmentDto[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { programId },
                skip,
                take,
                include: { student: { select: { id: true, username: true, email: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.enrollment.count({ where: { programId } }),
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
    async getProgramStats(programId: string): Promise<CourseStatsDto> {
        const [enrolledCount, totalRevenue] = await Promise.all([
            prisma.enrollment.count({ where: { programId } }),
            prisma.payment.aggregate({
                where: { programId, status: 'COMPLETED' },
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
    async getStudentEnrollments(studentId: string, page: number = 1, limit: number = 20): Promise<{
        data: EnrollmentResponseDto[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
    }> {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        const [enrollments, total] = await Promise.all([
            prisma.enrollment.findMany({
                where: { studentId },
                skip,
                take,
                include: {
                    program: { select: { id: true, title: true, price: true } },
                    student: { select: { id: true, username: true, email: true } },
                    payment: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.enrollment.count({ where: { studentId } }),
        ]);

        return {
            data: enrollments as EnrollmentResponseDto[],
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
    async isStudentEnrolled(programId: string, studentId: string): Promise<boolean> {
        const enrollment = await prisma.enrollment.findFirst({
            where: { programId, studentId },
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
    async getActiveUsersInProgram(
        programId: string,
        days: number = 7,
        page: number = 1,
        limit: number = 20
    ): Promise<{
        data: Array<{
            id: string;
            username: string;
            email: string;
            enrollmentDate: Date;
            lastAccessed: Date;
            totalActivityCount: number;
            activityBreakdown: {
                progress: number;
                activityLogs: number;
                interactions: number;
                forumPosts: number;
                forumReplies: number;
                videoViews: number;
            };
        }>;
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNext: boolean;
            hasPrev: boolean;
        };
        summary: {
            totalEnrolled: number;
            activeCount: number;
            activePercentage: number;
        };
    }> {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);

        // Calculate the cutoff date for "active" users
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Get all enrollments for the program
        const allEnrollments = await prisma.enrollment.findMany({
            where: { programId },
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

        // Get program videos to filter video analytics
        const programVideos = await prisma.video.findMany({
            where: { programId },
            select: { id: true },
        });
        const videoIds = programVideos.map(v => v.id);

        // Get program forum posts to filter forum replies
        const programForumPosts = await prisma.forumPost.findMany({
            where: { programId },
            select: { id: true },
        });
        const forumPostIds = programForumPosts.map((p: any) => p.id);

        // Query all activity sources in parallel
        const [
            activeProgress,
            activityLogs,
            userInteractions,
            forumPosts,
            forumReplies,
            videoAnalytics,
        ] = await Promise.all([
            // 1. Progress records
            prisma.progress.findMany({
                where: {
                    programId,
                    studentId: { in: enrolledUserIds },
                    lastAccessed: { gte: cutoffDate },
                },
                select: {
                    studentId: true,
                    lastAccessed: true,
                },
            }),

            // 2. ActivityLog records
            prisma.activityLog.findMany({
                where: {
                    userId: { in: enrolledUserIds },
                    entity: 'program',
                    entityId: programId,
                    createdAt: { gte: cutoffDate },
                },
                select: {
                    userId: true,
                    createdAt: true,
                },
            }),

            // 3. UserInteraction records
            prisma.userInteraction.findMany({
                where: {
                    programId,
                    userId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: {
                    userId: true,
                    createdAt: true,
                },
            }),

            // 4. Forum posts
            prisma.forumPost.findMany({
                where: {
                    programId,
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
                ? prisma.forumReply.findMany({
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
                ? prisma.videoAnalytics.findMany({
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

        // Aggregate all activities by user
        interface UserActivity {
            lastAccessed: Date;
            progress: number;
            activityLogs: number;
            interactions: number;
            forumPosts: number;
            forumReplies: number;
            videoViews: number;
        }

        const studentActivity = new Map<string, UserActivity>();

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
            } else {
                existing.progress += 1;
            }
        });

        // Process ActivityLogs
        activityLogs.forEach((log) => {
            if (!log.userId) return; // Skip if userId is null
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
            } else {
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
            } else {
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
            } else {
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
            } else {
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
            } else {
                existing.videoViews += 1;
            }
        });

        // Filter enrollments to only include active users and enrich with activity data
        const activeEnrollments = allEnrollments
            .filter((enrollment) => studentActivity.has(enrollment.studentId))
            .map((enrollment) => {
                const activity = studentActivity.get(enrollment.studentId)!;
                return {
                    id: enrollment.student.id,
                    username: enrollment.student.username,
                    email: enrollment.student.email,
                    enrollmentDate: enrollment.createdAt,
                    lastAccessed: activity.lastAccessed,
                    totalActivityCount:
                        activity.progress +
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
    async getActiveUserCount(programId: string, days: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        // Get enrolled user IDs
        const enrollments = await prisma.enrollment.findMany({
            where: { programId },
            select: { studentId: true },
        });
        const enrolledUserIds = enrollments.map(e => e.studentId);

        if (enrolledUserIds.length === 0) {
            return 0;
        }

        // Get program videos and forum posts for filtering
        const [programVideos, programForumPosts] = await Promise.all([
            prisma.video.findMany({
                where: { programId },
                select: { id: true },
            }),
            prisma.forumPost.findMany({
                where: { programId },
                select: { id: true },
            }),
        ]);
        const videoIds = programVideos.map((v: any) => v.id);
        const forumPostIds = programForumPosts.map((p: any) => p.id);

        // Query all activity sources
        const [
            activeProgress,
            activityLogs,
            userInteractions,
            forumPosts,
            forumReplies,
            videoAnalytics,
        ] = await Promise.all([
            prisma.progress.findMany({
                where: {
                    programId,
                    studentId: { in: enrolledUserIds },
                    lastAccessed: { gte: cutoffDate },
                },
                select: { studentId: true },
                distinct: ['studentId'],
            }),
            prisma.activityLog.findMany({
                where: {
                    userId: { in: enrolledUserIds },
                    entity: 'program',
                    entityId: programId,
                    createdAt: { gte: cutoffDate },
                },
                select: { userId: true },
                distinct: ['userId'],
            }),
            prisma.userInteraction.findMany({
                where: {
                    programId,
                    userId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: { userId: true },
                distinct: ['userId'],
            }),
            prisma.forumPost.findMany({
                where: {
                    programId,
                    authorId: { in: enrolledUserIds },
                    createdAt: { gte: cutoffDate },
                },
                select: { authorId: true },
                distinct: ['authorId'],
            }),
            forumPostIds.length > 0
                ? prisma.forumReply.findMany({
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
                ? prisma.videoAnalytics.findMany({
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
        const activeUserIds = new Set<string>();
        activeProgress.forEach(p => activeUserIds.add(p.studentId));
        activityLogs.forEach(l => { if (l.userId) activeUserIds.add(l.userId); });
        userInteractions.forEach(i => { if (i.userId) activeUserIds.add(i.userId); });
        forumPosts.forEach(p => activeUserIds.add(p.authorId));
        forumReplies.forEach(r => activeUserIds.add(r.authorId));
        videoAnalytics.forEach(a => activeUserIds.add(a.userId));

        return activeUserIds.size;
    }

    // Backward compatibility aliases
    async getCollectionEnrollments(collectionId: string, page: number = 1, limit: number = 20) {
        return this.getProgramEnrollments(collectionId, page, limit);
    }

    async getCollectionStats(collectionId: string) {
        return this.getProgramStats(collectionId);
    }

    async getActiveUsersInCollection(collectionId: string, days: number = 30) {
        return this.getActiveUsersInProgram(collectionId, days);
    }
}