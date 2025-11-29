"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
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
        // TODO: Generate PDF certificate
        // For now, return certificate data
        // You would use a PDF generation library like pdfkit or puppeteer here
        res.json({
            success: true,
            message: 'Certificate download endpoint - PDF generation to be implemented',
            data: certificate
        });
        // Example PDF generation (commented out):
        // const PDFDocument = require('pdfkit');
        // const doc = new PDFDocument();
        // res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader('Content-Disposition', `attachment; filename="certificate-${certificate.id}.pdf"`);
        // doc.pipe(res);
        // doc.text(`Certificate of Completion`, { align: 'center' });
        // doc.text(`This certifies that ${certificate.student.username}`, { align: 'center' });
        // doc.text(`has completed the course: ${certificate.course.title}`, { align: 'center' });
        // doc.end();
    }
    catch (error) {
        console.error('Error downloading certificate:', error);
        res.status(500).json({ error: 'Failed to download certificate' });
    }
});
exports.default = router;
