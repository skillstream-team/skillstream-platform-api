"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_service_1 = require("../../services/admin.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const logger_1 = require("../../../../utils/logger");
const zod_1 = require("zod");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const adminService = new admin_service_1.AdminService();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
// ============================================================
// ADMIN DASHBOARD STATS
// ============================================================
/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get admin dashboard statistics (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/stats', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const stats = await adminService.getDashboardStats();
        res.json({
            success: true,
            ...stats,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting admin stats', error, {
            userId: req.user?.id,
        });
        res.status(500).json({
            error: error.message || 'Failed to get admin stats',
        });
    }
});
// ============================================================
// USER MANAGEMENT (Admin)
// ============================================================
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with filtering (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/users', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const search = req.query.search;
        const role = req.query.role;
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
        const result = await adminService.getUsers({
            page,
            limit,
            search,
            role,
            isActive,
        });
        res.json({
            success: true,
            users: result.users || [],
            pagination: result.pagination,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting users', error, {
            userId: req.user?.id,
        });
        res.status(500).json({
            error: error.message || 'Failed to get users',
        });
    }
});
/**
 * @swagger
 * /api/admin/users/:id:
 *   get:
 *     summary: Get user by ID (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/users/:id', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        res.set('Cache-Control', 'private, no-store');
        const user = await adminService.getUserById(req.params.id);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting user', error, {
            userId: req.user?.id,
            targetUserId: req.params.id,
        });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            error: error.message || 'Failed to get user',
        });
    }
});
/**
 * @swagger
 * /api/admin/users/:id:
 *   put:
 *     summary: Update user (Admin only)
 *     tags: [Admin]
 */
const updateUserSchema = zod_1.z.object({
    role: zod_1.z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
    isActive: zod_1.z.boolean().optional(),
    isVerified: zod_1.z.boolean().optional(),
});
router.put('/admin/users/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateUserSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const user = await adminService.updateUser(req.params.id, req.body);
        res.json({
            success: true,
            data: user,
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating user', error, {
            userId: req.user?.id,
            targetUserId: req.params.id,
        });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to update user',
        });
    }
});
/**
 * @swagger
 * /api/admin/users/:id:
 *   delete:
 *     summary: Delete user (Admin only)
 *     tags: [Admin]
 */
router.delete('/admin/users/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        await adminService.deleteUser(req.params.id);
        res.json({
            success: true,
            message: 'User deleted successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting user', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to delete user',
        });
    }
});
// ============================================================
// COURSE MODERATION (Admin)
// ============================================================
/**
 * @swagger
 * /api/admin/courses/pending:
 *   get:
 *     summary: Get pending courses (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/courses/pending', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const result = await adminService.getPendingCourses({
            page,
            limit,
        });
        res.json({
            success: true,
            courses: result.courses || [],
            pagination: result.pagination,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting pending courses', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get pending courses',
        });
    }
});
/**
 * @swagger
 * /api/admin/courses/:id/moderate:
 *   post:
 *     summary: Moderate course (approve/reject) (Admin only)
 *     tags: [Admin]
 */
const moderateCourseSchema = zod_1.z.object({
    status: zod_1.z.enum(['APPROVED', 'REJECTED', 'PENDING']),
    rejectionReason: zod_1.z.string().optional(),
});
router.post('/admin/courses/:id/moderate', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: moderateCourseSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const course = await adminService.moderateCollection(req.params.id, req.body.status, req.body.rejectionReason, adminId);
        res.json({
            success: true,
            data: course,
        });
    }
    catch (error) {
        logger_1.logger.error('Error moderating course', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to moderate course',
        });
    }
});
// ============================================================
// REVIEWS MANAGEMENT (Admin)
// ============================================================
/**
 * @swagger
 * /api/admin/reviews:
 *   get:
 *     summary: Get all reviews with filtering (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/reviews', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const courseId = req.query.courseId;
        const userId = req.query.userId;
        const rating = req.query.rating ? parseInt(req.query.rating, 10) : undefined;
        const status = req.query.status;
        const result = await adminService.getAllReviews({
            page,
            limit,
            courseId,
            userId,
            rating,
            status,
        });
        res.json({
            success: true,
            reviews: result.reviews || [],
            pagination: result.pagination,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting reviews', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get reviews',
        });
    }
});
/**
 * @swagger
 * /api/admin/reviews/:id/moderate:
 *   post:
 *     summary: Moderate review (Admin only)
 *     tags: [Admin]
 */
