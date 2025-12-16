"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const content_versioning_service_1 = require("../../services/content-versioning.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const versioningService = new content_versioning_service_1.ContentVersioningService();
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions:
 *   post:
 *     summary: Create a new version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
const createVersionSchema = zod_1.z.object({
    content: zod_1.z.any(),
    changeNote: zod_1.z.string().optional(),
});
router.post('/content/:entityType/:entityId/versions', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
    }),
    body: createVersionSchema,
}), async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const userId = req.user?.id;
        const version = await versioningService.createVersion({
            entityType: entityType,
            entityId,
            content: req.body.content,
            createdBy: userId,
            changeNote: req.body.changeNote,
        });
        res.status(201).json({
            success: true,
            data: version,
            message: 'Version created successfully'
        });
    }
    catch (error) {
        console.error('Error creating version:', error);
        res.status(500).json({ error: error.message || 'Failed to create version' });
    }
});
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions:
 *   get:
 *     summary: Get all versions
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
    }),
}), async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const versions = await versioningService.getVersions(entityType, entityId);
        res.json({
            success: true,
            data: versions
        });
    }
    catch (error) {
        console.error('Error fetching versions:', error);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/current:
 *   get:
 *     summary: Get current version
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions/current', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
    }),
}), async (req, res) => {
    try {
        const { entityType, entityId } = req.params;
        const version = await versioningService.getCurrentVersion(entityType, entityId);
        if (!version) {
            return res.status(404).json({ error: 'No current version found' });
        }
        res.json({
            success: true,
            data: version
        });
    }
    catch (error) {
        console.error('Error fetching current version:', error);
        res.status(500).json({ error: 'Failed to fetch current version' });
    }
});
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}:
 *   get:
 *     summary: Get version by number
 *     tags: [Content Versioning]
 */
router.get('/content/:entityType/:entityId/versions/:version', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
        version: zod_1.z.string().transform(val => parseInt(val)),
    }),
}), async (req, res) => {
    try {
        const { entityType, entityId, version } = req.params;
        const versionNum = typeof version === 'string' ? parseInt(version) : version;
        const versionRecord = await versioningService.getVersionByNumber(entityType, entityId, versionNum);
        if (!versionRecord) {
            return res.status(404).json({ error: 'Version not found' });
        }
        res.json({
            success: true,
            data: versionRecord
        });
    }
    catch (error) {
        console.error('Error fetching version:', error);
        res.status(500).json({ error: 'Failed to fetch version' });
    }
});
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}/restore:
 *   post:
 *     summary: Restore a version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
router.post('/content/:entityType/:entityId/versions/:version/restore', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
        version: zod_1.z.string().transform(val => parseInt(val)),
    }),
}), async (req, res) => {
    try {
        const { entityType, entityId, version } = req.params;
        const userId = req.user?.id;
        const versionNum = typeof version === 'string' ? parseInt(version) : version;
        const restored = await versioningService.restoreVersion(entityType, entityId, versionNum, userId);
        res.json({
            success: true,
            data: restored,
            message: 'Version restored successfully'
        });
    }
    catch (error) {
        console.error('Error restoring version:', error);
        res.status(500).json({ error: error.message || 'Failed to restore version' });
    }
});
/**
 * @swagger
 * /api/content/{entityType}/{entityId}/versions/{version}:
 *   delete:
 *     summary: Delete a version (Teacher/Admin only)
 *     tags: [Content Versioning]
 */
router.delete('/content/:entityType/:entityId/versions/:version', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({
    params: zod_1.z.object({
        entityType: zod_1.z.enum(['course', 'lesson', 'quiz', 'assignment']),
        entityId: zod_1.z.string().min(1),
        version: zod_1.z.string().transform(val => parseInt(val)),
    }),
}), async (req, res) => {
    try {
        const { entityType, entityId, version } = req.params;
        const versionNum = typeof version === 'string' ? parseInt(version) : version;
        await versioningService.deleteVersion(entityType, entityId, versionNum);
        res.json({
            success: true,
            message: 'Version deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting version:', error);
        res.status(500).json({ error: error.message || 'Failed to delete version' });
    }
});
exports.default = router;
