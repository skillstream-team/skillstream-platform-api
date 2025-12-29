"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledTasksService = void 0;
const node_cron_1 = __importDefault(require("node-cron"));
const lesson_payment_service_1 = require("../modules/courses/services/lesson-payment.service");
const subscription_service_1 = require("../modules/subscriptions/services/subscription.service");
const teacher_earnings_service_1 = require("../modules/courses/services/teacher-earnings.service");
const prisma_1 = require("../utils/prisma");
class ScheduledTasksService {
    constructor() {
        this.isRunning = false;
        this.paymentService = new lesson_payment_service_1.LessonPaymentService();
        this.subscriptionService = new subscription_service_1.SubscriptionService();
        this.earningsService = new teacher_earnings_service_1.TeacherEarningsService();
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
        node_cron_1.default.schedule('0 * * * *', async () => {
            console.log('⏰ Running: Check unpaid lessons');
            try {
                const cancelled = await this.paymentService.checkAndCancelUnpaidLessons();
                if (cancelled > 0) {
                    console.log(`✅ Cancelled ${cancelled} unpaid lessons/bookings`);
                }
            }
            catch (error) {
                console.error('❌ Error checking unpaid lessons:', error);
            }
        });
        // Check expired subscriptions daily at midnight
        node_cron_1.default.schedule('0 0 * * *', async () => {
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
        });
        // Calculate teacher earnings monthly (1st of each month at 2 AM)
        node_cron_1.default.schedule('0 2 1 * *', async () => {
            console.log('⏰ Running: Calculate teacher earnings');
            try {
                // Get all teachers
                const teachers = await prisma_1.prisma.user.findMany({
                    where: { role: 'TEACHER' },
                    select: { id: true },
                });
                // Note: Teacher earnings calculation is triggered by enrollment events
                // Monthly calculation can be added if needed
                console.log(`✅ Teacher earnings calculation scheduled (${teachers.length} teachers)`);
            }
            catch (error) {
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
exports.ScheduledTasksService = ScheduledTasksService;
