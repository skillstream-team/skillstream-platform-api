"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bulk_operations_service_1 = require("../../services/bulk-operations.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const bulkService = new bulk_operations_service_1.BulkOperationsService();
/**
 * @swagger
 * /api/bulk/users/import:
 *   post:
 *     summary: Bulk import users (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkUserImportSchema = zod_1.z.object({
    users: zod_1.z.array(zod_1.z.object({
        email: zod_1.z.string().email(),
        username: zod_1.z.string().min(1),
        password: zod_1.z.string().optional(),
        role: zod_1.z.string(),
        firstName: zod_1.z.string().optional(),
        lastName: zod_1.z.string().optional(),
    })).min(1),
});
router.post('/bulk/users/import', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: bulkUserImportSchema }), async (req, res) => {
    try {
        const result = await bulkService.bulkImportUsers(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk importing users:', error);
        res.status(500).json({ error: 'Failed to bulk import users' });
    }
});
/**
 * @swagger
 * /api/bulk/users/export:
 *   get:
 *     summary: Bulk export users as CSV (Admin only)
 *     tags: [Bulk Operations]
 */
router.get('/bulk/users/export', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const role = req.query.role;
        const csv = await bulkService.bulkExportUsers(role);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=users-export-${Date.now()}.csv`);
        res.send(csv);
    }
    catch (error) {
        console.error('Error bulk exporting users:', error);
        res.status(500).json({ error: 'Failed to bulk export users' });
    }
});
/**
 * @swagger
 * /api/bulk/courses/import:
 *   post:
 *     summary: Bulk import courses (Admin/Teacher only)
 *     tags: [Bulk Operations]
 */
const bulkCourseImportSchema = zod_1.z.object({
    courses: zod_1.z.array(zod_1.z.object({
        title: zod_1.z.string().min(1),
        description: zod_1.z.string().optional(),
        price: zod_1.z.number(),
        instructorId: zod_1.z.string(),
        order: zod_1.z.number(),
    })).min(1),
});
router.post('/bulk/courses/import', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({ body: bulkCourseImportSchema }), async (req, res) => {
    try {
        const result = await bulkService.bulkImportCourses(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk importing courses:', error);
        res.status(500).json({ error: 'Failed to bulk import courses' });
    }
});
/**
 * @swagger
 * /api/bulk/courses/export:
 *   get:
 *     summary: Bulk export courses as CSV
 *     tags: [Bulk Operations]
 */
router.get('/bulk/courses/export', auth_1.requireAuth, async (req, res) => {
    try {
        const csv = await bulkService.bulkExportCourses();
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=courses-export-${Date.now()}.csv`);
        res.send(csv);
    }
    catch (error) {
        console.error('Error bulk exporting courses:', error);
        res.status(500).json({ error: 'Failed to bulk export courses' });
    }
});
/**
 * @swagger
 * /api/bulk/enrollments:
 *   post:
 *     summary: Bulk enroll students (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkEnrollmentSchema = zod_1.z.object({
    enrollments: zod_1.z.array(zod_1.z.object({
        courseId: zod_1.z.string(),
        studentId: zod_1.z.string(),
        amount: zod_1.z.number(),
        currency: zod_1.z.string().optional(),
        provider: zod_1.z.string(),
    })).min(1),
});
router.post('/bulk/enrollments', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: bulkEnrollmentSchema }), async (req, res) => {
    try {
        const result = await bulkService.bulkEnrollStudents(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk enrolling students:', error);
        res.status(500).json({ error: 'Failed to bulk enroll students' });
    }
});
/**
 * @swagger
 * /api/bulk/notifications:
 *   post:
 *     summary: Bulk send notifications (Admin only)
 *     tags: [Bulk Operations]
 */
const bulkNotificationSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string()).min(1),
    type: zod_1.z.string(),
    title: zod_1.z.string(),
    message: zod_1.z.string(),
    link: zod_1.z.string().optional(),
    metadata: zod_1.z.any().optional(),
});
router.post('/bulk/notifications', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: bulkNotificationSchema }), async (req, res) => {
    try {
        const result = await bulkService.bulkSendNotifications(req.body);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk sending notifications:', error);
        res.status(500).json({ error: 'Failed to bulk send notifications' });
    }
});
/**
 * @swagger
 * /api/bulk/users/delete:
 *   post:
 *     summary: Bulk delete users (Admin only)
 *     tags: [Bulk Operations]
 */
router.post('/bulk/users/delete', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: zod_1.z.object({ userIds: zod_1.z.array(zod_1.z.string()).min(1) }) }), async (req, res) => {
    try {
        const result = await bulkService.bulkDeleteUsers(req.body.userIds);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk deleting users:', error);
        res.status(500).json({ error: 'Failed to bulk delete users' });
    }
});
/**
 * @swagger
 * /api/bulk/users/update-roles:
 *   post:
 *     summary: Bulk update user roles (Admin only)
 *     tags: [Bulk Operations]
 */
router.post('/bulk/users/update-roles', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    body: zod_1.z.object({
        updates: zod_1.z.array(zod_1.z.object({
            userId: zod_1.z.string(),
            role: zod_1.z.string(),
        })).min(1),
    }),
}), async (req, res) => {
    try {
        const result = await bulkService.bulkUpdateUserRoles(req.body.updates);
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('Error bulk updating user roles:', error);
        res.status(500).json({ error: 'Failed to bulk update user roles' });
    }
});
exports.default = router;
