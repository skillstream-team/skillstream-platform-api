import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { prisma } from '../../../../utils/prisma';
import { certificateService } from '../../services/certificate.service';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();

/**
 * @swagger
 * /api/programs/{programId}/certificates/{userId}:
 *   get:
 *     summary: Get certificate metadata
 *     tags: [Certificates]
 */
router.get('/programs/:programId/certificates/:userId', requireAuth, async (req, res) => {
  try {
    const programId = req.params.programId;
    const userId = req.params.userId;
    const certificate = await prisma.certificate.findFirst({
      where: {
        studentId: userId,
        programId
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        },
        program: {
          select: { id: true, title: true, description: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json({
      success: true,
      data: certificate
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: 'Failed to fetch certificate' });
  }
});

/**
 * @swagger
 * /api/programs/{programId}/certificates/{userId}/download:
 *   get:
 *     summary: Download certificate as PDF
 *     tags: [Certificates]
 */
router.get('/programs/:programId/certificates/:userId/download', requireAuth, async (req, res) => {
  try {
    const programId = req.params.programId;
    const userId = req.params.userId;

    const certificate = await prisma.certificate.findFirst({
      where: {
        studentId: userId,
        programId
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        },
        program: {
          select: { id: true, title: true, description: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    try {
      const certWithRelations = certificate as any;
      const pdfStream = await certificateService.generatePDFStream({
        id: certWithRelations.id,
        student: {
          username: certWithRelations.student?.username || 'Student',
          email: certWithRelations.student?.email || ''
        },
        course: {
          title: certWithRelations.program?.title || '',
          description: certWithRelations.program?.description || undefined
        },
        issuedAt: certWithRelations.issuedAt || new Date(),
        certificateNumber: certWithRelations.id.substring(0, 8).toUpperCase()
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${(certWithRelations.program?.title || 'certificate').replace(/[^a-z0-9]/gi, '_')}-${certWithRelations.id.substring(0, 8)}.pdf"`
      );

      pdfStream.pipe(res);
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ error: 'Failed to generate PDF certificate' });
    }
  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ error: 'Failed to download certificate' });
  }
});

/**
 * @swagger
 * /api/programs/{programId}/certificates/{userId}/check-completion:
 *   get:
 *     summary: Check program completion status
 *     tags: [Certificates]
 */
router.get('/programs/:programId/certificates/:userId/check-completion', requireAuth, async (req, res) => {
  try {
    const programId = req.params.programId;
    const userId = req.params.userId;
    const currentUserId = (req as any).user?.id;

    if (userId !== currentUserId && (req as any).user?.role !== 'Teacher' && (req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const completion = await certificateService.checkCourseCompletion(userId, programId);
    res.json({ success: true, data: completion });
  } catch (error) {
    console.error('Error checking completion:', error);
    res.status(500).json({ error: 'Failed to check completion status' });
  }
});

const issueCertificateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
});

/**
 * @swagger
 * /api/programs/{programId}/certificates/{userId}/issue:
 *   post:
 *     summary: Manually issue certificate (Teacher/Admin only)
 *     tags: [Certificates]
 */
router.post('/programs/:programId/certificates/:userId/issue',
  requireAuth,
  requireRole('Teacher'),
  validate({ params: z.object({ programId: z.string().min(1), userId: z.string().min(1) }), body: issueCertificateSchema }),
  async (req, res) => {
    try {
      const programId = req.params.programId;
      const userId = req.params.userId;
      const certificate = await certificateService.issueCertificate(
        userId,
        programId,
        req.body?.title,
        req.body?.description
      );
      res.status(201).json({ success: true, data: certificate, message: 'Certificate issued successfully' });
    } catch (error) {
      console.error('Error issuing certificate:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to issue certificate' });
    }
  }
);

/**
 * @swagger
 * /api/programs/{programId}/certificates/{userId}/auto-issue:
 *   post:
 *     summary: Attempt to auto-issue certificate if program is completed
 *     tags: [Certificates]
 */
router.post('/programs/:programId/certificates/:userId/auto-issue', requireAuth, async (req, res) => {
  try {
    const programId = req.params.programId;
    const userId = req.params.userId;
    const currentUserId = (req as any).user?.id;

    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await certificateService.autoIssueCertificate(userId, programId);

    if (result.issued) {
      res.status(201).json({ success: true, data: result.certificate, message: result.message });
    } else {
      res.status(200).json({ success: false, message: result.message, data: null });
    }
  } catch (error) {
    console.error('Error auto-issuing certificate:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to auto-issue certificate' });
  }
});

export default router;
