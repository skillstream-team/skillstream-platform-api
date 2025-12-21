import { prisma } from '../../../utils/prisma';
import { EnrollmentService } from './enrollment.service';

const RATE_PER_ACTIVE_USER = 0.02; // $0.02 per active user
const MIN_ACTIVE_DAYS = 15; // Must be active for 15 days
const PERIOD_DAYS = 30; // Out of 30 days

export class TeacherEarningsService {
    private enrollmentService = new EnrollmentService();

    /**
     * Check if a user is active for at least 15 days out of 30
     * Returns the number of active days in the period
     */
    private async getActiveDaysInPeriod(
        courseId: string,
        userId: string,
        periodStart: Date,
        periodEnd: Date
    ): Promise<number> {
        // Get all activity timestamps for the user in this period from all sources
        const cutoffDate = periodStart;
        const endDate = periodEnd;

        // Get course videos and forum posts for filtering
        const [courseVideos, courseForumPosts] = await Promise.all([
            prisma.video.findMany({
                where: { courseId },
                select: { id: true },
            }),
            prisma.forumPost.findMany({
                where: { courseId },
                select: { id: true },
            }),
        ]);
        const videoIds = courseVideos.map(v => v.id);
        const forumPostIds = courseForumPosts.map(p => p.id);

        // Get all activity timestamps
        const [
            progressActivities,
            activityLogs,
            userInteractions,
            forumPosts,
            forumReplies,
            videoAnalytics,
        ] = await Promise.all([
            prisma.progress.findMany({
                where: {
                    courseId,
                    studentId: userId,
                    lastAccessed: { gte: cutoffDate, lte: endDate },
                },
                select: { lastAccessed: true },
            }),
            prisma.activityLog.findMany({
                where: {
                    userId,
                    entity: 'course',
                    entityId: courseId,
                    createdAt: { gte: cutoffDate, lte: endDate },
                },
                select: { createdAt: true },
            }),
            prisma.userInteraction.findMany({
                where: {
                    courseId,
                    userId,
                    createdAt: { gte: cutoffDate, lte: endDate },
                },
                select: { createdAt: true },
            }),
            prisma.forumPost.findMany({
                where: {
                    courseId,
                    authorId: userId,
                    createdAt: { gte: cutoffDate, lte: endDate },
                },
                select: { createdAt: true },
            }),
            forumPostIds.length > 0
                ? prisma.forumReply.findMany({
                      where: {
                          postId: { in: forumPostIds },
                          authorId: userId,
                          createdAt: { gte: cutoffDate, lte: endDate },
                      },
                      select: { createdAt: true },
                  })
                : [],
            videoIds.length > 0
                ? prisma.videoAnalytics.findMany({
                      where: {
                          videoId: { in: videoIds },
                          userId,
                          lastWatchedAt: { gte: cutoffDate, lte: endDate },
                      },
                      select: { lastWatchedAt: true },
                  })
                : [],
        ]);

        // Collect all unique dates (by day) when user was active
        const activeDates = new Set<string>();

        // Helper to add date to set (YYYY-MM-DD format)
        const addDate = (date: Date) => {
            const dateStr = date.toISOString().split('T')[0];
            activeDates.add(dateStr);
        };

        progressActivities.forEach(p => addDate(p.lastAccessed));
        activityLogs.forEach(l => addDate(l.createdAt));
        userInteractions.forEach(i => addDate(i.createdAt));
        forumPosts.forEach(p => addDate(p.createdAt));
        forumReplies.forEach(r => addDate(r.createdAt));
        videoAnalytics.forEach(a => addDate(a.lastWatchedAt));

        return activeDates.size;
    }

    /**
     * Calculate monthly earnings for a teacher's course
     * Active users are those active for at least 15 days out of 30
     */
    async calculateMonthlyEarnings(
        teacherId: string,
        courseId: string,
        year: number,
        month: number
    ): Promise<{
        period: string;
        periodStart: Date;
        periodEnd: Date;
        activeUserCount: number;
        ratePerUser: number;
        amount: number;
        earnings: any;
    }> {
        // Calculate period dates
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59, 999);
        const period = `${year}-${String(month).padStart(2, '0')}`;

        // Check if earnings already calculated
        const existing = await prisma.teacherEarnings.findUnique({
            where: {
                teacherId_courseId_period: {
                    teacherId,
                    courseId,
                    period,
                },
            },
        });

        if (existing && existing.status === 'AVAILABLE') {
            return {
                period,
                periodStart,
                periodEnd,
                activeUserCount: existing.activeUserCount,
                ratePerUser: existing.ratePerUser,
                amount: existing.amount,
                earnings: existing,
            };
        }

        // Get all enrolled students for the course
        const enrollments = await prisma.enrollment.findMany({
            where: { courseId },
            select: { studentId: true },
        });

