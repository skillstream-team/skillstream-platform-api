import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';
import { MonetizationService } from '../../services/monetization.service';
import { TeacherEarningsService } from '../../../earnings/services/teacher-earnings.service';

const router = Router();
const monetizationService = new MonetizationService();
const earningsService = new TeacherEarningsService();

/**
 * @swagger
 * /api/lessons/:id/purchase:
 *   post:
 *     summary: Purchase a standalone premium lesson
 */
router.post('/lessons/:id/purchase', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const lessonId = req.params.id;

    // Check lesson exists and is premium
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        price: true,
        monetizationType: true,
        teacherId: true,
      },
    });

    if (!lesson) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    if (lesson.monetizationType !== 'PREMIUM') {
      return res.status(400).json({ 
        error: 'This lesson is not available for purchase',
        monetizationType: lesson.monetizationType,
      });
    }

    // Check if already purchased
    const existingPayment = await prisma.payment.findFirst({
      where: {
        studentId: userId,
        lessonId,
        status: 'COMPLETED',
      },
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'You have already purchased this lesson' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        studentId: userId,
        lessonId,
        amount: lesson.price,
        currency: 'USD',
        status: 'PENDING',
        provider: req.body.provider || 'stripe',
        transactionId: req.body.transactionId,
      },
    });

    // If payment is immediately completed (e.g., from webhook), record earnings
    if (req.body.status === 'COMPLETED' || payment.status === 'COMPLETED') {
      if (lesson.teacherId) {
        try {
          await earningsService.recordLessonSale(lessonId, payment.id);
        } catch (earningsError) {
          console.warn('Failed to record teacher earnings:', earningsError);
        }
      }
    }

    res.status(201).json({
      payment,
      lesson: {
        id: lesson.id,
        title: lesson.title,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
