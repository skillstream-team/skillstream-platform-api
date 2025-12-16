import { Router } from 'express';
import { ContentVersioningService } from '../../services/content-versioning.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const versioningService = new ContentVersioningService();

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions:
 *   post:
 *     summary: Create a new version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
const createVersionSchema = z.object({
  content: z.any(),
  changeNote: z.string().optional(),
});

router.post('/content/:entityType/:entityId/versions',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
    }),
    body: createVersionSchema,
  }),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;
      const userId = (req as any).user?.id;

      const version = await versioningService.createVersion({
        entityType: entityType as any,
        entityId,
        content: req.body.content,
        createdBy: userId,
        changeNote: req.body.changeNote,
      });

      res.status(201).json({
        success: true,
        data: version,
        message: 'Version created successfully'
      });
    } catch (error) {
      console.error('Error creating version:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create version' });
    }
  }
);

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions:
 *   get:
 *     summary: Get all versions
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions',
  requireAuth,
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
    }),
  }),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      const versions = await versioningService.getVersions(entityType, entityId);

      res.json({
        success: true,
        data: versions
      });
    } catch (error) {
      console.error('Error fetching versions:', error);
      res.status(500).json({ error: 'Failed to fetch versions' });
    }
  }
);

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/current:
 *   get:
 *     summary: Get current version
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions/current',
  requireAuth,
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
    }),
  }),
  async (req, res) => {
    try {
      const { entityType, entityId } = req.params;

      const version = await versioningService.getCurrentVersion(entityType, entityId);

      if (!version) {
        return res.status(404).json({ error: 'No current version found' });
      }

      res.json({
        success: true,
        data: version
      });
    } catch (error) {
      console.error('Error fetching current version:', error);
      res.status(500).json({ error: 'Failed to fetch current version' });
    }
  }
);

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}:
 *   get:
 *     summary: Get version by number
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions/:version',
  requireAuth,
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
      version: z.string().transform(val => parseInt(val)),
    }),
  }),
  async (req, res) => {
    try {
      const { entityType, entityId, version } = req.params;

      const versionNum = typeof version === 'string' ? parseInt(version) : version;
      const versionRecord = await versioningService.getVersionByNumber(
        entityType,
        entityId,
        versionNum
      );

      if (!versionRecord) {
        return res.status(404).json({ error: 'Version not found' });
      }

      res.json({
        success: true,
        data: versionRecord
      });
    } catch (error) {
      console.error('Error fetching version:', error);
      res.status(500).json({ error: 'Failed to fetch version' });
    }
  }
);

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}/restore:
 *   post:
 *     summary: Restore a version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
router.post('/content/:entityType/:entityId/versions/:version/restore',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
      version: z.string().transform(val => parseInt(val)),
    }),
  }),
  async (req, res) => {
    try {
      const { entityType, entityId, version } = req.params;
      const userId = (req as any).user?.id;

      const versionNum = typeof version === 'string' ? parseInt(version) : version;
      const restored = await versioningService.restoreVersion(
        entityType,
        entityId,
        versionNum,
        userId
      );

      res.json({
        success: true,
        data: restored,
        message: 'Version restored successfully'
      });
    } catch (error) {
      console.error('Error restoring version:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to restore version' });
    }
  }
);

/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}:
 *   delete:
 *     summary: Delete a version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
router.delete('/content/:entityType/:entityId/versions/:version',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({
      entityType: z.enum(['course', 'lesson', 'quiz', 'assignment']),
      entityId: z.string().min(1),
      version: z.string().transform(val => parseInt(val)),
    }),
  }),
  async (req, res) => {
    try {
      const { entityType, entityId, version } = req.params;

      const versionNum = typeof version === 'string' ? parseInt(version) : version;
      await versioningService.deleteVersion(entityType, entityId, versionNum);

      res.json({
        success: true,
        message: 'Version deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting version:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete version' });
    }
  }
);

export default router;