        // Check each student's active days
        const activeUserCounts = await Promise.all(
            enrollments.map(async (enrollment) => {
                const activeDays = await this.getActiveDaysInPeriod(
                    courseId,
                    enrollment.studentId,
                    periodStart,
                    periodEnd
                );
                return activeDays >= MIN_ACTIVE_DAYS ? 1 : 0;
            })
        );

        const activeUserCount = activeUserCounts.reduce((sum: number, count) => sum + count, 0);
        const amount = activeUserCount * RATE_PER_ACTIVE_USER;

        // Upsert earnings record
        const earnings = await prisma.teacherEarnings.upsert({
            where: {
                teacherId_courseId_period: {
                    teacherId,
                    courseId,
                    period,
                },
            },
            update: {
                activeUserCount,
                amount,
                status: 'AVAILABLE',
                updatedAt: new Date(),
            },
            create: {
                teacherId,
                courseId,
                periodStart,
                periodEnd,
                period,
                activeUserCount,
                ratePerUser: RATE_PER_ACTIVE_USER,
                amount,
                currency: 'USD',
                status: 'AVAILABLE',
            },
        });

        // Update teacher earnings summary
        await this.updateTeacherEarningsSummary(teacherId);

        return {
            period,
            periodStart,
            periodEnd,
            activeUserCount,
            ratePerUser: RATE_PER_ACTIVE_USER,
            amount,
            earnings,
        };
    }

    /**
     * Get all available earnings for a teacher (ready for cashout)
     */
    async getAvailableEarnings(teacherId: string): Promise<{
        totalAvailable: number;
        earnings: Array<{
            id: string;
            courseId: string;
            courseTitle: string;
            period: string;
            activeUserCount: number;
            amount: number;
        }>;
    }> {
        const availableEarnings = await prisma.teacherEarnings.findMany({
            where: {
                teacherId,
                status: 'AVAILABLE',
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                period: 'desc',
            },
        });

        const totalAvailable = availableEarnings.reduce((sum, e) => sum + e.amount, 0);

        return {
            totalAvailable,
            earnings: availableEarnings.map((e) => ({
                id: e.id,
                courseId: e.courseId,
                courseTitle: e.course.title,
                period: e.period,
                activeUserCount: e.activeUserCount,
                amount: e.amount,
            })),
        };
    }

    /**
     * Request a payout (cashout)
     */
    async requestPayout(
        teacherId: string,
        amount?: number,
        paymentMethod?: string,
        paymentDetails?: any
    ): Promise<{
        payout: any;
        earningsIncluded: number;
        totalAmount: number;
    }> {
        // Get available earnings
        const available = await this.getAvailableEarnings(teacherId);

        const payoutAmount = amount || available.totalAvailable;

        if (payoutAmount <= 0) {
            throw new Error('No available earnings to cash out');
        }

        if (payoutAmount > available.totalAvailable) {
            throw new Error(`Requested amount ($${payoutAmount}) exceeds available earnings ($${available.totalAvailable})`);
        }

        // Select earnings to include (FIFO - oldest first)
        // First, get full earnings records
        const fullEarnings = await prisma.teacherEarnings.findMany({
            where: {
                teacherId,
                status: 'AVAILABLE',
            },
            orderBy: {
                period: 'asc',
            },
        });

        const earningsToInclude: Array<{ id: string; amountToTake: number }> = [];
        let totalSelected = 0;

        for (const earning of fullEarnings) {
            if (totalSelected >= payoutAmount) break;
            
            const remaining = payoutAmount - totalSelected;
            const amountToTake = Math.min(earning.amount, remaining);
            
            if (amountToTake > 0) {
                earningsToInclude.push({
                    id: earning.id,
                    amountToTake,
                });
                totalSelected += amountToTake;
            }
        }

        // Create payout record
        const payout = await prisma.$transaction(async (tx) => {
            const newPayout = await tx.teacherPayout.create({
                data: {
                    teacherId,
                    amount: payoutAmount,
                    currency: 'USD',
                    status: 'PENDING',
                    paymentMethod: paymentMethod || 'bank_transfer',
                    paymentDetails: paymentDetails || {},
                },
            });

            // Mark earnings as PAID and link to payout
            const earningsIds = earningsToInclude.map((e) => e.id);
            
            // For partial payouts, we need to handle splitting earnings
            // For now, we'll mark full earnings as paid (can be enhanced later)
            await tx.teacherEarnings.updateMany({
                where: {
                    id: { in: earningsIds },
                    teacherId,
                    status: 'AVAILABLE',
                },
                data: {
                    status: 'PAID',
                    payoutId: newPayout.id,
                    paidAt: new Date(),
                },
            });

            return newPayout;
        });

        // Update teacher earnings summary
        await this.updateTeacherEarningsSummary(teacherId);

        return {
            payout,
            earningsIncluded: earningsToInclude.length,
            totalAmount: payoutAmount,
        };
    }

    /**
     * Get teacher earnings summary (lifetime, pending, available)
     */
    async getTeacherEarningsSummary(teacherId: string): Promise<{
        lifetimeEarnings: number;
        totalPaid: number;
        pendingAmount: number;
        availableAmount: number;
        summary: any;
    }> {
        await this.updateTeacherEarningsSummary(teacherId);

        const summary = await prisma.teacherEarningsSummary.findUnique({
            where: { teacherId },
        });

        if (!summary) {
            return {
                lifetimeEarnings: 0,
                totalPaid: 0,
                pendingAmount: 0,
                availableAmount: 0,
                summary: null,
            };
        }

        return {
            lifetimeEarnings: summary.lifetimeEarnings,
            totalPaid: summary.totalPaid,
            pendingAmount: summary.pendingAmount,
            availableAmount: summary.availableAmount,
            summary,
        };
    }

    /**
     * Update teacher earnings summary
     */
    private async updateTeacherEarningsSummary(teacherId: string): Promise<void> {
        // Calculate totals from earnings
        const allEarnings = await prisma.teacherEarnings.findMany({
            where: { teacherId },
        });

        const lifetimeEarnings = allEarnings.reduce((sum, e) => sum + e.amount, 0);
        const totalPaid = allEarnings
            .filter((e) => e.status === 'PAID')
            .reduce((sum, e) => sum + e.amount, 0);
        const availableAmount = allEarnings
            .filter((e) => e.status === 'AVAILABLE')
            .reduce((sum, e) => sum + e.amount, 0);
        const pendingAmount = allEarnings
            .filter((e) => e.status === 'PENDING')
            .reduce((sum, e) => sum + e.amount, 0);

        await prisma.teacherEarningsSummary.upsert({
            where: { teacherId },
            update: {
                lifetimeEarnings,
                totalPaid,
                pendingAmount,
                availableAmount,
                lastCalculated: new Date(),
            },
            create: {
                teacherId,
                lifetimeEarnings,
                totalPaid,
                pendingAmount,
                availableAmount,
            },
        });
    }

    /**
     * Get payout history for a teacher
     */
    async getPayoutHistory(
        teacherId: string,
        page: number = 1,
        limit: number = 20
    ): Promise<{
        data: any[];
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

        const [payouts, total] = await Promise.all([
            prisma.teacherPayout.findMany({
                where: { teacherId },
                skip,
                take,
                include: {
                    earnings: {
                        include: {
                            course: {
                                select: {
                                    id: true,
                                    title: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { requestedAt: 'desc' },
            }),
            prisma.teacherPayout.count({ where: { teacherId } }),
        ]);

        return {
            data: payouts,
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
     * Calculate earnings for all courses for a teacher for a given month
     */
    async calculateAllCoursesEarnings(
        teacherId: string,
        year: number,
        month: number
    ): Promise<{
        totalEarnings: number;
        coursesCalculated: number;
        results: Array<{
            courseId: string;
            courseTitle: string;
            activeUserCount: number;
            amount: number;
        }>;
    }> {
        // Get all courses for the teacher
        const courses = await prisma.course.findMany({
            where: { instructorId: teacherId },
            select: {
                id: true,
                title: true,
            },
        });

        const results = await Promise.all(
            courses.map(async (course) => {
                try {
                    const result = await this.calculateMonthlyEarnings(
                        teacherId,
                        course.id,
                        year,
                        month
                    );
                    return {
                        courseId: course.id,
                        courseTitle: course.title,
                        activeUserCount: result.activeUserCount,
                        amount: result.amount,
                    };
                } catch (error) {
                    console.error(`Error calculating earnings for course ${course.id}:`, error);
                    return {
                        courseId: course.id,
                        courseTitle: course.title,
                        activeUserCount: 0,
                        amount: 0,
                    };
                }
            })
        );

        const totalEarnings = results.reduce((sum, r) => sum + r.amount, 0);

        return {
            totalEarnings,
            coursesCalculated: courses.length,
            results,
        };
    }

    /**
     * Get monthly earnings breakdown for a teacher
     */
    async getMonthlyEarningsBreakdown(
        teacherId: string,
        year?: number,
        month?: number
    ): Promise<Array<{
        period: string;
        courseId: string;
        courseTitle: string;
        activeUserCount: number;
        amount: number;
        status: string;
    }>> {
        const where: any = { teacherId };
        
        if (year && month) {
            const period = `${year}-${String(month).padStart(2, '0')}`;
            where.period = period;
        }

        const earnings = await prisma.teacherEarnings.findMany({
            where,
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: {
                period: 'desc',
            },
        });

        return earnings.map((e) => ({
            period: e.period,
            courseId: e.courseId,
            courseTitle: e.course.title,
            activeUserCount: e.activeUserCount,
            amount: e.amount,
            status: e.status,
        }));
    }
}
