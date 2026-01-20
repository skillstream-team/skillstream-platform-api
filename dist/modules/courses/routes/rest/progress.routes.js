"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const learning_service_1 = require("../../services/learning.service");
const enrollment_service_1 = require("../../services/enrollment.service");
const auth_1 = require("../../../../middleware/auth");
const subscription_1 = require("../../../../middleware/subscription");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
const learningService = new learning_service_1.LearningService();
const enrollmentService = new enrollment_service_1.EnrollmentService();
/**
 * @swagger
 * /api/users/{userId}/progress:
 *   get:
 *     summary: Get all course progress for a user
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       404:
 *         description: User not found
 */
router.get('/users/:userId/progress', auth_1.requireAuth, subscription_1.requireSubscription, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        // Get all enrollments for the user
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { studentId: userId },
            select: { collectionId: true, collection: { select: { id: true, title: true } } }
        });
        // Get progress for each enrollment (with pagination per course)
        const progressData = await Promise.all(enrollments.map(async (enrollment) => {
            const [progress, total] = await Promise.all([
                prisma_1.prisma.progress.findMany({
                    where: {
                        studentId: userId,
                        collectionId: enrollment.collectionId
                    },
                    skip,
                    take: limit,
                    select: {
                        id: true,
                        status: true,
                        progress: true,
                        score: true,
                        timeSpent: true,
                        lastAccessed: true,
                        completedAt: true,
                        collection: { select: { id: true, title: true } },
                        module: { select: { id: true, title: true } }
                    },
                    orderBy: { lastAccessed: 'desc' }
                }),
                prisma_1.prisma.progress.count({
                    where: {
                        studentId: userId,
                        collectionId: enrollment.collectionId
                    }
                })
            ]);
            return {
                collectionId: enrollment.collectionId,
                collection: enrollment.collection,
                progress: progress || [],
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                }
            };
        }));
        // Filter by status if provided
        let filteredProgress = progressData;
        if (status === 'in_progress' || status === 'completed') {
            filteredProgress = progressData.filter((item) => {
                const completedItems = item.progress.filter((p) => p.status === 'completed').length;
                const totalItems = item.progress.length;
                const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
                if (status === 'completed') {
                    return completionRate === 100;
                }
                else {
                    return completionRate < 100 && completionRate > 0;
                }
            });
        }
        res.json({
            success: true,
            data: filteredProgress,
            pagination: {
                page,
                limit,
                total: filteredProgress.reduce((sum, item) => sum + item.pagination.total, 0),
                totalPages: Math.ceil(filteredProgress.reduce((sum, item) => sum + item.pagination.total, 0) / limit),
                hasNext: page * limit < filteredProgress.reduce((sum, item) => sum + item.pagination.total, 0),
                hasPrev: page > 1,
            }
        });
    }
    catch (error) {
        console.error('Error fetching user progress:', error);
        res.status(500).json({ error: 'Failed to fetch user progress' });
    }
});
/**
 * @swagger
 * /api/users/{userId}/progress/courses:
 *   get:
 *     summary: Get course progress filtered by status
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [in_progress, completed]
 */
