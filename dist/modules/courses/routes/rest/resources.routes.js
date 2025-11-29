"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
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
        // This endpoint would typically handle file upload
        // For now, return a placeholder response
        // You would integrate with your file upload service here (e.g., Cloudflare R2)
        res.status(201).json({
            success: true,
            message: 'File upload endpoint - integrate with file upload service',
            data: {
                lessonId,
                uploadedBy: userId
            }
        });
    }
    catch (error) {
        console.error('Error uploading resource:', error);
        res.status(500).json({ error: 'Failed to upload resource' });
    }
});
exports.default = router;
