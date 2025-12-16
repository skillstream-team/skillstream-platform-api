import { Router } from 'express';
import { BulkOperationsService } from '../../services/bulk-operations.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const bulkService = new BulkOperationsService();

/**
 * @swagger
 * /api/bulk/users/import:
 *   post:
 *     summary: Bulk import users (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkUserImportSchema = z.object({
  users: z.array(z.object({
    email: z.string().email(),
    username: z.string().min(1),
    password: z.string().optional(),
    role: z.string(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
  })).min(1),
});

router.post('/bulk/users/import',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: bulkUserImportSchema }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkImportUsers(req.body);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk importing users:', error);
      res.status(500).json({ error: 'Failed to bulk import users' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/users/export:
 *   get:
 *     summary: Bulk export users as CSV (Admin only)
 *     tags: [Bulk Operations]
 */
router.get('/bulk/users/export',
  requireAuth,
  requireRole('ADMIN'),
  async (req, res) => {
    try {
      const role = req.query.role as string | undefined;
      const csv = await bulkService.bulkExportUsers(role);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error bulk exporting users:', error);
      res.status(500).json({ error: 'Failed to bulk export users' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/courses/import:
 *   post:
 *     summary: Bulk import courses (Admin/Teacher only)
 *     tags: [Bulk Operations]
 */
const bulkCourseImportSchema = z.object({
  courses: z.array(z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    price: z.number(),
    instructorId: z.string(),
    order: z.number(),
  })).min(1),
});

router.post('/bulk/courses/import',
  requireAuth,
  requireRole('TEACHER'),
  validate({ body: bulkCourseImportSchema }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkImportCourses(req.body);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk importing courses:', error);
      res.status(500).json({ error: 'Failed to bulk import courses' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/courses/export:
 *   get:
 *     summary: Bulk export courses as CSV
 *     tags: [Bulk Operations]
 */
router.get('/bulk/courses/export',
  requireAuth,
  async (req, res) => {
    try {
      const csv = await bulkService.bulkExportCourses();
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=courses-export-${Date.now()}.csv`);
      res.send(csv);
    } catch (error) {
      console.error('Error bulk exporting courses:', error);
      res.status(500).json({ error: 'Failed to bulk export courses' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/enrollments:
 *   post:
 *     summary: Bulk enroll students (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkEnrollmentSchema = z.object({
  enrollments: z.array(z.object({
    courseId: z.string(),
    studentId: z.string(),
    amount: z.number(),
    currency: z.string().optional(),
    provider: z.string(),
  })).min(1),
});

router.post('/bulk/enrollments',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: bulkEnrollmentSchema }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkEnrollStudents(req.body);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk enrolling students:', error);
      res.status(500).json({ error: 'Failed to bulk enroll students' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/notifications:
 *   post:
 *     summary: Bulk send notifications (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkNotificationSchema = z.object({
  userIds: z.array(z.string()).min(1),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().optional(),
  metadata: z.any().optional(),
});

router.post('/bulk/notifications',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: bulkNotificationSchema }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkSendNotifications(req.body);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk sending notifications:', error);
      res.status(500).json({ error: 'Failed to bulk send notifications' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/users/delete:
 *   post:
 *     summary: Bulk delete users (Admin only)
 *     tags: [Bulk Operations]
 */
router.post('/bulk/users/delete',
  requireAuth,
  requireRole('ADMIN'),
  validate({ body: z.object({ userIds: z.array(z.string()).min(1) }) }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkDeleteUsers(req.body.userIds);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk deleting users:', error);
      res.status(500).json({ error: 'Failed to bulk delete users' });
    }
  }
);

/**
 * @swagger
 * /api/bulk/users/update-roles:
 *   post:
 *     summary: Bulk update user roles (Admin only)
 *     tags: [Bulk Operations]
 */
router.post('/bulk/users/update-roles',
  requireAuth,
  requireRole('ADMIN'),
  validate({
    body: z.object({
      updates: z.array(z.object({
        userId: z.string(),
        role: z.string(),
      })).min(1),
    }),
  }),
  async (req, res) => {
    try {
      const result = await bulkService.bulkUpdateUserRoles(req.body.updates);
      
      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('Error bulk updating user roles:', error);
      res.status(500).json({ error: 'Failed to bulk update user roles' });
    }
  }
);

export default router;
