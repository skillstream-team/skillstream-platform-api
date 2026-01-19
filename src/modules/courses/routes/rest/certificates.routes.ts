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
 * /api/collections/{collectionId}/certificates/{userId}:
 *   get:
 *     summary: Get certificate metadata
 *     tags: [Certificates]
 */
router.get('/collections/:collectionId/certificates/:userId', requireAuth, async (req, res) => {
  try {
    const { collectionId, userId } = req.params;

    const certificate = await prisma.certificate.findFirst({
      where: {
        studentId: userId,
        collectionId: collectionId
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        },
        collection: {
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
 * /api/collections/{collectionId}/certificates/{userId}/download:
 *   get:
 *     summary: Download certificate as PDF
 *     tags: [Certificates]
 */
router.get('/collections/:collectionId/certificates/:userId/download', requireAuth, async (req, res) => {
  try {
    const { collectionId, userId } = req.params;

    const certificate = await prisma.certificate.findFirst({
      where: {
        studentId: userId,
        collectionId: collectionId
      },
      include: {
        student: {
          select: { id: true, username: true, email: true }
        },
        collection: {
          select: { id: true, title: true, description: true }
        }
      }
    });

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    // Generate PDF certificate
    try {
      const pdfStream = await certificateService.generatePDFStream({
        id: certificate.id,
        student: {
          username: certificate.student.username || 'Student',
          email: certificate.student.email || ''
        },
        course: {
          title: certificate.collection.title,
          description: certificate.collection.description || undefined
        },
        issuedAt: certificate.issuedAt || new Date(),
        certificateNumber: certificate.id.substring(0, 8).toUpperCase()
      });

      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="certificate-${certificate.collection.title.replace(/[^a-z0-9]/gi, '_')}-${certificate.id.substring(0, 8)}.pdf"`
      );

      // Pipe PDF to response
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
 * /api/collections/{collectionId}/certificates/{userId}/check-completion:
 *   get:
 *     summary: Check collection completion status
 *     tags: [Certificates]
 */
router.get('/collections/:collectionId/certificates/:userId/check-completion', requireAuth, async (req, res) => {
  try {
    const { collectionId, userId } = req.params;
    const currentUserId = (req as any).user?.id;

    // Users can only check their own completion, or teachers/admins can check any
    if (userId !== currentUserId && (req as any).user?.role !== 'Teacher' && (req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const completion = await certificateService.checkCourseCompletion(userId, collectionId);
    
    res.json({
      success: true,
      data: completion
    });
  } catch (error) {
    console.error('Error checking completion:', error);
    res.status(500).json({ error: 'Failed to check completion status' });
  }
});

/**
 * @swagger
 * /api/collections/{collectionId}/certificates/{userId}/issue:
 *   post:
 *     summary: Manually issue certificate (Teacher/Admin only)
 *     tags: [Certificates]
 */
const issueCertificateSchema = z.object({
  title: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
});

router.post('/collections/:collectionId/certificates/:userId/issue',
  requireAuth,
  requireRole('Teacher'),
  validate({ 
    params: z.object({ 
      collectionId: z.string().min(1),
      userId: z.string().min(1)
    }),
    body: issueCertificateSchema
  }),
  async (req, res) => {
    try {
      const { collectionId, userId } = req.params;
      const certificate = await certificateService.issueCertificate(
        userId,
        collectionId,
        req.body.title,
        req.body.description
      );
      
      res.status(201).json({
        success: true,
        data: certificate,
        message: 'Certificate issued successfully'
      });
    } catch (error) {
      console.error('Error issuing certificate:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to issue certificate' });
    }
  }
);

/**
 * @swagger
 * /api/collections/{collectionId}/certificates/{userId}/auto-issue:
 *   post:
 *     summary: Attempt to auto-issue certificate if collection is completed
 *     tags: [Certificates]
 */
router.post('/collections/:collectionId/certificates/:userId/auto-issue', requireAuth, async (req, res) => {
  try {
    const { collectionId, userId } = req.params;
    const currentUserId = (req as any).user?.id;

    // Users can only auto-issue for themselves
    if (userId !== currentUserId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const result = await certificateService.autoIssueCertificate(userId, collectionId);
    
    if (result.issued) {
      res.status(201).json({
        success: true,
        data: result.certificate,
        message: result.message
      });
    } else {
      res.status(200).json({
        success: false,
        message: result.message,
        data: null
      });
    }
  } catch (error) {
    console.error('Error auto-issuing certificate:', error);
    res.status(500).json({ error: (error as Error).message || 'Failed to auto-issue certificate' });
  }
});

export default router;

