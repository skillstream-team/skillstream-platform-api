"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const lesson_payment_service_1 = require("../../services/lesson-payment.service");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const paymentService = new lesson_payment_service_1.LessonPaymentService();
/**
 * @swagger
 * /api/modules/{moduleId}/payment:
 *   post:
 *     summary: Create payment for a module
 *     tags: [Module Payments]
 */
const createModulePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().min(0.01),
    currency: zod_1.z.string().optional().default('USD'),
    provider: zod_1.z.string(),
    transactionId: zod_1.z.string().optional(),
});
router.post('/modules/:moduleId/payment', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ moduleId: zod_1.z.string().min(1) }),
    body: createModulePaymentSchema,
}), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user?.id;
        const payment = await paymentService.createModulePayment({
            moduleId,
            studentId: userId,
            amount: req.body.amount,
            currency: req.body.currency,
            provider: req.body.provider,
            transactionId: req.body.transactionId,
        });
        res.status(201).json({
            success: true,
            data: payment,
            message: 'Payment created. Please complete the payment to confirm your attendance.',
        });
    }
    catch (error) {
        console.error('Error creating module payment:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to create payment',
        });
    }
});
// Backward compatibility route
router.post('/lessons/:lessonId/payment', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ lessonId: zod_1.z.string().min(1) }),
    body: createModulePaymentSchema,
}), async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user?.id;
        const payment = await paymentService.createModulePayment({
            moduleId: lessonId,
            studentId: userId,
            amount: req.body.amount,
            currency: req.body.currency,
            provider: req.body.provider,
            transactionId: req.body.transactionId,
        });
        res.status(201).json({
            success: true,
            data: payment,
            message: 'Payment created. Please complete the payment to confirm your attendance.',
        });
    }
    catch (error) {
        console.error('Error creating lesson payment:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to create payment',
        });
    }
});
/**
 * @swagger
 * /api/bookings/{bookingId}/payment:
 *   post:
 *     summary: Create payment for a booking
 *     tags: [Lesson Payments]
 */
router.post('/bookings/:bookingId/payment', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ bookingId: zod_1.z.string().min(1) }),
    body: createModulePaymentSchema,
}), async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const payment = await paymentService.createLessonPayment({
            bookingId,
            studentId: userId,
            amount: req.body.amount,
            currency: req.body.currency,
            provider: req.body.provider,
            transactionId: req.body.transactionId,
        });
        res.status(201).json({
            success: true,
            data: payment,
            message: 'Payment created. Please complete the payment to confirm your booking.',
        });
    }
    catch (error) {
        console.error('Error creating booking payment:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to create payment',
        });
    }
});
/**
 * @swagger
 * /api/payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm a payment (mark as completed)
 *     tags: [Lesson Payments]
 */
const confirmPaymentSchema = zod_1.z.object({
    transactionId: zod_1.z.string().optional(),
});
router.post('/payments/:paymentId/confirm', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ paymentId: zod_1.z.string().min(1) }),
    body: confirmPaymentSchema.optional(),
}), async (req, res) => {
    try {
        const { paymentId } = req.params;
        const payment = await paymentService.confirmPayment(paymentId, req.body?.transactionId);
        res.json({
            success: true,
            data: payment,
            message: 'Payment confirmed successfully',
        });
    }
    catch (error) {
        console.error('Error confirming payment:', error);
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to confirm payment',
        });
    }
});
/**
 * @swagger
 * /api/modules/{moduleId}/payment/status:
 *   get:
 *     summary: Get payment status for a module
 *     tags: [Module Payments]
 */
router.get('/modules/:moduleId/payment/status', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ moduleId: zod_1.z.string().min(1) }),
}), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user?.id;
        const status = await paymentService.getPaymentStatus(userId, moduleId);
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            error: error.message || 'Failed to get payment status',
        });
    }
});
// Backward compatibility route
router.get('/lessons/:lessonId/payment/status', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ lessonId: zod_1.z.string().min(1) }),
}), async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user?.id;
        const status = await paymentService.getPaymentStatus(userId, lessonId);
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            error: error.message || 'Failed to get payment status',
        });
    }
});
/**
 * @swagger
 * /api/bookings/{bookingId}/payment/status:
 *   get:
 *     summary: Get payment status for a booking
 *     tags: [Lesson Payments]
 */
router.get('/bookings/:bookingId/payment/status', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ bookingId: zod_1.z.string().min(1) }),
}), async (req, res) => {
    try {
        const { bookingId } = req.params;
        const userId = req.user?.id;
        const status = await paymentService.getPaymentStatus(userId, undefined, bookingId);
        res.json({
            success: true,
            data: status,
        });
    }
    catch (error) {
        console.error('Error getting payment status:', error);
        res.status(500).json({
            error: error.message || 'Failed to get payment status',
        });
    }
});
exports.default = router;
