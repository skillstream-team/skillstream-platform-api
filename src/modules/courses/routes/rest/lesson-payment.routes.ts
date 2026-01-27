import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { LessonPaymentService } from '../../services/lesson-payment.service';
import { z } from 'zod';

const router = Router();
const paymentService = new LessonPaymentService();

/**
 * @swagger
 * /api/modules/{moduleId}/payment:
 *   post:
 *     summary: Create payment for a module
 *     tags: [Module Payments]
 */
const createModulePaymentSchema = z.object({
  amount: z.number().min(0.01),
  currency: z.string().optional().default('USD'),
  provider: z.string(),
  transactionId: z.string().optional(),
});

router.post('/modules/:moduleId/payment',
  requireAuth,
  validate({
    params: z.object({ moduleId: z.string().min(1) }),
    body: createModulePaymentSchema,
  }),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const userId = (req as any).user?.id;

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
    } catch (error) {
      console.error('Error creating module payment:', error);
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to create payment',
      });
    }
  }
);

// Backward compatibility route
router.post('/lessons/:lessonId/payment',
  requireAuth,
  validate({
    params: z.object({ lessonId: z.string().min(1) }),
    body: createModulePaymentSchema,
  }),
  async (req, res) => {
    try {
      const { lessonId } = req.params;
      const userId = (req as any).user?.id;

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
    } catch (error) {
      console.error('Error creating lesson payment:', error);
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to create payment',
      });
    }
  }
);

/**
 * @swagger
 * /api/bookings/{bookingId}/payment:
 *   post:
 *     summary: Create payment for a booking
 *     tags: [Lesson Payments]
 */
router.post('/bookings/:bookingId/payment',
  requireAuth,
  validate({
    params: z.object({ bookingId: z.string().min(1) }),
    body: createLessonPaymentSchema,
  }),
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = (req as any).user?.id;

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
    } catch (error) {
      console.error('Error creating booking payment:', error);
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to create payment',
      });
    }
  }
);

/**
 * @swagger
 * /api/payments/{paymentId}/confirm:
 *   post:
 *     summary: Confirm a payment (mark as completed)
 *     tags: [Lesson Payments]
 */
const confirmPaymentSchema = z.object({
  transactionId: z.string().optional(),
});

router.post('/payments/:paymentId/confirm',
  requireAuth,
  validate({
    params: z.object({ paymentId: z.string().min(1) }),
    body: confirmPaymentSchema.optional(),
  }),
  async (req, res) => {
    try {
      const { paymentId } = req.params;

      const payment = await paymentService.confirmPayment(
        paymentId,
        req.body?.transactionId
      );

      res.json({
        success: true,
        data: payment,
        message: 'Payment confirmed successfully',
      });
    } catch (error) {
      console.error('Error confirming payment:', error);
      const statusCode = (error as Error).message.includes('not found') ? 404 : 400;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to confirm payment',
      });
    }
  }
);

/**
 * @swagger
 * /api/modules/{moduleId}/payment/status:
 *   get:
 *     summary: Get payment status for a module
 *     tags: [Module Payments]
 */
router.get('/modules/:moduleId/payment/status',
  requireAuth,
  validate({
    params: z.object({ moduleId: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { moduleId } = req.params;
      const userId = (req as any).user?.id;

      const status = await paymentService.getPaymentStatus(userId, moduleId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({
        error: (error as Error).message || 'Failed to get payment status',
      });
    }
  }
);

// Backward compatibility route
router.get('/lessons/:lessonId/payment/status',
  requireAuth,
  validate({
    params: z.object({ lessonId: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { lessonId } = req.params;
      const userId = (req as any).user?.id;

      const status = await paymentService.getPaymentStatus(userId, lessonId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({
        error: (error as Error).message || 'Failed to get payment status',
      });
    }
  }
);

/**
 * @swagger
 * /api/bookings/{bookingId}/payment/status:
 *   get:
 *     summary: Get payment status for a booking
 *     tags: [Lesson Payments]
 */
router.get('/bookings/:bookingId/payment/status',
  requireAuth,
  validate({
    params: z.object({ bookingId: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { bookingId } = req.params;
      const userId = (req as any).user?.id;

      const status = await paymentService.getPaymentStatus(userId, undefined, bookingId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({
        error: (error as Error).message || 'Failed to get payment status',
      });
    }
  }
);

export default router;

