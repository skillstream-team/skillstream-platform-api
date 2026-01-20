"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LessonPaymentService = void 0;
const prisma_1 = require("../../../utils/prisma");
const email_service_1 = require("../../users/services/email.service");
const PAYMENT_DEADLINE_HOURS = 24; // Payment required 24 hours before lesson
class LessonPaymentService {
    /**
     * Calculate payment deadline (24 hours before lesson)
     */
    calculatePaymentDeadline(scheduledAt) {
        const deadline = new Date(scheduledAt);
        deadline.setHours(deadline.getHours() - PAYMENT_DEADLINE_HOURS);
        return deadline;
    }
    /**
     * Check if payment is required for a lesson
     */
    async isPaymentRequired(lessonId, studentId) {
        const lesson = await prisma_1.prisma.quickLesson.findUnique({
            where: { id: lessonId },
        });
        if (!lesson) {
            return false;
        }
        // Check if student is invited
        if (!lesson.invitedStudentIds.includes(studentId)) {
            return false;
        }
        // Check if lesson has a price
        if (!lesson.price || lesson.price <= 0) {
            return false;
        }
        // Check if payment already exists
        const existingPayment = await prisma_1.prisma.payment.findFirst({
            where: {
                lessonId,
                studentId,
                status: 'COMPLETED',
            },
        });
        return !existingPayment;
    }
    /**
     * Check if payment is required for a booking
     */
    async isPaymentRequiredForBooking(bookingId) {
        const booking = await prisma_1.prisma.booking.findUnique({
            where: { id: bookingId },
            include: { slot: true },
        });
        if (!booking || !booking.price || booking.price <= 0) {
            return false;
        }
        // Check if payment already exists
        const existingPayment = await prisma_1.prisma.payment.findFirst({
            where: {
                bookingId,
                studentId: booking.studentId,
                status: 'COMPLETED',
            },
        });
        return !existingPayment;
    }
    /**
     * Create payment for a lesson
     */
    async createLessonPayment(data) {
        if (!data.lessonId && !data.bookingId) {
            throw new Error('Either lessonId or bookingId is required');
        }
        let scheduledAt;
        let price;
        if (data.lessonId) {
            const lesson = await prisma_1.prisma.quickLesson.findUnique({
                where: { id: data.lessonId },
            });
            if (!lesson) {
                throw new Error('Lesson not found');
            }
            // Check if student is invited (by ID)
            if (!lesson.invitedStudentIds.includes(data.studentId)) {
                throw new Error('Student is not invited to this lesson');
            }
            scheduledAt = lesson.scheduledAt;
            price = lesson.price || 0;
            if (price <= 0) {
                throw new Error('Lesson has no price set');
            }
            // Check if payment already exists
            const existingPayment = await prisma_1.prisma.payment.findFirst({
                where: {
                    lessonId: data.lessonId,
                    studentId: data.studentId,
                    status: 'COMPLETED',
                },
            });
            if (existingPayment) {
                throw new Error('Payment already completed for this lesson');
            }
        }
        else if (data.bookingId) {
            const booking = await prisma_1.prisma.booking.findUnique({
                where: { id: data.bookingId },
                include: { slot: true },
            });
            if (!booking) {
                throw new Error('Booking not found');
            }
            if (booking.studentId !== data.studentId) {
                throw new Error('Unauthorized: This booking belongs to another student');
            }
            scheduledAt = booking.slot.startTime;
            price = booking.price || 0;
            if (price <= 0) {
                throw new Error('Booking has no price set');
            }
            // Check if payment already exists
            const existingPayment = await prisma_1.prisma.payment.findFirst({
                where: {
                    bookingId: data.bookingId,
                    studentId: data.studentId,
                    status: 'COMPLETED',
                },
            });
            if (existingPayment) {
                throw new Error('Payment already completed for this booking');
            }
        }
        else {
            throw new Error('Invalid payment data');
        }
        // Validate payment deadline (must be at least 24 hours before lesson)
        const now = new Date();
        const deadline = this.calculatePaymentDeadline(scheduledAt);
        if (now >= deadline) {
            throw new Error(`Payment deadline has passed. Payment must be completed at least ${PAYMENT_DEADLINE_HOURS} hours before the lesson.`);
        }
        // Validate amount matches lesson/booking price
        if (Math.abs(data.amount - price) > 0.01) {
            throw new Error(`Payment amount (${data.amount}) does not match lesson price (${price})`);
        }
        // Create payment
        const payment = await prisma_1.prisma.payment.create({
            data: {
                studentId: data.studentId,
                lessonId: data.lessonId,
                bookingId: data.bookingId,
                amount: data.amount,
                currency: data.currency || 'USD',
                status: 'PENDING',
                provider: data.provider,
                transactionId: data.transactionId,
                dueAt: deadline,
            },
            include: {
                student: {
                    select: { id: true, username: true, email: true },
                },
            },
        });
        return this.mapToDto(payment);
    }
    /**
     * Confirm payment (mark as completed)
     */
    async confirmPayment(paymentId, transactionId) {
        const payment = await prisma_1.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                lesson: true,
                booking: {
                    include: { slot: true },
                },
                student: {
                    select: { id: true, username: true, email: true },
                },
            },
        });
        if (!payment) {
            throw new Error('Payment not found');
        }
        if (payment.status === 'COMPLETED') {
            throw new Error('Payment already completed');
        }
        // Update payment status
        const updated = await prisma_1.prisma.$transaction(async (tx) => {
            const updatedPayment = await tx.payment.update({
                where: { id: paymentId },
                data: {
                    status: 'COMPLETED',
                    paidAt: new Date(),
                    transactionId: transactionId || payment.transactionId,
                },
            });
            // Update booking status if applicable
            if (payment.bookingId) {
                await tx.booking.update({
                    where: { id: payment.bookingId },
                    data: {
                        status: 'confirmed',
                    },
                });
            }
            return updatedPayment;
        });
        // Record teacher earnings for lesson/booking payments
        try {
            if (payment.lessonId && payment.lesson) {
                // Check if it's a standalone Lesson (not QuickLesson)
                const standaloneLesson = await prisma_1.prisma.lesson.findUnique({
                    where: { id: payment.lessonId },
                    select: { teacherId: true, monetizationType: true },
                });
                if (standaloneLesson && standaloneLesson.monetizationType === 'PREMIUM' && standaloneLesson.teacherId) {
                    const { TeacherEarningsService } = await Promise.resolve().then(() => __importStar(require('../../earnings/services/teacher-earnings.service')));
                    const earningsService = new TeacherEarningsService();
                    await earningsService.recordLessonSale(payment.lessonId, paymentId);
                }
            }
        }
        catch (earningsError) {
            console.warn('Failed to record teacher earnings for lesson payment:', earningsError);
            // Don't throw - payment is already confirmed
        }
        // Send confirmation email
        try {
            if (payment.lessonId && payment.lesson) {
                await email_service_1.emailService.sendEmail(payment.student.email, 'Lesson Payment Confirmed', `
            <h2>Payment Confirmed</h2>
            <p>Your payment of $${payment.amount} for the lesson "${payment.lesson.title}" has been confirmed.</p>
            <p>Lesson scheduled for: ${payment.lesson.scheduledAt.toLocaleString()}</p>
            <p>We'll see you there!</p>
          `);
            }
            else if (payment.bookingId && payment.booking) {
                await email_service_1.emailService.sendEmail(payment.student.email, 'Booking Payment Confirmed', `
            <h2>Payment Confirmed</h2>
            <p>Your payment of $${payment.amount} for your booking has been confirmed.</p>
            <p>Lesson scheduled for: ${payment.booking.slot.startTime.toLocaleString()}</p>
            <p>We'll see you there!</p>
          `);
            }
        }
        catch (error) {
            console.error('Error sending payment confirmation email:', error);
            // Don't throw - payment is already confirmed
        }
        return this.mapToDto(updated);
    }
    /**
     * Get payment status for a lesson/booking
     */
    async getPaymentStatus(studentId, lessonId, bookingId) {
        if (!lessonId && !bookingId) {
            throw new Error('Either lessonId or bookingId is required');
        }
        let scheduledAt;
        let price;
        if (lessonId) {
            const lesson = await prisma_1.prisma.quickLesson.findUnique({
                where: { id: lessonId },
            });
            if (!lesson) {
                return { required: false, paid: false, isOverdue: false };
            }
            scheduledAt = lesson.scheduledAt;
            price = lesson.price || 0;
            if (!lesson.invitedStudentIds.includes(studentId)) {
                return { required: false, paid: false, isOverdue: false };
            }
        }
        else if (bookingId) {
            const booking = await prisma_1.prisma.booking.findUnique({
                where: { id: bookingId },
                include: { slot: true },
            });
            if (!booking) {
                return { required: false, paid: false, isOverdue: false };
            }
            scheduledAt = booking.slot.startTime;
            price = booking.price || 0;
        }
        else {
            return { required: false, paid: false, isOverdue: false };
        }
        const required = price > 0;
        const deadline = required ? this.calculatePaymentDeadline(scheduledAt) : undefined;
        const now = new Date();
        const isOverdue = deadline ? now >= deadline : false;
        // Check for existing payment
        const payment = await prisma_1.prisma.payment.findFirst({
            where: {
                lessonId: lessonId || undefined,
                bookingId: bookingId || undefined,
                studentId,
                status: 'COMPLETED',
            },
        });
        return {
            required,
            paid: !!payment,
            payment: payment ? this.mapToDto(payment) : undefined,
            deadline,
            isOverdue,
        };
    }
    /**
     * Check and cancel unpaid lessons (should be called by scheduled job)
     */
    async checkAndCancelUnpaidLessons() {
        const now = new Date();
        const deadlineThreshold = new Date(now.getTime() + PAYMENT_DEADLINE_HOURS * 60 * 60 * 1000);
        // Find lessons with payment deadline passed but no payment
        const unpaidLessons = await prisma_1.prisma.quickLesson.findMany({
            where: {
                status: 'scheduled',
                scheduledAt: {
                    gte: now, // Only future lessons
                },
                price: {
                    gt: 0, // Has a price
                },
            },
            include: {
                payments: {
                    where: {
                        status: 'COMPLETED',
                    },
                },
            },
        });
        let cancelledCount = 0;
        for (const lesson of unpaidLessons) {
            const deadline = this.calculatePaymentDeadline(lesson.scheduledAt);
            // Check if deadline has passed
            if (now >= deadline) {
                // Check each invited student
                for (const studentId of lesson.invitedStudentIds) {
                    const hasPayment = lesson.payments.some((p) => p.studentId === studentId && p.status === 'COMPLETED');
                    if (!hasPayment) {
                        // Cancel this student's participation
                        // You might want to send a cancellation email here
                        try {
                            const student = await prisma_1.prisma.user.findUnique({
                                where: { id: studentId },
                                select: { email: true, username: true },
                            });
                            if (student) {
                                await email_service_1.emailService.sendEmail(student.email, 'Lesson Cancelled - Payment Not Received', `
                    <h2>Lesson Cancelled</h2>
                    <p>Your lesson "${lesson.title}" scheduled for ${lesson.scheduledAt.toLocaleString()} has been cancelled due to non-payment.</p>
                    <p>Payment was required at least 24 hours before the lesson time.</p>
                    <p>If you have any questions, please contact support.</p>
                  `);
                            }
                        }
                        catch (error) {
                            console.error(`Error sending cancellation email to ${studentId}:`, error);
                        }
                    }
                }
                // If no students have paid, cancel the entire lesson
                if (lesson.payments.length === 0) {
                    await prisma_1.prisma.quickLesson.update({
                        where: { id: lesson.id },
                        data: { status: 'cancelled' },
                    });
                    cancelledCount++;
                }
            }
        }
        // Check bookings with unpaid status
        const unpaidBookings = await prisma_1.prisma.booking.findMany({
            where: {
                status: 'pending_payment',
                paymentDueAt: {
                    lte: now,
                },
            },
            include: {
                slot: true,
            },
        });
        for (const booking of unpaidBookings) {
            await prisma_1.prisma.booking.update({
                where: { id: booking.id },
                data: {
                    status: 'payment_failed',
                    cancelledAt: new Date(),
                },
            });
            // Make slot available again
            await prisma_1.prisma.lessonSlot.update({
                where: { id: booking.slotId },
                data: {
                    isBooked: false,
                    isAvailable: true,
                },
            });
            // Send cancellation email
            try {
                const student = await prisma_1.prisma.user.findUnique({
                    where: { id: booking.studentId },
                    select: { email: true, username: true },
                });
                if (student) {
                    await email_service_1.emailService.sendEmail(student.email, 'Booking Cancelled - Payment Not Received', `
              <h2>Booking Cancelled</h2>
              <p>Your booking scheduled for ${booking.slot.startTime.toLocaleString()} has been cancelled due to non-payment.</p>
              <p>Payment was required at least 24 hours before the lesson time.</p>
              <p>If you have any questions, please contact support.</p>
            `);
                }
            }
            catch (error) {
                console.error(`Error sending cancellation email for booking ${booking.id}:`, error);
            }
            cancelledCount++;
        }
        return cancelledCount;
    }
    /**
     * Map Prisma payment to DTO
     */
    mapToDto(payment) {
        return {
            id: payment.id,
            lessonId: payment.lessonId || undefined,
            bookingId: payment.bookingId || undefined,
            studentId: payment.studentId,
            amount: payment.amount,
            currency: payment.currency,
            status: payment.status,
            dueAt: payment.dueAt || undefined,
            paidAt: payment.paidAt || undefined,
            createdAt: payment.createdAt,
        };
    }
}
exports.LessonPaymentService = LessonPaymentService;