const moderateReviewSchema = zod_1.z.object({
    action: zod_1.z.enum(['approve', 'reject', 'hide', 'delete']),
    reason: zod_1.z.string().optional(),
});
router.post('/admin/reviews/:id/moderate', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: moderateReviewSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const review = await adminService.moderateReview(req.params.id, req.body.action, req.body.reason, adminId);
        res.json({
            success: true,
            data: review,
        });
    }
    catch (error) {
        logger_1.logger.error('Error moderating review', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to moderate review',
        });
    }
});
// ============================================================
// CERTIFICATES MANAGEMENT (Admin)
// ============================================================
/**
 * @swagger
 * /api/admin/certificates:
 *   get:
 *     summary: Get all certificates with filtering (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/certificates', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const userId = req.query.userId;
        const courseId = req.query.courseId;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const result = await adminService.getAllCertificates({
            page,
            limit,
            userId,
            courseId,
            startDate,
            endDate,
        });
        res.json({
            success: true,
            certificates: result.certificates || [],
            pagination: result.pagination,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting certificates', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get certificates',
        });
    }
});
/**
 * @swagger
 * /api/admin/certificates/:id/revoke:
 *   post:
 *     summary: Revoke certificate (Admin only)
 *     tags: [Admin]
 */
const revokeCertificateSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
});
router.post('/admin/certificates/:id/revoke', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: revokeCertificateSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const certificate = await adminService.revokeCertificate(req.params.id, req.body.reason, adminId);
        res.json({
            success: true,
            data: certificate,
            message: 'Certificate revoked successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error revoking certificate', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to revoke certificate',
        });
    }
});
// ============================================================
// PAYOUT MANAGEMENT
// ============================================================
/**
 * @swagger
 * /api/admin/payouts:
 *   get:
 *     summary: Get all payout requests (Admin only)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 */
router.get('/admin/payouts', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const status = req.query.status;
        const teacherId = req.query.teacherId;
        const result = await adminService.getPayouts({
            page,
            limit,
            status,
            teacherId,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting payouts', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get payouts',
        });
    }
});
/**
 * @swagger
 * /api/admin/payouts/{payoutId}/approve:
 *   post:
 *     summary: Approve a payout request (Admin only)
 *     tags: [Admin]
 */
const approvePayoutSchema = zod_1.z.object({
    transactionId: zod_1.z.string().optional(),
});
router.post('/admin/payouts/:payoutId/approve', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ payoutId: zod_1.z.string().min(1) }),
    body: approvePayoutSchema.optional(),
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { payoutId } = req.params;
        const adminId = req.user.id;
        const { transactionId } = req.body || {};
        const payout = await adminService.approvePayout(payoutId, adminId, transactionId, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        });
        res.json({
            success: true,
            data: payout,
            message: 'Payout approved successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error approving payout', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to approve payout',
        });
    }
});
/**
 * @swagger
 * /api/admin/payouts/{payoutId}/reject:
 *   post:
 *     summary: Reject a payout request (Admin only)
 *     tags: [Admin]
 */
const rejectPayoutSchema = zod_1.z.object({
    reason: zod_1.z.string().optional(),
});
router.post('/admin/payouts/:payoutId/reject', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ payoutId: zod_1.z.string().min(1) }),
    body: rejectPayoutSchema.optional(),
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { payoutId } = req.params;
        const adminId = req.user.id;
        const { reason } = req.body || {};
        const payout = await adminService.rejectPayout(payoutId, adminId, reason, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        });
        res.json({
            success: true,
            data: payout,
            message: 'Payout rejected successfully',
        });
    }
    catch (error) {
        logger_1.logger.error('Error rejecting payout', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to reject payout',
        });
    }
});
// ============================================================
// BULK OPERATIONS
// ============================================================
/**
 * @swagger
 * /api/admin/users/bulk:
 *   post:
 *     summary: Bulk update users (Admin only)
 *     tags: [Admin]
 */
const bulkUpdateUsersSchema = zod_1.z.object({
    userIds: zod_1.z.array(zod_1.z.string()).min(1),
    role: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    isVerified: zod_1.z.boolean().optional(),
});
router.post('/admin/users/bulk', auth_1.requireAuth, (0, validation_1.validate)({ body: bulkUpdateUsersSchema }), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const { userIds, ...updates } = req.body;
        const result = await adminService.bulkUpdateUsers(userIds, updates, adminId, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        });
        res.json({
            success: true,
            message: 'Bulk update completed',
            updated: result.updated,
            failed: result.failed,
            errors: result.errors,
        });
    }
    catch (error) {
        logger_1.logger.error('Error bulk updating users', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to bulk update users',
        });
    }
});
/**
 * @swagger
 * /api/admin/courses/bulk:
 *   post:
 *     summary: Bulk update courses (Admin only)
 *     tags: [Admin]
 */
