"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const collaboration_service_1 = require("../../services/collaboration.service");
const waitlist_service_1 = require("../../services/waitlist.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const collaborationService = new collaboration_service_1.CollaborationService();
const waitlistService = new waitlist_service_1.WaitlistService();
/**
 * @swagger
 * /api/study-groups:
 *   post:
 *     summary: Create a study group
 *     tags: [Collaboration]
 */
const createGroupSchema = zod_1.z.object({
    courseId: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    maxMembers: zod_1.z.number().int().min(2).max(50).optional(),
    isPublic: zod_1.z.boolean().optional(),
});
router.post('/study-groups', auth_1.requireAuth, (0, validation_1.validate)({ body: createGroupSchema }), async (req, res) => {
    try {
        const createdBy = req.user?.id;
        const group = await collaborationService.createStudyGroup({
            createdBy,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: group,
            message: 'Study group created successfully'
        });
    }
    catch (error) {
        console.error('Error creating study group:', error);
        res.status(500).json({ error: error.message || 'Failed to create study group' });
    }
});
/**
 * @swagger
 * /api/study-groups:
 *   get:
 *     summary: Get study groups
 *     tags: [Collaboration]
 */
router.get('/study-groups', (0, validation_1.validate)({
    query: zod_1.z.object({
        courseId: zod_1.z.string().optional(),
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
    }),
}), async (req, res) => {
    try {
        const courseId = req.query.courseId;
        const userId = req.user?.id;
        const page = typeof req.query.page === 'number' ? req.query.page : 1;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
        const result = await collaborationService.getStudyGroups(courseId, userId, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching study groups:', error);
        res.status(500).json({ error: 'Failed to fetch study groups' });
    }
});
/**
 * @swagger
 * /api/study-groups/{groupId}/join:
 *   post:
 *     summary: Join a study group
 *     tags: [Collaboration]
 */
router.post('/study-groups/:groupId/join', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ groupId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;
        await collaborationService.joinStudyGroup(groupId, userId);
        res.json({
            success: true,
            message: 'Joined study group successfully'
        });
    }
    catch (error) {
        console.error('Error joining study group:', error);
        res.status(500).json({ error: error.message || 'Failed to join study group' });
    }
});
/**
 * @swagger
 * /api/study-groups/{groupId}/leave:
 *   post:
 *     summary: Leave a study group
 *     tags: [Collaboration]
 */
router.post('/study-groups/:groupId/leave', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ groupId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { groupId } = req.params;
        const userId = req.user?.id;
        await collaborationService.leaveStudyGroup(groupId, userId);
        res.json({
            success: true,
            message: 'Left study group successfully'
        });
    }
    catch (error) {
        console.error('Error leaving study group:', error);
        res.status(500).json({ error: error.message || 'Failed to leave study group' });
    }
});
/**
 * @swagger
 * /api/study-groups/{groupId}/projects:
 *   post:
 *     summary: Create a group project
 *     tags: [Collaboration]
 */
const createProjectSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    dueDate: zod_1.z.string().optional().transform(val => val ? new Date(val) : undefined),
});
router.post('/study-groups/:groupId/projects', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ groupId: zod_1.z.string().min(1) }),
    body: createProjectSchema,
}), async (req, res) => {
    try {
        const { groupId } = req.params;
        const createdBy = req.user?.id;
        const project = await collaborationService.createGroupProject({
            groupId,
            createdBy,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: project,
            message: 'Project created successfully'
        });
    }
    catch (error) {
        console.error('Error creating project:', error);
        res.status(500).json({ error: error.message || 'Failed to create project' });
    }
});
/**
 * @swagger
 * /api/study-groups/{groupId}/projects:
 *   get:
 *     summary: Get group projects
 *     tags: [Collaboration]
 */