router.get('/users/:userId/progress/courses', auth_1.requireAuth, subscription_1.requireSubscription, async (req, res) => {
    try {
        const { userId } = req.params;
        const { status } = req.query;
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { studentId: userId },
            select: { collectionId: true, collection: { select: { id: true, title: true } } }
        });
        const collectionsWithProgress = await Promise.all(enrollments.map(async (enrollment) => {
            const progress = await prisma_1.prisma.progress.findMany({
                where: {
                    studentId: userId,
                    collectionId: enrollment.collectionId
                },
                select: { status: true }
            });
            const completedItems = progress?.filter((p) => p.status === 'completed').length || 0;
            const totalItems = progress?.length || 0;
            const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0;
            let collectionStatus = 'not_started';
            if (completionRate === 100) {
                collectionStatus = 'completed';
            }
            else if (completionRate > 0) {
                collectionStatus = 'in_progress';
            }
            return {
                collectionId: enrollment.collectionId,
                collection: enrollment.collection,
                status: collectionStatus,
                completionRate,
                completedItems,
                totalItems
            };
        }));
        // Filter by status if provided
        let filtered = collectionsWithProgress;
        if (status === 'in_progress' || status === 'completed') {
            filtered = collectionsWithProgress.filter((item) => item.status === status);
        }
        res.json({
            success: true,
            data: filtered,
            pagination: {
                page,
                limit,
                total: filtered.length,
                totalPages: Math.ceil(filtered.length / limit),
                hasNext: page * limit < filtered.length,
                hasPrev: page > 1,
            }
        });
    }
    catch (error) {
        console.error('Error fetching course progress:', error);
        res.status(500).json({ error: 'Failed to fetch course progress' });
    }
});
/**
 * @swagger
 * /api/collections/{collectionId}/progress:
 *   get:
 *     summary: Get progress for current user in a specific collection
 *     tags: [Progress]
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 */
router.get('/collections/:collectionId/progress', auth_1.requireAuth, subscription_1.requireSubscription, async (req, res) => {
    try {
        const { collectionId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;
        const [progress, total] = await Promise.all([
            prisma_1.prisma.progress.findMany({
                where: {
                    studentId: userId,
                    collectionId: collectionId
                },
                skip,
                take: limit,
                select: {
                    id: true,
                    status: true,
                    progress: true,
                    score: true,
                    timeSpent: true,
                    lastAccessed: true,
                    completedAt: true,
                    collection: { select: { id: true, title: true } },
                    module: { select: { id: true, title: true } }
                },
                orderBy: { lastAccessed: 'desc' }
            }),
            prisma_1.prisma.progress.count({
                where: {
                    studentId: userId,
                    collectionId: collectionId
                }
            })
        ]);
        res.json({
            success: true,
            data: progress || [],
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
        console.error('Error fetching course progress:', error);
        res.status(500).json({ error: 'Failed to fetch course progress' });
    }
});
/**
 * @swagger
 * /api/progress/sync-milestone:
 *   post:
 *     summary: Sync progress milestone from Firestore to database
 *     description: Called when a user reaches a progress milestone (25%, 50%, 75%, 100%)
 *       This endpoint persists the milestone to the database for reporting and analytics
 *     tags: [Progress]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - courseId
 *               - lessonId
 *               - progressPercent
 *             properties:
 *               collectionId:
 *                 type: string
 *               lessonId:
 *                 type: string
 *               videoId:
 *                 type: string
 *               progressPercent:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *               currentTime:
 *                 type: number
 *     responses:
 *       200:
 *         description: Milestone synced successfully
 *       400:
 *         description: Invalid request
 */
router.post('/sync-milestone', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const { collectionId, lessonId, videoId, progressPercent, currentTime } = req.body;
        if (!collectionId || !lessonId || progressPercent === undefined) {
            return res.status(400).json({ error: 'Missing required fields: collectionId, lessonId, progressPercent' });
        }
        // Determine status based on progress
        let status = 'in_progress';
        if (progressPercent >= 100) {
            status = 'completed';
        }
        else if (progressPercent > 0) {
            status = 'in_progress';
        }
        else {
            status = 'not_started';
        }
        // Update or create progress record
        const progress = await prisma_1.prisma.progress.upsert({
            where: {
                studentId_collectionId_type_itemId: {
                    studentId: userId,
                    collectionId,
                    type: 'video',
                    itemId: lessonId,
                },
            },
            update: {
                progress: Math.min(progressPercent, 100),
                status,
                lastAccessed: new Date(),
                completedAt: status === 'completed' ? new Date() : undefined,
                // Update timeSpent if currentTime is provided
                ...(currentTime && {
                    timeSpent: {
                        increment: Math.floor(currentTime / 60), // Convert seconds to minutes
                    },
                }),
            },
            create: {
                studentId: userId,
                collectionId,
                type: 'video',
                itemId: lessonId,
                progress: Math.min(progressPercent, 100),
                status,
                lastAccessed: new Date(),
                completedAt: status === 'completed' ? new Date() : null,
                timeSpent: currentTime ? Math.floor(currentTime / 60) : 0,
            },
        });
        // If video progress, also update video-specific progress
        if (videoId) {
            try {
                await prisma_1.prisma.progress.upsert({
                    where: {
                        studentId_collectionId_type_itemId: {
                            studentId: userId,
                            collectionId,
                            type: 'video',
                            itemId: videoId,
                        },
                    },
                    update: {
                        progress: Math.min(progressPercent, 100),
                        status,
                        lastAccessed: new Date(),
                        completedAt: status === 'completed' ? new Date() : undefined,
                    },
                    create: {
                        studentId: userId,
                        collectionId,
                        type: 'video',
                        itemId: videoId,
                        progress: Math.min(progressPercent, 100),
                        status,
                        lastAccessed: new Date(),
                        completedAt: status === 'completed' ? new Date() : null,
                        timeSpent: currentTime ? Math.floor(currentTime / 60) : 0,
                    },
                });
            }
            catch (error) {
                // Video progress update is optional, log but don't fail
                console.warn('Failed to update video-specific progress:', error);
            }
        }
        res.json({
            success: true,
            data: progress,
        });
    }
    catch (error) {
        console.error('Error syncing progress milestone:', error);
        res.status(500).json({
            error: 'Failed to sync progress milestone',
        });
    }
});
exports.default = router;
