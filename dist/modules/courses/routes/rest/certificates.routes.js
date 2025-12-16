"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const prisma_1 = require("../../../../utils/prisma");
const certificate_service_1 = require("../../services/certificate.service");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/courses/{courseId}/certificates/{userId}:
 *   get:
 *     summary: Get certificate metadata
 *     tags: [Certificates]
 */
router.get('/courses/:courseId/certificates/:userId', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const certificate = await prisma_1.prisma.certificate.findFirst({
            where: {
                studentId: userId,
                courseId: courseId
            },
            include: {
                student: {
                    select: { id: true, username: true, email: true }
                },
                course: {
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
    }
    catch (error) {
        console.error('Error fetching certificate:', error);
        res.status(500).json({ error: 'Failed to fetch certificate' });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/certificates/{userId}/download:
 *   get:
 *     summary: Download certificate as PDF
 *     tags: [Certificates]
 */
router.get('/courses/:courseId/certificates/:userId/download', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const certificate = await prisma_1.prisma.certificate.findFirst({
            where: {
                studentId: userId,
                courseId: courseId
            },
            include: {
                student: {
                    select: { id: true, username: true, email: true }
                },
                course: {
                    select: { id: true, title: true, description: true }
                }
            }
        });
        if (!certificate) {
            return res.status(404).json({ error: 'Certificate not found' });
        }
        // Generate PDF certificate
        try {
            const pdfStream = await certificate_service_1.certificateService.generatePDFStream({
                id: certificate.id,
                student: {
                    username: certificate.student.username || 'Student',
                    email: certificate.student.email || ''
                },
                course: {
                    title: certificate.course.title,
                    description: certificate.course.description || undefined
                },
                issuedAt: certificate.issuedAt || new Date(),
                certificateNumber: certificate.id.substring(0, 8).toUpperCase()
            });
            // Set headers for PDF download
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.course.title.replace(/[^a-z0-9]/gi, '_')}-${certificate.id.substring(0, 8)}.pdf"`);
            // Pipe PDF to response
            pdfStream.pipe(res);
        }
        catch (error) {
            console.error('Error generating PDF:', error);
            res.status(500).json({ error: 'Failed to generate PDF certificate' });
        }
    }
    catch (error) {
        console.error('Error downloading certificate:', error);
        res.status(500).json({ error: 'Failed to download certificate' });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/certificates/{userId}/check-completion:
 *   get:
 *     summary: Check course completion status
 *     tags: [Certificates]
 */
router.get('/courses/:courseId/certificates/:userId/check-completion', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const currentUserId = req.user?.id;
        // Users can only check their own completion, or teachers/admins can check any
        if (userId !== currentUserId && req.user?.role !== 'Teacher' && req.user?.role !== 'ADMIN') {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const completion = await certificate_service_1.certificateService.checkCourseCompletion(userId, courseId);
        res.json({
            success: true,
            data: completion
        });
    }
    catch (error) {
        console.error('Error checking completion:', error);
        res.status(500).json({ error: 'Failed to check completion status' });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/certificates/{userId}/issue:
 *   post:
 *     summary: Manually issue certificate (Teacher/Admin only)
 *     tags: [Certificates]
 */
const issueCertificateSchema = zod_1.z.object({
    title: zod_1.z.string().max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
});
router.post('/courses/:courseId/certificates/:userId/issue', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({
    params: zod_1.z.object({
        courseId: zod_1.z.string().min(1),
        userId: zod_1.z.string().min(1)
    }),
    body: issueCertificateSchema
}), async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const certificate = await certificate_service_1.certificateService.issueCertificate(userId, courseId, req.body.title, req.body.description);
        res.status(201).json({
            success: true,
            data: certificate,
            message: 'Certificate issued successfully'
        });
    }
    catch (error) {
        console.error('Error issuing certificate:', error);
        res.status(500).json({ error: error.message || 'Failed to issue certificate' });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/certificates/{userId}/auto-issue:
 *   post:
 *     summary: Attempt to auto-issue certificate if course is completed
 *     tags: [Certificates]
 */
router.post('/courses/:courseId/certificates/:userId/auto-issue', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId, userId } = req.params;
        const currentUserId = req.user?.id;
        // Users can only auto-issue for themselves
        if (userId !== currentUserId) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        const result = await certificate_service_1.certificateService.autoIssueCertificate(userId, courseId);
        if (result.issued) {
            res.status(201).json({
                success: true,
                data: result.certificate,
                message: result.message
            });
        }
        else {
            res.status(200).json({
                success: false,
                message: result.message,
                data: null
            });
        }
    }
    catch (error) {
        console.error('Error auto-issuing certificate:', error);
        res.status(500).json({ error: error.message || 'Failed to auto-issue certificate' });
    }
});
exports.default = router;