router.get('/study-groups/:groupId/projects', (0, validation_1.validate)({ params: zod_1.z.object({ groupId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { groupId } = req.params;
        const projects = await collaborationService.getGroupProjects(groupId);
        res.json({
            success: true,
            data: projects
        });
    }
    catch (error) {
        console.error('Error fetching projects:', error);
        res.status(500).json({ error: 'Failed to fetch projects' });
    }
});
/**
 * @swagger
 * /api/workspaces:
 *   post:
 *     summary: Create a shared workspace
 *     tags: [Collaboration]
 */
const createWorkspaceSchema = zod_1.z.object({
    groupId: zod_1.z.string().optional(),
    courseId: zod_1.z.string().optional(),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    type: zod_1.z.enum(['document', 'whiteboard', 'code']),
    content: zod_1.z.any().optional(),
    isPublic: zod_1.z.boolean().optional(),
});
router.post('/workspaces', auth_1.requireAuth, (0, validation_1.validate)({ body: createWorkspaceSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        const workspace = await collaborationService.createSharedWorkspace({
            userId,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: workspace,
            message: 'Workspace created successfully'
        });
    }
    catch (error) {
        console.error('Error creating workspace:', error);
        res.status(500).json({ error: error.message || 'Failed to create workspace' });
    }
});
/**
 * @swagger
 * /api/workspaces:
 *   get:
 *     summary: Get shared workspaces
 *     tags: [Collaboration]
 */
router.get('/workspaces', (0, validation_1.validate)({
    query: zod_1.z.object({
        groupId: zod_1.z.string().optional(),
        courseId: zod_1.z.string().optional(),
    }),
}), async (req, res) => {
    try {
        const groupId = req.query.groupId;
        const courseId = req.query.courseId;
        const userId = req.user?.id;
        const workspaces = await collaborationService.getSharedWorkspaces(groupId, courseId, userId);
        res.json({
            success: true,
            data: workspaces
        });
    }
    catch (error) {
        console.error('Error fetching workspaces:', error);
        res.status(500).json({ error: 'Failed to fetch workspaces' });
    }
});
/**
 * @swagger
 * /api/workspaces/{workspaceId}:
 *   put:
 *     summary: Update shared workspace
 *     tags: [Collaboration]
 */
router.put('/workspaces/:workspaceId', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ workspaceId: zod_1.z.string().min(1) }),
    body: createWorkspaceSchema.partial(),
}), async (req, res) => {
    try {
        const { workspaceId } = req.params;
        const userId = req.user?.id;
        const workspace = await collaborationService.updateSharedWorkspace(workspaceId, userId, req.body);
        res.json({
            success: true,
            data: workspace,
            message: 'Workspace updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating workspace:', error);
        res.status(500).json({ error: error.message || 'Failed to update workspace' });
    }
});
/**
 * @swagger
 * /api/waitlist:
 *   post:
 *     summary: Join waitlist
 *     tags: [Waitlist]
 */
router.post('/waitlist', auth_1.requireAuth, (0, validation_1.validate)({
    body: zod_1.z.object({
        courseId: zod_1.z.string().optional(),
        eventId: zod_1.z.string().optional(),
    }),
}), async (req, res) => {
    try {
        const userId = req.user?.id;
        const entry = await waitlistService.joinWaitlist({
            userId,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: entry,
            message: 'Added to waitlist successfully'
        });
    }
    catch (error) {
        console.error('Error joining waitlist:', error);
        res.status(500).json({ error: error.message || 'Failed to join waitlist' });
    }
});
/**
 * @swagger
 * /api/waitlist:
 *   get:
 *     summary: Get waitlist
 *     tags: [Waitlist]
 */
router.get('/waitlist', (0, validation_1.validate)({
    query: zod_1.z.object({
        courseId: zod_1.z.string().optional(),
        eventId: zod_1.z.string().optional(),
    }),
}), async (req, res) => {
    try {
        const courseId = req.query.courseId;
        const eventId = req.query.eventId;
        const waitlist = await waitlistService.getWaitlist(courseId, eventId);
        res.json({
            success: true,
            data: waitlist
        });
    }
    catch (error) {
        console.error('Error fetching waitlist:', error);
        res.status(500).json({ error: 'Failed to fetch waitlist' });
    }
});
/**
 * @swagger
 * /api/waitlist:
 *   delete:
 *     summary: Leave waitlist
 *     tags: [Waitlist]
 */
router.delete('/waitlist', auth_1.requireAuth, (0, validation_1.validate)({
    query: zod_1.z.object({
        courseId: zod_1.z.string().optional(),
        eventId: zod_1.z.string().optional(),
    }),
}), async (req, res) => {
    try {
        const courseId = req.query.courseId;
        const eventId = req.query.eventId;
        const userId = req.user?.id;
        await waitlistService.leaveWaitlist(courseId || null, eventId || null, userId);
        res.json({
            success: true,
            message: 'Removed from waitlist successfully'
        });
    }
    catch (error) {
        console.error('Error leaving waitlist:', error);
        res.status(500).json({ error: error.message || 'Failed to leave waitlist' });
    }
});
exports.default = router;
