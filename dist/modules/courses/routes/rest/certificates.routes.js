"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const certificate_service_1 = require("../../services/certificate.service");
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
        const certificate = await prisma_1.prisma.certificate.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
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
        const certificate = await prisma_1.prisma.certificate.findUnique({
            where: {
                studentId_courseId: {
                    studentId: userId,
                    courseId: courseId
                }
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
exports.default = router;
