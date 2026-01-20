"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionRevenueService = void 0;
const prisma_1 = require("../../../utils/prisma");
class SubscriptionRevenueService {
    constructor() {
        this.PLATFORM_FEE_PERCENT = 0.30; // 30%
    }
    /**
     * Calculate monthly subscription revenue pool
     */
    async calculateMonthlyPool(period) {
        const [year, month] = period.split('-').map(Number);
        const periodStart = new Date(year, month - 1, 1);
        const periodEnd = new Date(year, month, 0, 23, 59, 59);
        // Get all active subscriptions during this period
        const subscriptions = await prisma_1.prisma.subscription.findMany({
            where: {
                status: 'COMPLETED',
                OR: [
                    {
                        startsAt: { lte: periodEnd },
                        expiresAt: { gte: periodStart },
                    },
                ],
            },
        });
        // Calculate total revenue
        const totalRevenue = subscriptions.reduce((sum, sub) => sum + sub.amount, 0);
        const platformFee = totalRevenue * this.PLATFORM_FEE_PERCENT;
        const teacherPool = totalRevenue - platformFee;
        // Get total watch time and engagements for the period
        const engagements = await prisma_1.prisma.studentEngagement.findMany({
            where: {
                period,
            },
        });
        const totalWatchTime = engagements.reduce((sum, e) => sum + e.watchTimeMinutes, 0);
        const totalEngagements = engagements.filter((e) => e.isCompleted).length;
        // Create or update revenue pool
        const pool = await prisma_1.prisma.subscriptionRevenuePool.upsert({
            where: { period },
            update: {
                totalRevenue,
                platformFee,
                teacherPool,
                totalWatchTime,
                totalEngagements,
                status: 'CALCULATING',
            },
            create: {
                period,
                periodStart,
                periodEnd,
                totalRevenue,
                platformFee,
                teacherPool,
                totalWatchTime,
                totalEngagements,
                status: 'CALCULATING',
            },
        });
        return pool;
    }
    /**
     * Distribute revenue to teachers based on engagement
     */
    async distributeRevenue(period) {
        // Calculate pool first
        const pool = await this.calculateMonthlyPool(period);
        if (pool.totalWatchTime === 0) {
            // No engagement, mark as distributed with zero earnings
            await prisma_1.prisma.subscriptionRevenuePool.update({
                where: { period },
                data: {
                    status: 'DISTRIBUTED',
                    distributedAt: new Date(),
                },
            });
            return { distributed: 0, totalAmount: 0 };
        }
        // Get all engagements grouped by teacher/content
        const engagements = await prisma_1.prisma.studentEngagement.findMany({
            where: { period },
            include: {
                collection: {
                    select: {
                        instructorId: true,
                    },
                },
                lesson: {
                    select: {
                        teacherId: true,
                    },
                },
            },
        });
        // Group by teacher and calculate watch time
        const teacherWatchTime = new Map();
        const teacherEngagements = new Map();
        for (const engagement of engagements) {
            const teacherId = engagement.collection?.instructorId || engagement.lesson?.teacherId;
            if (!teacherId)
                continue;
            const currentWatchTime = teacherWatchTime.get(teacherId) || 0;
            teacherWatchTime.set(teacherId, currentWatchTime + engagement.watchTimeMinutes);
            if (engagement.isCompleted) {
                const currentEngagements = teacherEngagements.get(teacherId) || 0;
                teacherEngagements.set(teacherId, currentEngagements + 1);
            }
        }
        // Calculate and create earnings for each teacher
        const earningsCreated = [];
        for (const [teacherId, watchTime] of teacherWatchTime.entries()) {
            const share = this.calculateTeacherShare(watchTime, pool.totalWatchTime, pool.teacherPool);
            if (share > 0) {
                const [year, month] = period.split('-').map(Number);
                const periodStart = new Date(year, month - 1, 1);
                const periodEnd = new Date(year, month, 0, 23, 59, 59);
                const earnings = await prisma_1.prisma.teacherEarnings.create({
                    data: {
                        teacherId,
                        periodStart,
                        periodEnd,
                        period,
                        revenueSource: 'SUBSCRIPTION',
                        watchTimeMinutes: watchTime,
                        engagedStudents: teacherEngagements.get(teacherId) || 0,
                        platformFeePercent: this.PLATFORM_FEE_PERCENT,
                        platformFeeAmount: share * this.PLATFORM_FEE_PERCENT,
                        netAmount: share * (1 - this.PLATFORM_FEE_PERCENT),
                        amount: share,
                        currency: 'USD',
                        status: 'AVAILABLE',
                        revenuePoolId: pool.id,
                    },
                });
                earningsCreated.push(earnings);
            }
        }
        // Mark pool as distributed
        await prisma_1.prisma.subscriptionRevenuePool.update({
            where: { period },
            data: {
                status: 'DISTRIBUTED',
                distributedAt: new Date(),
            },
        });
        return {
            distributed: earningsCreated.length,
            totalAmount: earningsCreated.reduce((sum, e) => sum + e.amount, 0),
        };
    }
    /**
     * Calculate teacher's share of subscription pool
     */
    calculateTeacherShare(teacherWatchTime, totalWatchTime, poolAmount) {
        if (totalWatchTime === 0)
            return 0;
        return (teacherWatchTime / totalWatchTime) * poolAmount;
    }
}
exports.SubscriptionRevenueService = SubscriptionRevenueService;
