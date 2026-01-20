"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledTasksService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const lesson_payment_service_1 = require("../modules/courses/services/lesson-payment.service");
const subscription_service_1 = require("../modules/subscriptions/services/subscription.service");
const subscription_access_service_1 = require("../modules/subscriptions/services/subscription-access.service");
const subscription_revenue_service_1 = require("../modules/earnings/services/subscription-revenue.service");
const engagement_service_1 = require("../modules/analytics/services/engagement.service");
const prisma_1 = require("../utils/prisma");
class ScheduledTasksService {
    constructor() {
        this.isRunning = false;
        this.cronJobs = [];
        this.paymentService = new lesson_payment_service_1.LessonPaymentService();
        this.subscriptionService = new subscription_service_1.SubscriptionService();
        this.accessService = new subscription_access_service_1.SubscriptionAccessService();
        this.revenueService = new subscription_revenue_service_1.SubscriptionRevenueService();
        this.engagementService = new engagement_service_1.EngagementService();
    }
    /**
     * Start all scheduled tasks
     *
     * IMPORTANT: These tasks run in-process and will only execute when:
     * 1. The server is running
     * 2. The process is not crashed/restarted
     *
     * For production reliability, consider:
     * - Using an external scheduler (cron on server, GitHub Actions, etc.)
     * - Using a job queue (Bull, Agenda, etc.)
     * - Using a database-backed scheduler
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️  Scheduled tasks already running');
            return;
        }
        console.log('🕐 Starting scheduled tasks...');
        console.log('⚠️  NOTE: Tasks run in-process. For production, consider external schedulers.');
        // Check unpaid lessons every hour
        const unpaidLessonsJob = node_cron_1.default.schedule('0 * * * *', async () => {
            console.log('⏰ Running: Check unpaid lessons');
            try {
                const cancelled = await this.paymentService.checkAndCancelUnpaidLessons();
                if (cancelled > 0) {
                    console.log(`✅ Cancelled ${cancelled} unpaid lessons/bookings`);
                }
            }
            catch (error) {
                console.error('❌ Error checking unpaid lessons:', error);
                // Log to error tracking service (Sentry, etc.)
            }
        }, {
            timezone: 'UTC',
        });
        this.cronJobs.push(unpaidLessonsJob);
        // Check expired subscriptions daily at midnight UTC
        const expiredSubsJob = node_cron_1.default.schedule('0 0 * * *', async () => {
            console.log('⏰ Running: Check expired subscriptions');
            try {
                const expired = await this.subscriptionService.checkExpiredSubscriptions();
                if (expired > 0) {
                    console.log(`✅ Updated ${expired} expired subscriptions`);
                }
            }
            catch (error) {
                console.error('❌ Error checking expired subscriptions:', error);
            }
        }, {
            timezone: 'UTC',
        });
        this.cronJobs.push(expiredSubsJob);
        // Revoke expired subscription access daily at 1 AM UTC
        const revokeAccessJob = node_cron_1.default.schedule('0 1 * * *', async () => {
            console.log('⏰ Running: Revoke expired subscription access');
            try {
                const revoked = await this.accessService.revokeExpiredAccess();
                if (revoked > 0) {
                    console.log(`✅ Revoked ${revoked} expired access records`);
                }
            }
            catch (error) {
                console.error('❌ Error revoking expired access:', error);
            }
        }, {
            timezone: 'UTC',
        });
        this.cronJobs.push(revokeAccessJob);
        // Distribute subscription revenue monthly (1st of each month at 2 AM UTC)
        const revenueDistJob = node_cron_1.default.schedule('0 2 1 * *', async () => {
            console.log('⏰ Running: Distribute subscription revenue');
            try {
                // Get last month's period
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const period = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;
                // Check if already distributed
                const existingPool = await prisma_1.prisma.subscriptionRevenuePool.findUnique({
                    where: { period },
                    select: { status: true },
                });
                if (existingPool?.status === 'DISTRIBUTED') {
                    console.log(`⚠️  Revenue for ${period} already distributed. Skipping.`);
                    return;
                }
                const result = await this.revenueService.distributeRevenue(period);
                console.log(`✅ Distributed subscription revenue: ${result.distributed} teachers, $${result.totalAmount.toFixed(2)}`);
            }
            catch (error) {
                console.error('❌ Error distributing subscription revenue:', error);
                // Critical: Log to monitoring service and alert
            }
        }, {
            timezone: 'UTC',
        });
        this.cronJobs.push(revenueDistJob);
        // Aggregate engagement data daily at 3 AM UTC
        const engagementJob = node_cron_1.default.schedule('0 3 * * *', async () => {
            console.log('⏰ Running: Aggregate engagement data');
            try {
                // This would aggregate watch time from Progress/VideoAnalytics into StudentEngagement
                // For now, we'll just log - actual aggregation would depend on your video tracking system
                console.log('✅ Engagement aggregation scheduled');
            }
            catch (error) {
                console.error('❌ Error aggregating engagement:', error);
            }
        }, {
            timezone: 'UTC',
        });
        this.cronJobs.push(engagementJob);
        this.isRunning = true;
        console.log(`✅ Scheduled tasks started (${this.cronJobs.length} jobs)`);
    }
    /**
     * Stop all scheduled tasks
     */
    stop() {
        console.log('🛑 Stopping scheduled tasks...');
        this.cronJobs.forEach((job) => {
            job.stop();
        });
        this.cronJobs = [];
        this.isRunning = false;
        console.log('✅ Scheduled tasks stopped');
    }
    /**
     * Get status of scheduled tasks
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            jobCount: this.cronJobs.length,
            jobs: this.cronJobs.map((job, index) => ({
                index,
                running: job.running || false,
            })),
        };
    }
}
exports.ScheduledTasksService = ScheduledTasksService;
