"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const logger_1 = require("../../../../utils/logger");
const cloudflare_r2_service_1 = require("../../services/cloudflare-r2.service");
const cloudflare_images_1 = require("../../../../utils/cloudflare-images");
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
        // Get resources from modules user is part of
        const bookings = await prisma_1.prisma.booking.findMany({
            where: { studentId: userId },
            select: { slot: true }
        });
        // Get resources from quick modules user is involved in
        const resources = await prisma_1.prisma.moduleResource.findMany({
            where: {
                OR: [
                    { sharedBy: userId },
                    {
                        module: {
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
                module: {
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
        logger_1.logger.error('Error fetching recent resources', error);
        res.status(500).json({ error: 'Failed to fetch recent resources' });
    }
});
/**
 * @swagger
 * /api/modules/{moduleId}/resources:
 *   get:
 *     summary: Get all resources for a module
 *     tags: [Resources]
 */
router.get('/modules/:moduleId/resources', auth_1.requireAuth, async (req, res) => {
    try {
        const { moduleId } = req.params;
        // ModuleResource schema only relates to QuickModule, but moduleId is just a string
        // So we can query by moduleId directly without the relation constraint
        const resources = await prisma_1.prisma.moduleResource.findMany({
            where: { moduleId },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: resources
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching module resources', error);
        res.status(500).json({ error: 'Failed to fetch module resources' });
    }
});
/**
 * @swagger
 * /api/modules/{moduleId}/resources:
 *   post:
 *     summary: Share a resource in a module
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/resources', auth_1.requireAuth, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user?.id;
        const { title, type, url, fileUrl, filename, size, mimeType } = req.body;
        const resource = await prisma_1.prisma.moduleResource.create({
            data: {
                moduleId,
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
        logger_1.logger.error('Error sharing resource', error);
        res.status(500).json({ error: 'Failed to share resource' });
    }
});
/**
 * @swagger
 * /api/modules/{moduleId}/resources/upload:
 *   post:
 *     summary: Upload a file and attach to module
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/resources/upload', auth_1.requireAuth, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const userId = req.user?.id;
        const { file, title, filename, contentType } = req.body;
        if (!file || !filename || !contentType) {
            return res.status(400).json({
                error: 'file (base64), filename, and contentType are required'
            });
        }
        // Verify module exists - check both Module and QuickModule types
        // Even though schema shows ModuleResource relates to QuickModule, 
        // moduleId is just a string field, so we can support both types
        const [regularModule, quickModule] = await Promise.all([
            prisma_1.prisma.module.findUnique({ where: { id: moduleId } }),
            prisma_1.prisma.quickModule.findUnique({ where: { id: moduleId } })
        ]);
        if (!regularModule && !quickModule) {
            return res.status(404).json({ error: 'Module not found' });
        }
        // Determine courseId based on module type
        // For regular Module, try to get programId from ProgramModule relation
        // For QuickModule, use moduleId as courseId
        let courseId = moduleId;
        if (regularModule) {
            // Try to find the program this module belongs to
            const programModule = await prisma_1.prisma.programModule.findFirst({
                where: { moduleId },
                select: { programId: true }
            });
            if (programModule) {
                courseId = programModule.programId;
            }
        }
        const fileBuffer = Buffer.from(file, 'base64');
        let fileUrl;
        let size;
        let mimeType;
        if (contentType.startsWith('image/') && (0, cloudflare_images_1.isCloudflareImagesConfigured)()) {
            const result = await (0, cloudflare_images_1.uploadImageToCloudflareImages)(fileBuffer, filename, contentType);
            fileUrl = result.url;
            size = fileBuffer.length;
            mimeType = contentType;
        }
        else {
            let fileType = 'other';
            if (contentType.includes('pdf'))
                fileType = 'pdf';
            else if (contentType.startsWith('image/'))
                fileType = 'image';
            else if (contentType.includes('zip') || contentType.includes('archive'))
                fileType = 'zip';
            else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text'))
                fileType = 'document';
            const uploadResult = await r2Service.uploadFile({
                file: fileBuffer,
                filename,
                contentType,
                programId: courseId.toString(),
                type: fileType,
            });
            fileUrl = uploadResult.url;
            size = uploadResult.size;
            mimeType = uploadResult.contentType;
        }
        const resource = await prisma_1.prisma.moduleResource.create({
            data: {
                moduleId,
                title: title || filename,
                type: 'file',
                fileUrl,
                filename,
                size,
                mimeType,
                sharedBy: userId
            },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                },
                module: {
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
        logger_1.logger.error('Error uploading resource', error);
        res.status(500).json({ error: 'Failed to upload resource: ' + error.message });
    }
});
/**
 * @swagger
 * /api/modules/{moduleId}/resources/{resourceId}:
 *   delete:
 *     summary: Delete a resource from a module
 *     tags: [Resources]
 */
router.delete('/modules/:moduleId/resources/:resourceId', auth_1.requireAuth, async (req, res) => {
    try {
        const { moduleId, resourceId } = req.params;
        const userId = req.user?.id;
        // Check if resource exists and user has permission
        const resource = await prisma_1.prisma.moduleResource.findUnique({
            where: { id: resourceId },
            include: {
                module: {
                    select: { teacherId: true }
                }
            }
        });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        // Check if user is the sharer or the module teacher
        if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this resource' });
        }
        // Delete the resource
        await prisma_1.prisma.moduleResource.delete({
            where: { id: resourceId }
        });
        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting resource', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});
// Backward compatibility routes for /lessons endpoints
router.get('/lessons/:lessonId/resources', auth_1.requireAuth, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const moduleId = lessonId;
        const resources = await prisma_1.prisma.moduleResource.findMany({
            where: { moduleId },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json({
            success: true,
            data: resources
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching module resources', error);
        res.status(500).json({ error: 'Failed to fetch module resources' });
    }
});
router.post('/lessons/:lessonId/resources/upload', auth_1.requireAuth, async (req, res) => {
    try {
        const { lessonId } = req.params;
        const moduleId = lessonId;
        const userId = req.user?.id;
        const { file, title, filename, contentType } = req.body;
        if (!file || !filename || !contentType) {
            return res.status(400).json({
                error: 'file (base64), filename, and contentType are required'
            });
        }
        const [regularModule, quickModule] = await Promise.all([
            prisma_1.prisma.module.findUnique({ where: { id: moduleId } }),
            prisma_1.prisma.quickModule.findUnique({ where: { id: moduleId } })
        ]);
        if (!regularModule && !quickModule) {
            return res.status(404).json({ error: 'Lesson not found' });
        }
        let courseId = moduleId;
        if (regularModule) {
            const programModule = await prisma_1.prisma.programModule.findFirst({
                where: { moduleId },
                select: { programId: true }
            });
            if (programModule) {
                courseId = programModule.programId;
            }
        }
        const fileBuffer = Buffer.from(file, 'base64');
        let fileUrl;
        let size;
        let mimeType;
        if (contentType.startsWith('image/') && (0, cloudflare_images_1.isCloudflareImagesConfigured)()) {
            const result = await (0, cloudflare_images_1.uploadImageToCloudflareImages)(fileBuffer, filename, contentType);
            fileUrl = result.url;
            size = fileBuffer.length;
            mimeType = contentType;
        }
        else {
            let fileType = 'other';
            if (contentType.includes('pdf'))
                fileType = 'pdf';
            else if (contentType.startsWith('image/'))
                fileType = 'image';
            else if (contentType.includes('zip') || contentType.includes('archive'))
                fileType = 'zip';
            else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text'))
                fileType = 'document';
            const uploadResult = await r2Service.uploadFile({
                file: fileBuffer,
                filename,
                contentType,
                programId: courseId.toString(),
                type: fileType,
            });
            fileUrl = uploadResult.url;
            size = uploadResult.size;
            mimeType = uploadResult.contentType;
        }
        const resource = await prisma_1.prisma.moduleResource.create({
            data: {
                moduleId,
                title: title || filename,
                type: 'file',
                fileUrl,
                filename,
                size,
                mimeType,
                sharedBy: userId
            },
            include: {
                sharer: {
                    select: { id: true, username: true, email: true }
                },
                module: {
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
        logger_1.logger.error('Error uploading resource', error);
        res.status(500).json({ error: 'Failed to upload resource: ' + error.message });
    }
});
router.delete('/lessons/:lessonId/resources/:resourceId', auth_1.requireAuth, async (req, res) => {
    try {
        const { lessonId, resourceId } = req.params;
        const userId = req.user?.id;
        const resource = await prisma_1.prisma.moduleResource.findUnique({
            where: { id: resourceId },
            include: {
                module: {
                    select: { teacherId: true }
                }
            }
        });
        if (!resource) {
            return res.status(404).json({ error: 'Resource not found' });
        }
        if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
            return res.status(403).json({ error: 'You do not have permission to delete this resource' });
        }
        await prisma_1.prisma.moduleResource.delete({
            where: { id: resourceId }
        });
        res.json({
            success: true,
            message: 'Resource deleted successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error deleting resource', error);
        res.status(500).json({ error: 'Failed to delete resource' });
    }
});
exports.default = router;
