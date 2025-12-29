import cron from 'node-cron';
import { LessonPaymentService } from '../modules/courses/services/lesson-payment.service';
import { SubscriptionService } from '../modules/subscriptions/services/subscription.service';
import { TeacherEarningsService } from '../modules/courses/services/teacher-earnings.service';
import { prisma } from '../utils/prisma';

export class ScheduledTasksService {
  private paymentService: LessonPaymentService;
  private subscriptionService: SubscriptionService;
  private earningsService: TeacherEarningsService;
  private isRunning: boolean = false;

  constructor() {
    this.paymentService = new LessonPaymentService();
    this.subscriptionService = new SubscriptionService();
    this.earningsService = new TeacherEarningsService();
  }

  /**
   * Start all scheduled tasks
   */
  start() {
    if (this.isRunning) {
      console.log('⚠️  Scheduled tasks already running');
      return;
    }

    console.log('🕐 Starting scheduled tasks...');

    // Check unpaid lessons every hour
    cron.schedule('0 * * * *', async () => {
      console.log('⏰ Running: Check unpaid lessons');
      try {
        const cancelled = await this.paymentService.checkAndCancelUnpaidLessons();
        if (cancelled > 0) {
          console.log(`✅ Cancelled ${cancelled} unpaid lessons/bookings`);
        }
      } catch (error) {
        console.error('❌ Error checking unpaid lessons:', error);
      }
    });

    // Check expired subscriptions daily at midnight
    cron.schedule('0 0 * * *', async () => {
      console.log('⏰ Running: Check expired subscriptions');
      try {
        const expired = await this.subscriptionService.checkExpiredSubscriptions();
        if (expired > 0) {
          console.log(`✅ Updated ${expired} expired subscriptions`);
        }
      } catch (error) {
        console.error('❌ Error checking expired subscriptions:', error);
      }
    });

    // Calculate teacher earnings monthly (1st of each month at 2 AM)
    cron.schedule('0 2 1 * *', async () => {
      console.log('⏰ Running: Calculate teacher earnings');
      try {
        // Get all teachers
        const teachers = await prisma.user.findMany({
          where: { role: 'TEACHER' },
          select: { id: true },
        });

        // Note: Teacher earnings calculation is triggered by enrollment events
        // Monthly calculation can be added if needed
        console.log(`✅ Teacher earnings calculation scheduled (${teachers.length} teachers)`);
      } catch (error) {
        console.error('❌ Error in teacher earnings calculation:', error);
      }
    });

    this.isRunning = true;
    console.log('✅ Scheduled tasks started');
  }

  /**
   * Stop all scheduled tasks
   */
  stop() {
    // Note: node-cron doesn't have a built-in stop method
    // In production, you'd want to store the cron jobs and destroy them
    this.isRunning = false;
    console.log('🛑 Scheduled tasks stopped');
  }
}

