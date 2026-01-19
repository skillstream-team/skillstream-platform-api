import cron from 'node-cron';
import { LessonPaymentService } from '../modules/courses/services/lesson-payment.service';
import { SubscriptionService } from '../modules/subscriptions/services/subscription.service';
import { SubscriptionAccessService } from '../modules/subscriptions/services/subscription-access.service';
import { SubscriptionRevenueService } from '../modules/earnings/services/subscription-revenue.service';
import { EngagementService } from '../modules/analytics/services/engagement.service';
import { prisma } from '../utils/prisma';

export class ScheduledTasksService {
  private paymentService: LessonPaymentService;
  private subscriptionService: SubscriptionService;
  private accessService: SubscriptionAccessService;
  private revenueService: SubscriptionRevenueService;
  private engagementService: EngagementService;
  private isRunning: boolean = false;
  private cronJobs: cron.ScheduledTask[] = [];

  constructor() {
    this.paymentService = new LessonPaymentService();
    this.subscriptionService = new SubscriptionService();
    this.accessService = new SubscriptionAccessService();
    this.revenueService = new SubscriptionRevenueService();
    this.engagementService = new EngagementService();
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
    const unpaidLessonsJob = cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running: Check unpaid lessons');
      try {
        const cancelled = await this.paymentService.checkAndCancelUnpaidLessons();
        if (cancelled > 0) {
          console.log(`✅ Cancelled ${cancelled} unpaid lessons/bookings`);
        }
      } catch (error) {
        console.error('❌ Error checking unpaid lessons:', error);
        // Log to error tracking service (Sentry, etc.)
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });
    this.cronJobs.push(unpaidLessonsJob);

    // Check expired subscriptions daily at midnight UTC
    const expiredSubsJob = cron.schedule('0 0 * * *', async () => {
      console.log('⏰ Running: Check expired subscriptions');
      try {
        const expired = await this.subscriptionService.checkExpiredSubscriptions();
        if (expired > 0) {
          console.log(`✅ Updated ${expired} expired subscriptions`);
        }
      } catch (error) {
        console.error('❌ Error checking expired subscriptions:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });
    this.cronJobs.push(expiredSubsJob);

    // Revoke expired subscription access daily at 1 AM UTC
    const revokeAccessJob = cron.schedule('0 1 * * *', async () => {
      console.log('⏰ Running: Revoke expired subscription access');
      try {
        const revoked = await this.accessService.revokeExpiredAccess();
        if (revoked > 0) {
          console.log(`✅ Revoked ${revoked} expired access records`);
        }
      } catch (error) {
        console.error('❌ Error revoking expired access:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });
    this.cronJobs.push(revokeAccessJob);

    // Distribute subscription revenue monthly (1st of each month at 2 AM UTC)
    const revenueDistJob = cron.schedule('0 2 1 * *', async () => {
      console.log('⏰ Running: Distribute subscription revenue');
      try {
        // Get last month's period
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const period = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

        // Check if already distributed
        const existingPool = await prisma.subscriptionRevenuePool.findUnique({
          where: { period },
          select: { status: true },
        });

        if (existingPool?.status === 'DISTRIBUTED') {
          console.log(`⚠️  Revenue for ${period} already distributed. Skipping.`);
          return;
        }

        const result = await this.revenueService.distributeRevenue(period);
        console.log(`✅ Distributed subscription revenue: ${result.distributed} teachers, $${result.totalAmount.toFixed(2)}`);
      } catch (error) {
        console.error('❌ Error distributing subscription revenue:', error);
        // Critical: Log to monitoring service and alert
      }
    }, {
      scheduled: true,
      timezone: 'UTC',
    });
    this.cronJobs.push(revenueDistJob);

    // Aggregate engagement data daily at 3 AM UTC
    const engagementJob = cron.schedule('0 3 * * *', async () => {
      console.log('⏰ Running: Aggregate engagement data');
      try {
        // This would aggregate watch time from Progress/VideoAnalytics into StudentEngagement
        // For now, we'll just log - actual aggregation would depend on your video tracking system
        console.log('✅ Engagement aggregation scheduled');
      } catch (error) {
        console.error('❌ Error aggregating engagement:', error);
      }
    }, {
      scheduled: true,
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
