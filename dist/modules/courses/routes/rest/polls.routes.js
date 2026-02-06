"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const poll_service_1 = require("../../services/poll.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const prisma_1 = require("../../../../utils/prisma");
const logger_1 = require("../../../../utils/logger");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const pollService = new poll_service_1.PollService();
/**
 * @swagger
 * /api/polls:
 *   post:
 *     summary: Create a new poll
 *     tags: [Polls]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, courseId, options]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               courseId:
 *                 type: string
 *               moduleId:
 *                 type: string
 *               liveStreamId:
 *                 type: string
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 */
const createPollSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().max(5000).optional(),
    courseId: zod_1.z.string().min(1),
    moduleId: zod_1.z.string().optional(),
    liveStreamId: zod_1.z.string().optional(),
    options: zod_1.z.array(zod_1.z.string().min(1)).min(2).max(10),
});
router.post('/', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({ body: createPollSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const poll = await pollService.createPoll(req.body, userId);
        // Note: Real-time poll broadcasting is handled via Socket.IO in realtime.service.ts
        // The 'create_poll' socket event will handle broadcasting to live streams
        res.status(201).json({
            success: true,
            data: poll
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating poll', error);
        res.status(500).json({ error: 'Failed to create poll' });
    }
});
/**
 * @swagger
 * /api/polls:
 *   get:
 *     summary: Get polls (optionally filtered by courseId)
 *     tags: [Polls]
 */
router.get('/', (0, validation_1.validate)({
    query: zod_1.z.object({
        programId: zod_1.z.string().optional(),
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
        isActive: zod_1.z.string().optional().transform(val => val === 'true'),
    }),
}), async (req, res) => {
    try {
        const { programId: targetProgramId, page = 1, limit = 20, isActive } = req.query;
        const where = {};
        if (targetProgramId) {
            where.programId = targetProgramId;
        }
        if (isActive !== undefined) {
            where.isActive = isActive;
        }
        const skip = (page - 1) * limit;
        const take = limit;
        const [polls, total] = await Promise.all([
            prisma_1.prisma.poll.findMany({
                where,
                skip,
                take,
                include: {
                    options: true,
                    creator: {
                        select: { id: true, username: true, email: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.poll.count({ where })
        ]);
        res.json({
            success: true,
            polls,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1,
            }
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching polls', error);
        res.status(500).json({ error: 'Failed to fetch polls' });
    }
});
/**
 * @swagger
 * /api/polls/{pollId}:
 *   get:
 *     summary: Get a poll by ID
 *     tags: [Polls]
 */
router.get('/:pollId', (0, validation_1.validate)({ params: zod_1.z.object({ pollId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { pollId } = req.params;
        const poll = await prisma_1.prisma.poll.findUnique({
            where: { id: pollId },
            include: {
                options: true,
                creator: {
                    select: { id: true, username: true, email: true }
                }
            }
        });
        if (!poll) {
            return res.status(404).json({ error: 'Poll not found' });
        }
        res.json({
            success: true,
            data: poll
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching poll', error);
        res.status(500).json({ error: 'Failed to fetch poll' });
    }
});
/**
 * @swagger
 * /api/polls/{pollId}/respond:
 *   post:
 *     summary: Respond to a poll
 *     tags: [Polls]
 */
const respondToPollSchema = zod_1.z.object({
    optionId: zod_1.z.string().min(1),
});
router.post('/:pollId/respond', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ pollId: zod_1.z.string().min(1) }), body: respondToPollSchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { pollId } = req.params;
        const { optionId } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const response = await pollService.respondToPoll(pollId, optionId, userId);
        res.json({
            success: true,
            data: response
        });
    }
    catch (error) {
        logger_1.logger.error('Error responding to poll', error);
        res.status(500).json({ error: 'Failed to respond to poll' });
    }
});
/**
 * @swagger
 * /api/polls/{pollId}/results:
 *   get:
 *     summary: Get poll results
 *     tags: [Polls]
 */
router.get('/:pollId/results', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ pollId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { pollId } = req.params;
        const results = await pollService.getPollResults(pollId);
        if (!results) {
            return res.status(404).json({ error: 'Poll not found' });
        }
        res.json({
            success: true,
            data: results
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching poll results', error);
        res.status(500).json({ error: 'Failed to fetch poll results' });
    }
});
exports.default = router;
