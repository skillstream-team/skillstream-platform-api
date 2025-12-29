import { Router } from 'express';
import { CourseImportService } from '../../services/course-import.service';
import { requireAuth } from '../../../../middleware/auth';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const importService = new CourseImportService();

/**
 * @swagger
 * /api/courses/import:
 *   post:
 *     summary: Start a course import job (Admin only)
 *     description: Create a new import job to import a course from external platforms
 *     tags: [Course Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - platform
 *             properties:
 *               platform:
 *                 type: string
 *                 enum: [udemy, coursera, pluralsight, youtube, custom]
 *                 description: Platform to import from
 *               sourceUrl:
 *                 type: string
 *                 description: URL of the course to import (optional)
 *               sourceData:
 *                 type: object
 *                 description: Platform-specific course data
 *                 properties:
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   price:
 *                     type: number
 *                   thumbnailUrl:
 *                     type: string
 *                   categoryId:
 *                     type: string
 *                   difficulty:
 *                     type: string
 *                     enum: [BEGINNER, INTERMEDIATE, ADVANCED, EXPERT]
 *                   duration:
 *                     type: number
 *                   language:
 *                     type: string
 *                   learningObjectives:
 *                     type: array
 *                     items:
 *                       type: string
 *                   requirements:
 *                     type: array
 *                     items:
 *                       type: string
 *                   modules:
 *                     type: array
 *                     description: Course modules/lessons data
 *               instructorId:
 *                 type: string
 *                 description: Optional instructor ID to assign the course to
 *     responses:
 *       201:
 *         description: Import job created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 platform:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *                 progress:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Bad request - validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
const createImportSchema = z.object({
  platform: z.enum(['udemy', 'coursera', 'pluralsight', 'youtube', 'custom']),
  sourceUrl: z.string().url().optional(),
  sourceData: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    price: z.number().optional(),
    thumbnailUrl: z.string().url().optional(),
    categoryId: z.string().optional(),
    difficulty: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT']).optional(),
    duration: z.number().optional(),
    language: z.string().optional(),
    learningObjectives: z.array(z.string()).optional(),
    requirements: z.array(z.string()).optional(),
    modules: z.array(z.any()).optional(),
  }).optional(),
  instructorId: z.string().optional(),
});

router.post('/import',
  requireAuth,
  validate({ body: createImportSchema }),
  async (req, res) => {
    // Check admin role
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
      const userId = (req as any).user.id;
      const importJob = await importService.createImportJob(userId, req.body);

      res.status(201).json({
        success: true,
        data: importJob,
      });
    } catch (error) {
      console.error('Error creating import job:', error);
      res.status(400).json({
        error: (error as Error).message || 'Failed to create import job',
      });
    }
  }
);

/**
 * @swagger
 * /api/courses/import/{id}/status:
 *   get:
 *     summary: Get import job status (Admin only)
 *     description: Get the current status of an import job
 *     tags: [Course Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Import job ID
 *     responses:
 *       200:
 *         description: Import job status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 platform:
 *                   type: string
 *                 status:
 *                   type: string
 *                   enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *                 progress:
 *                   type: number
 *                   minimum: 0
 *                   maximum: 100
 *                 importedCourseId:
 *                   type: string
 *                   description: ID of the imported course (if completed)
 *                 errorMessage:
 *                   type: string
 *                   description: Error message (if failed)
 *                 metadata:
 *                   type: object
 *                 startedAt:
 *                   type: string
 *                   format: date-time
 *                 completedAt:
 *                   type: string
 *                   format: date-time
 *                 cancelledAt:
 *                   type: string
 *                   format: date-time
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       404:
 *         description: Import job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/import/:id/status',
  requireAuth,
  validate({
    params: z.object({
      id: z.string().min(1),
    }),
  }),
  async (req, res) => {
    // Check admin role
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const status = await importService.getImportStatus(id, userId);

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      console.error('Error getting import status:', error);
      const statusCode = (error as Error).message.includes('not found') ? 404 : 500;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to get import status',
      });
    }
  }
);

/**
 * @swagger
 * /api/courses/import:
 *   get:
 *     summary: List import jobs (Admin only)
 *     description: Get a paginated list of import jobs
 *     tags: [Course Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *         description: Filter by status
 *       - in: query
 *         name: platform
 *         schema:
 *           type: string
 *           enum: [udemy, coursera, pluralsight, youtube, custom]
 *         description: Filter by platform
 *     responses:
 *       200:
 *         description: List of import jobs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.get('/import',
  requireAuth,
  async (req, res) => {
    // Check admin role
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }

    try {
      const userId = (req as any).user.id;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const status = req.query.status as string | undefined;
      const platform = req.query.platform as string | undefined;

      const result = await importService.listImports(userId, {
        page,
        limit,
        status,
        platform,
      });

      res.json({
        success: true,
        ...result,
      });
    } catch (error) {
      console.error('Error listing imports:', error);
      res.status(500).json({
        error: (error as Error).message || 'Failed to list import jobs',
      });
    }
  }
);

/**
 * @swagger
 * /api/courses/import/{id}/cancel:
 *   post:
 *     summary: Cancel an import job (Admin only)
 *     description: Cancel a pending or processing import job
 *     tags: [Course Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Import job ID
 *     responses:
 *       200:
 *         description: Import job cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Updated import job status
 *       400:
 *         description: Bad request - cannot cancel completed job
 *       404:
 *         description: Import job not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Admin role required
 */
router.post('/import/:id/cancel',
  requireAuth,
  validate({
    params: z.object({
      id: z.string().min(1),
    }),
  }),
  async (req, res) => {
    // Check admin role
    if ((req as any).user?.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
      const userId = (req as any).user.id;
      const { id } = req.params;

      const cancelled = await importService.cancelImport(id, userId);

      res.json({
        success: true,
        data: cancelled,
        message: 'Import job cancelled successfully',
      });
    } catch (error) {
      console.error('Error cancelling import:', error);
      const statusCode = (error as Error).message.includes('not found')
        ? 404
        : (error as Error).message.includes('Cannot cancel')
        ? 400
        : 500;
      res.status(statusCode).json({
        error: (error as Error).message || 'Failed to cancel import job',
      });
    }
  }
);

export default router;

