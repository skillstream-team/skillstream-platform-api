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
 * /api/modules/:id/purchase:
 *   post:
 *     summary: Purchase a standalone premium module
 */
router.post('/modules/:id/purchase', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const moduleId = req.params.id;

    // Check module exists and is premium
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        id: true,
        title: true,
        price: true,
        monetizationType: true,
        teacherId: true,
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (module.monetizationType !== 'PREMIUM') {
      return res.status(400).json({ 
        error: 'This module is not available for purchase',
        monetizationType: module.monetizationType,
      });
    }

    // Check if already purchased
    const existingPayment = await prisma.payment.findFirst({
      where: {
        studentId: userId,
        moduleId,
        status: 'COMPLETED',
      },
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'You have already purchased this module' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        studentId: userId,
        moduleId,
        amount: module.price,
        currency: 'USD',
        status: 'PENDING',
        provider: req.body.provider || 'stripe',
        transactionId: req.body.transactionId,
      },
    });

    // If payment is immediately completed (e.g., from webhook), record earnings
    if (req.body.status === 'COMPLETED' || payment.status === 'COMPLETED') {
      if (module.teacherId) {
        try {
          await earningsService.recordModuleSale(moduleId, payment.id);
        } catch (earningsError) {
          console.warn('Failed to record teacher earnings:', earningsError);
        }
      }
    }

    res.status(201).json({
      payment,
      module: {
        id: module.id,
        title: module.title,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Backward compatibility route
router.post('/lessons/:id/purchase', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const lessonId = req.params.id;

    // Check module exists and is premium
    const module = await prisma.module.findUnique({
      where: { id: lessonId },
      select: {
        id: true,
        title: true,
        price: true,
        monetizationType: true,
        teacherId: true,
      },
    });

    if (!module) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (module.monetizationType !== 'PREMIUM') {
      return res.status(400).json({ 
        error: 'This module is not available for purchase',
        monetizationType: module.monetizationType,
      });
    }

    // Check if already purchased
    const existingPayment = await prisma.payment.findFirst({
      where: {
        studentId: userId,
        moduleId: lessonId,
        status: 'COMPLETED',
      },
    });

    if (existingPayment) {
      return res.status(400).json({ error: 'You have already purchased this module' });
    }

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        studentId: userId,
        moduleId: lessonId,
        amount: module.price,
        currency: 'USD',
        status: 'PENDING',
        provider: req.body.provider || 'stripe',
        transactionId: req.body.transactionId,
      },
    });

    // If payment is immediately completed (e.g., from webhook), record earnings
    if (req.body.status === 'COMPLETED' || payment.status === 'COMPLETED') {
      if (module.teacherId) {
        try {
          await earningsService.recordModuleSale(lessonId, payment.id);
        } catch (earningsError) {
          console.warn('Failed to record teacher earnings:', earningsError);
        }
      }
    }

    res.status(201).json({
      payment,
      module: {
        id: module.id,
        title: module.title,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
