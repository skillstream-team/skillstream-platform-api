import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { MonetizationService } from '../../services/monetization.service';

const router = Router();
const monetizationService = new MonetizationService();

/**
 * @swagger
 * /api/collections/:id/monetization:
 *   get:
 *     summary: Get collection monetization requirements
 */
router.get('/collections/:id/monetization', requireAuth, async (req, res) => {
  try {
    const requirements = await monetizationService.getAccessRequirements(
      req.params.id,
      'PROGRAM'
    );
    res.json(requirements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/lessons/:id/monetization:
 *   get:
 *     summary: Get lesson monetization requirements
 */
router.get('/lessons/:id/monetization', requireAuth, async (req, res) => {
  try {
    const requirements = await monetizationService.getAccessRequirements(
      req.params.id,
      'MODULE'
    );
    res.json(requirements);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/collections/:id/monetization:
 *   put:
 *     summary: Update collection monetization type (teacher/admin)
 */
router.put('/collections/:id/monetization', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { monetizationType, subscriptionTier } = req.body;
    const { prisma } = await import('../../../../utils/prisma');

    if (!['FREE', 'SUBSCRIPTION', 'PREMIUM'].includes(monetizationType)) {
      return res.status(400).json({ error: 'Invalid monetization type' });
    }

    const program = await prisma.program.update({
      where: { id: req.params.id },
      data: {
        monetizationType,
        subscriptionTier: subscriptionTier || null,
      },
    });

    res.json(program);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/lessons/:id/monetization:
 *   put:
 *     summary: Update lesson monetization type (teacher/admin)
 */
router.put('/lessons/:id/monetization', requireAuth, requireRole('TEACHER'), async (req, res) => {
  try {
    const { monetizationType } = req.body;
    const { prisma } = await import('../../../../utils/prisma');

    if (!['FREE', 'SUBSCRIPTION', 'PREMIUM'].includes(monetizationType)) {
      return res.status(400).json({ error: 'Invalid monetization type' });
    }

    const module = await prisma.module.update({
      where: { id: req.params.id },
      data: { monetizationType },
    });

    res.json(module);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/content/:type/:id/access:
 *   get:
 *     summary: Check if current user can access content
 */
router.get('/content/:type/:id/access', requireAuth, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const { type, id } = req.params;

    if (!['PROGRAM', 'MODULE'].includes(type)) {
      return res.status(400).json({ error: 'Invalid content type' });
    }

    const canAccess = await monetizationService.canAccess(
      userId,
      id,
      type as 'PROGRAM' | 'MODULE'
    );

    res.json({ canAccess });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