const bulkUpdateCoursesSchema = zod_1.z.object({
    courseIds: zod_1.z.array(zod_1.z.string()).min(1),
    status: zod_1.z.enum(['APPROVED', 'REJECTED', 'PENDING']),
    rejectionReason: zod_1.z.string().optional(),
});
router.post('/admin/courses/bulk', auth_1.requireAuth, (0, validation_1.validate)({ body: bulkUpdateCoursesSchema }), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const { courseIds, status, rejectionReason } = req.body;
        const result = await adminService.bulkUpdateCourses(courseIds, status, rejectionReason, adminId, {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('user-agent'),
        });
        res.json({
            success: true,
            message: 'Bulk moderation completed',
            updated: result.updated,
            failed: result.failed,
            errors: result.errors,
        });
    }
    catch (error) {
        logger_1.logger.error('Error bulk updating courses', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to bulk update courses',
        });
    }
});
// ============================================================
// BROADCAST MANAGEMENT
// ============================================================
/**
 * @swagger
 * /api/admin/broadcasts:
 *   post:
 *     summary: Send broadcast notification (Admin only)
 *     tags: [Admin]
 */
const sendBroadcastSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    message: zod_1.z.string().min(1),
    targetAudience: zod_1.z.enum(['all', 'students', 'teachers', 'admins']).optional(),
    userIds: zod_1.z.array(zod_1.z.string()).optional(),
    sendEmail: zod_1.z.boolean().optional(),
    sendPush: zod_1.z.boolean().optional(),
});
router.post('/admin/broadcasts', auth_1.requireAuth, (0, validation_1.validate)({ body: sendBroadcastSchema }), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const adminId = req.user.id;
        const result = await adminService.sendBroadcast(req.body, adminId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error sending broadcast', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to send broadcast',
        });
    }
});
/**
 * @swagger
 * /api/admin/broadcasts:
 *   get:
 *     summary: Get broadcast history (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/broadcasts', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const result = await adminService.getBroadcasts({
            page,
            limit,
            startDate,
            endDate,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting broadcasts', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get broadcasts',
        });
    }
});
// ============================================================
// ACTIVITY LOGS
// ============================================================
/**
 * @swagger
 * /api/admin/logs:
 *   get:
 *     summary: Get activity logs (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/logs', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const userId = req.query.userId;
        const action = req.query.action;
        const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
        const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
        const result = await adminService.getActivityLogs({
            page,
            limit,
            userId,
            action,
            startDate,
            endDate,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting activity logs', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get activity logs',
        });
    }
});
// ============================================================
// USER IMPORT/EXPORT
// ============================================================
/**
 * @swagger
 * /api/admin/users/import:
 *   post:
 *     summary: Import users from CSV (Admin only)
 *     tags: [Admin]
 */
router.post('/admin/users/import', auth_1.requireAuth, upload.single('file'), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'CSV file is required' });
        }
        const csvContent = req.file.buffer.toString('utf-8');
        const adminId = req.user.id;
        const result = await adminService.importUsersFromCSV(csvContent, adminId);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error importing users', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to import users',
        });
    }
});
/**
 * @swagger
 * /api/admin/users/export:
 *   get:
 *     summary: Export users to CSV (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/users/export', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const role = req.query.role;
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
        const csvData = await adminService.exportUsersToCSV({ role, isActive });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=users-export.csv');
        res.send(csvData);
    }
    catch (error) {
        logger_1.logger.error('Error exporting users', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to export users',
        });
    }
});
// ============================================================
// CERTIFICATE TEMPLATES
// ============================================================
/**
 * @swagger
 * /api/admin/certificate-templates:
 *   get:
 *     summary: Get all certificate templates (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/certificate-templates', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const templates = await adminService.getCertificateTemplates();
        res.json({
            success: true,
            data: { templates },
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting certificate templates', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get certificate templates',
        });
    }
});
/**
 * @swagger
 * /api/admin/certificate-templates:
 *   post:
 *     summary: Create certificate template (Admin only)
 *     tags: [Admin]
 */
const createCertificateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    design: zod_1.z.any(),
    fields: zod_1.z.array(zod_1.z.string()),
    isDefault: zod_1.z.boolean().optional(),
});
router.post('/admin/certificate-templates', auth_1.requireAuth, (0, validation_1.validate)({ body: createCertificateTemplateSchema }), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const template = await adminService.createCertificateTemplate(req.body);
        res.json({
            success: true,
            data: template,
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating certificate template', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to create certificate template',
        });
    }
});
/**
 * @swagger
 * /api/admin/certificate-templates/{id}:
 *   put:
 *     summary: Update certificate template (Admin only)
 *     tags: [Admin]
 */
const updateCertificateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().optional(),
    design: zod_1.z.any().optional(),
    fields: zod_1.z.array(zod_1.z.string()).optional(),
    isDefault: zod_1.z.boolean().optional(),
    isActive: zod_1.z.boolean().optional(),
});
router.put('/admin/certificate-templates/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateCertificateTemplateSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { id } = req.params;
        const template = await adminService.updateCertificateTemplate(id, req.body);
        res.json({
            success: true,
            data: template,
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating certificate template', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            error: error.message || 'Failed to update certificate template',
        });
    }
});
/**
 * @swagger
 * /api/admin/certificate-templates/{id}:
 *   delete:
 *     summary: Delete certificate template (Admin only)
 *     tags: [Admin]
 */
router.delete('/admin/certificate-templates/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { id } = req.params;
        const result = await adminService.deleteCertificateTemplate(id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting certificate template', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 400;
        res.status(statusCode).json({
            error: error.message || 'Failed to delete certificate template',
        });
    }
});
// ============================================================
// BANNER MANAGEMENT
// ============================================================
/**
 * @swagger
 * /api/admin/banners:
 *   get:
 *     summary: Get all banners (Admin only)
 *     tags: [Admin]
 */
router.get('/admin/banners', auth_1.requireAuth, async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
        const page = req.query.page ? parseInt(req.query.page, 10) : 1;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
        const result = await adminService.getBanners({
            isActive,
            page,
            limit,
        });
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error getting banners', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to get banners',
        });
    }
});
/**
 * @swagger
 * /api/admin/banners:
 *   post:
 *     summary: Create banner (Admin only)
 *     tags: [Admin]
 */
const createBannerSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    linkUrl: zod_1.z.string().url().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    isActive: zod_1.z.boolean().optional(),
    position: zod_1.z.string().optional(),
    priority: zod_1.z.number().optional(),
    targetAudience: zod_1.z.string().optional(),
});
router.post('/admin/banners', auth_1.requireAuth, (0, validation_1.validate)({ body: createBannerSchema }), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const bannerData = {
            ...req.body,
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        };
        const banner = await adminService.createBanner(bannerData);
        res.json({
            success: true,
            data: banner,
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating banner', error, { userId: req.user?.id });
        res.status(500).json({
            error: error.message || 'Failed to create banner',
        });
    }
});
/**
 * @swagger
 * /api/admin/banners/{id}:
 *   put:
 *     summary: Update banner (Admin only)
 *     tags: [Admin]
 */
const updateBannerSchema = zod_1.z.object({
    title: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    imageUrl: zod_1.z.string().url().optional(),
    linkUrl: zod_1.z.string().url().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    isActive: zod_1.z.boolean().optional(),
    position: zod_1.z.string().optional(),
    priority: zod_1.z.number().optional(),
    targetAudience: zod_1.z.string().optional(),
});
router.put('/admin/banners/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateBannerSchema,
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { id } = req.params;
        const bannerData = {
            ...req.body,
            startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
            endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        };
        const banner = await adminService.updateBanner(id, bannerData);
        res.json({
            success: true,
            data: banner,
        });
    }
    catch (error) {
        logger_1.logger.error('Error updating banner', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            error: error.message || 'Failed to update banner',
        });
    }
});
/**
 * @swagger
 * /api/admin/banners/{id}:
 *   delete:
 *     summary: Delete banner (Admin only)
 *     tags: [Admin]
 */
router.delete('/admin/banners/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
}), async (req, res) => {
    // Check admin role
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Admin role required' });
    }
    try {
        const { id } = req.params;
        const result = await adminService.deleteBanner(id);
        res.json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting banner', error, { userId: req.user?.id });
        const statusCode = error.message.includes('not found') ? 404 : 500;
        res.status(statusCode).json({
            error: error.message || 'Failed to delete banner',
        });
    }
});
exports.default = router;
