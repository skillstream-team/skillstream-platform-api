"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const logger_1 = require("../../../../utils/logger");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/announcements:
 *   get:
 *     summary: Get announcements (global or filtered)
 *     tags: [Announcements]
 *     parameters:
 *       - in: query
 *         name: scope
 *         schema:
 *           type: string
 *           enum: [global, course, user]
 *         description: Scope of announcements
 *       - in: query
 *         name: collectionId
 *         schema:
 *           type: string
 *         description: Collection ID for collection-scoped announcements
 *     responses:
 *       200:
 *         description: Announcements retrieved successfully
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const { scope = 'global', programId: programIdQuery } = req.query;
        const userId = req.user?.id;
        const where = {
            isActive: true,
            AND: [
                {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            ]
        };
        if (scope === 'global') {
            where.scope = 'global';
        }
        else if (scope === 'course' && programIdQuery) {
            where.scope = 'course';
            where.programId = programIdQuery;
        }
        else if (scope === 'user' && userId) {
            const programIds = await getUserProgramIds(userId);
            where.AND.push({
                OR: [
                    { scope: 'global' },
                    { scope: 'user', targetUserId: userId },
                    { scope: 'course', programId: { in: programIds } }
                ]
            });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const [announcements, total] = await Promise.all([
            prisma_1.prisma.announcement.findMany({
                where,
                skip,
                take: limit,
                include: {
                    creator: {
                        select: { id: true, username: true, email: true }
                    },
                    program: {
                        select: { id: true, title: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.announcement.count({ where }),
        ]);
        res.json({
            success: true,
            data: announcements,
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
        logger_1.logger.error('Error fetching announcements', error);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/announcements:
 *   get:
 *     summary: Get announcements relevant to a user
 *     tags: [Announcements]
 */
router.get('/users/:userId/announcements', auth_1.requireAuth, async (req, res) => {
    try {
        const { userId } = req.params;
        // Get user's enrolled collection IDs
        const programIds = await getUserProgramIds(userId);
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const where = {
            isActive: true,
            AND: [
                {
                    OR: [
                        { scope: 'global' },
                        { scope: 'user', targetUserId: userId },
                        { scope: 'course', programId: { in: programIds } }
                    ]
                },
                {
                    OR: [
                        { expiresAt: null },
                        { expiresAt: { gt: new Date() } }
                    ]
                }
            ]
        };
        const [announcements, total] = await Promise.all([
            prisma_1.prisma.announcement.findMany({
                where,
                skip,
                take: limit,
                include: {
                    creator: {
                        select: { id: true, username: true, email: true }
                    },
                    program: {
                        select: { id: true, title: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.announcement.count({ where }),
        ]);
        res.json({
            success: true,
            data: announcements,
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
        logger_1.logger.error('Error fetching user announcements', error);
        res.status(500).json({ error: 'Failed to fetch user announcements' });
    }
});
/**
 * @swagger
 * /api/programs/{programId}/announcements:
 *   get:
 *     summary: Get announcements for a program
 *     tags: [Announcements]
 */
router.get('/programs/:programId/announcements', auth_1.requireAuth, async (req, res) => {
    try {
        const programId = req.params.programId;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const where = {
            programId,
            isActive: true,
            OR: [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ]
        };
        const [announcements, total] = await Promise.all([
            prisma_1.prisma.announcement.findMany({
                where,
                skip,
                take: limit,
                include: {
                    creator: {
                        select: { id: true, username: true, email: true }
                    },
                    program: {
                        select: { id: true, title: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }),
            prisma_1.prisma.announcement.count({ where }),
        ]);
        res.json({
            success: true,
            data: announcements,
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
        logger_1.logger.error('Error fetching program announcements', error);
        res.status(500).json({ error: 'Failed to fetch program announcements' });
    }
});
async function getUserProgramIds(userId) {
    const enrollments = await prisma_1.prisma.enrollment.findMany({
        where: { studentId: userId },
        select: { programId: true }
    });
    return enrollments.map(e => e.programId);
}
exports.default = router;
