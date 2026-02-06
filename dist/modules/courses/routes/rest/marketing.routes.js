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
router.get('/programs/:programId/marketing', auth_1.requireAuth, async (req, res) => {
    try {
        const { programId } = req.params;
        const program = await prisma_1.prisma.program.findUnique({
            where: { id: programId },
            include: {
                instructor: {
                    select: { id: true, username: true, email: true }
                },
                enrollments: true,
                programModules: {
                    include: {
                        module: {
                            select: { id: true, title: true, order: true }
                        }
                    },
                    orderBy: { order: 'asc' }
                },
                progress: {
                    select: { status: true }
                }
            }
        });
        if (!program) {
            return res.status(404).json({ error: 'Program not found' });
        }
        // Calculate marketing stats
        const totalEnrollments = program.enrollments?.length || 0;
        const completedCount = program.progress?.filter((p) => p.status === 'completed').length || 0;
        const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;
        // Get recent enrollments (for trend analysis)
        const recentEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: { programId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        // Calculate enrollment trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEnrollmentsCount = await prisma_1.prisma.enrollment.count({
            where: {
                programId,
                createdAt: { gte: thirtyDaysAgo }
            }
        });
        res.json({
            success: true,
            data: {
                ...program,
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
