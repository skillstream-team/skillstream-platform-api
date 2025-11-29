"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const prisma_1 = require("../../../../utils/prisma");
const router = (0, express_1.Router)();
/**
 * @swagger
 * /api/courses/{courseId}/marketing:
 *   get:
 *     summary: Get course details with marketing context
 *     tags: [Marketing]
 */
router.get('/courses/:courseId/marketing', auth_1.requireAuth, async (req, res) => {
    try {
        const { courseId } = req.params;
        const course = await prisma_1.prisma.course.findUnique({
            where: { id: courseId },
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
        if (!course) {
            return res.status(404).json({ error: 'Course not found' });
        }
        // Calculate marketing stats
        const totalEnrollments = course.enrollments.length;
        const completedCount = course.progress.filter(p => p.status === 'completed').length;
        const completionRate = totalEnrollments > 0 ? (completedCount / totalEnrollments) * 100 : 0;
        // Get recent enrollments (for trend analysis)
        const recentEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: { courseId },
            orderBy: { createdAt: 'desc' },
            take: 10
        });
        // Calculate enrollment trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentEnrollmentsCount = await prisma_1.prisma.enrollment.count({
            where: {
                courseId,
                createdAt: { gte: thirtyDaysAgo }
            }
        });
        res.json({
            success: true,
            data: {
                ...course,
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
