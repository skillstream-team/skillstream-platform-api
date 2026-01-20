"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/collections/{collectionId}/marketing:
 *   get:
 *     summary: Get collection details with marketing context
 *     tags: [Marketing]
 */
router.get('/collections/:collectionId/marketing', auth_1.requireAuth, async (req, res) => {
    try {
        const { collectionId } = req.params;
        const collection = await prisma_1.prisma.collection.findUnique({
            where: { id: collectionId },
            include: {
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                enrollments: true,
                modules: {
                    where: { isPublished: true },
                    orderBy: { order: 'asc' }
                },
                progress: {
                    select: { status: true }
                }
            }
        });
        if (!collection) {
            return res.status(404).json({ error: 'Collection not found' });
        }
        // Calculate marketing stats
        const totalEnrollments = collection.enrollments.length;
        const completedCount = collection.progress.filter((p) => p.status === 'completed').length;
        const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;
        // Get recent enrollments (for trend analysis)
        const recentEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: { collectionId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        // Calculate enrollment trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEnrollmentsCount = await prisma_1.prisma.enrollment.count({
            where: {
                collectionId,
                createdAt: { gte: thirtyDaysAgo }
            }
        });
        res.json({
            success: true,
            data: {
                ...collection,
                marketing: {
                    totalEnrollments,
                    completedCount,
                    completionRate,
                    recentEnrollmentsCount,
                    recentEnrollments,
                    clicks: 0, // Implement tracking if needed
                    enrollmentsFromCampaigns: 0 // Implement campaign tracking if needed
                }
            }
        });
    }
    catch (error) {
        console.error('Error fetching marketing details:', error);
        res.status(500).json({ error: 'Failed to fetch marketing details' });
    }
});
exports.default = router;
