"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const whiteboard_service_1 = require("../../services/whiteboard.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const whiteboardService = new whiteboard_service_1.WhiteboardService();
/**
 * @swagger
 * /api/whiteboards:
 *   post:
 *     summary: Create a new whiteboard
 *     tags: [Whiteboards]
 */
const createWhiteboardSchema = zod_1.z.object({
    courseId: zod_1.z.string().optional(),
    liveStreamId: zod_1.z.string().optional(),
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    backgroundColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    width: zod_1.z.number().int().min(100).max(10000).optional(),
    height: zod_1.z.number().int().min(100).max(10000).optional(),
    isPublic: zod_1.z.boolean().optional(),
}).refine(data => data.courseId || data.liveStreamId, {
    message: "Either courseId or liveStreamId must be provided",
});
router.post('/', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({ body: createWhiteboardSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const whiteboard = await whiteboardService.createWhiteboard(req.body, userId);
        res.status(201).json({
            success: true,
            data: whiteboard
        });
    }
    catch (error) {
        console.error('Error creating whiteboard:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to create whiteboard'
        });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   get:
 *     summary: Get whiteboard by ID
 *     tags: [Whiteboards]
 */
router.get('/:whiteboardId', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const includeActions = req.query.includeActions === 'true';
        const whiteboard = await whiteboardService.getWhiteboardById(req.params.whiteboardId, includeActions);
        res.json({
            success: true,
            data: whiteboard
        });
    }
    catch (error) {
        console.error('Error fetching whiteboard:', error);
        res.status(404).json({
            error: error instanceof Error ? error.message : 'Whiteboard not found'
        });
    }
});
/**
 * @swagger
 * /api/whiteboards/courses/{courseId}:
 *   get:
 *     summary: Get whiteboards for a course
 *     tags: [Whiteboards]
 */
router.get('/courses/:courseId', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ courseId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await whiteboardService.getCollectionWhiteboards(req.params.courseId, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching course whiteboards:', error);
        res.status(500).json({ error: 'Failed to fetch whiteboards' });
    }
});
/**
 * @swagger
 * /api/whiteboards/streams/{liveStreamId}:
 *   get:
 *     summary: Get whiteboards for a live stream
 *     tags: [Whiteboards]
 */
router.get('/streams/:liveStreamId', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ liveStreamId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const whiteboards = await whiteboardService.getStreamWhiteboards(req.params.liveStreamId);
        res.json({
            success: true,
            data: whiteboards
        });
    }
    catch (error) {
        console.error('Error fetching stream whiteboards:', error);
        res.status(500).json({ error: 'Failed to fetch whiteboards' });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   put:
 *     summary: Update whiteboard
 *     tags: [Whiteboards]
 */
const updateWhiteboardSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().max(5000).optional(),
    backgroundColor: zod_1.z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    isActive: zod_1.z.boolean().optional(),
    isPublic: zod_1.z.boolean().optional(),
});
router.put('/:whiteboardId', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }),
    body: updateWhiteboardSchema
}), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const whiteboard = await whiteboardService.updateWhiteboard(req.params.whiteboardId, userId, req.body);
        res.json({
            success: true,
            data: whiteboard
        });
    }
    catch (error) {
        console.error('Error updating whiteboard:', error);
        res.status(403).json({
            error: error instanceof Error ? error.message : 'Failed to update whiteboard'
        });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   delete:
 *     summary: Delete whiteboard
 *     tags: [Whiteboards]
 */
router.delete('/:whiteboardId', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({ params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await whiteboardService.deleteWhiteboard(req.params.whiteboardId, userId);
        res.json({
            success: true,
            message: 'Whiteboard deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting whiteboard:', error);
        res.status(403).json({
            error: error instanceof Error ? error.message : 'Failed to delete whiteboard'
        });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/actions:
 *   post:
 *     summary: Add action to whiteboard
 *     tags: [Whiteboards]
 */
const createActionSchema = zod_1.z.object({
    actionType: zod_1.z.enum(['draw', 'erase', 'clear', 'undo', 'redo', 'add_text', 'add_shape']),
    data: zod_1.z.any(), // Flexible JSON structure for different action types
});
router.post('/:whiteboardId/actions', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }),
    body: createActionSchema
}), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const action = await whiteboardService.addAction({
            whiteboardId: req.params.whiteboardId,
            ...req.body
        }, userId);
        res.status(201).json({
            success: true,
            data: action
        });
    }
    catch (error) {
        console.error('Error adding whiteboard action:', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Failed to add action'
        });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/actions:
 *   get:
 *     summary: Get whiteboard actions
 *     tags: [Whiteboards]
 */
router.get('/:whiteboardId/actions', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 1000;
        const actions = await whiteboardService.getWhiteboardActions(req.params.whiteboardId, limit);
        res.json({
            success: true,
            data: actions
        });
    }
    catch (error) {
        console.error('Error fetching whiteboard actions:', error);
        res.status(500).json({ error: 'Failed to fetch actions' });
    }
});
/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/clear:
 *   post:
 *     summary: Clear whiteboard (delete all actions)
 *     tags: [Whiteboards]
 */
router.post('/:whiteboardId/clear', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({ params: zod_1.z.object({ whiteboardId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        await whiteboardService.clearWhiteboard(req.params.whiteboardId, userId);
        res.json({
            success: true,
            message: 'Whiteboard cleared successfully'
        });
    }
    catch (error) {
        console.error('Error clearing whiteboard:', error);
        res.status(403).json({
            error: error instanceof Error ? error.message : 'Failed to clear whiteboard'
        });
    }
});
exports.default = router;
