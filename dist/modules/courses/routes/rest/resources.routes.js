"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const cloudflare_r2_service_1 = require("../../services/cloudflare-r2.service");
const router = (0, express_1.Router)();
const r2Service = new cloudflare_r2_service_1.CloudflareR2Service();
/**
 * @swagger
 * /api/users/{userId}/resources/recent:
 *   get:
 *     summary: Get recent resources for a user
 *     tags: [Resources]
 */
router.get('/users/:userId/resources/recent', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        // Get resources from lessons user is part of
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { studentId: userId },
            select: { slot: true }
        });
        // Get resources from quick lessons user is involved in
        const resources = await prisma_1.prisma.lessonResource.findMany({
            where: {
                OR: [
                    { sharedBy: userId },
                    {
                        lesson: {
                            OR: [
                                { teacherId: userId },
                                { attendance: { some: { studentId: userId } } }
                            ]
                        }
                    }
                ]
            },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                },
                lesson: {
                    select: { id: true, title: true, scheduledAt: true }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({
            success: true,
            data: resources
        });
    }
    catch (error) {
        console.error('Error fetching recent resources:', error);
        res.status(500).json({ error: 'Failed to fetch recent resources' });
    }
});
/**
 * @swagger
 * /api/lessons/{lessonId}/resources:
 *   post:
 *     summary: Share a resource in a lesson
 *     tags: [Resources]
 */
router.post('/lessons/:lessonId/resources', auth_1.requireAuth, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user?.id;
        const { title, type, url, fileUrl, filename, size, mimeType } = req.body;
        const resource = await prisma_1.prisma.lessonResource.create({
            data: {
                lessonId,
                title,
                type,
                url,
                fileUrl,
                filename,
                size,
                mimeType,
                sharedBy: userId
            },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: resource
        });
    }
    catch (error) {
        console.error('Error sharing resource:', error);
        res.status(500).json({ error: 'Failed to share resource' });
    }
});
/**
 * @swagger
 * /api/lessons/{lessonId}/resources/upload:
 *   post:
 *     summary: Upload a file and attach to lesson
 *     tags: [Resources]
 */
router.post('/lessons/:lessonId/resources/upload', auth_1.requireAuth, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const userId = req.user?.id;
        const { file, title, filename, contentType } = req.body;
        if (!file || !filename || !contentType) {
            return res.status(400).json({
                error: 'file (base64), filename, and contentType are required'
            });
        }
        // Verify lesson exists
        const lesson = await prisma_1.prisma.quickLesson.findUnique({
            where: { id: lessonId }
        });
        if (!lesson) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        // Decode base64 file
        const fileBuffer = Buffer.from(file, 'base64');
        // Determine file type from content type
        let fileType = 'other';
        if (contentType.includes('pdf'))
            fileType = 'pdf';
        else if (contentType.startsWith('image/'))
            fileType = 'image';
        else if (contentType.includes('zip') || contentType.includes('archive'))
            fileType = 'zip';
        else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text'))
            fileType = 'document';
        // Use lesson ID for R2 organization (QuickLesson doesn't have courseId)
        const courseId = lessonId;
        // Upload to Cloudflare R2
        const uploadResult = await r2Service.uploadFile({
            file: fileBuffer,
            filename,
            contentType,
            courseId: courseId.toString(),
            type: fileType,
        });
        // Create resource record
        const resource = await prisma_1.prisma.lessonResource.create({
            data: {
                lessonId,
                title: title || filename,
                type: 'file',
                fileUrl: uploadResult.url,
                filename: uploadResult.filename,
                size: uploadResult.size,
                mimeType: uploadResult.contentType,
                sharedBy: userId
            },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                },
                lesson: {
                    select: { id: true, title: true, scheduledAt: true }
                }
            }
        });
        res.status(201).json({
            success: true,
            data: resource
        });
    }
    catch (error) {
        console.error('Error uploading resource:', error);
        res.status(500).json({ error: 'Failed to upload resource: ' + error.message });
    }
});
exports.default = router;
