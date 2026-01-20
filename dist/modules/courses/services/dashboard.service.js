"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class DashboardService {
    /**
     * Get comprehensive dashboard data for a student
     */
    async getStudentDashboard(userId) {
        const cacheKey = `dashboard:${userId}`;
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        // Get all enrollments with progress
        const enrollments = await prisma_1.prisma.enrollment.findMany({
            where: { studentId: userId },
            include: {
                collection: {
                    include: {
                        _count: {
                            select: {
                                collectionLessons: true,
                                modules: true,
                            },
                        },
                    },
                },
            },
        });
        // Get progress for all enrolled collections
        const collectionIds = enrollments.map((e) => e.collectionId);
        const progressRecords = await prisma_1.prisma.progress.findMany({
            where: {
                studentId: userId,
                collectionId: { in: collectionIds },
            },
            orderBy: { lastAccessed: 'desc' },
        });
        // Calculate progress per collection
        const enrolledCourses = await Promise.all(enrollments.map(async (enrollment) => {
            const collectionProgress = progressRecords.filter((p) => p.collectionId === enrollment.collectionId);
            const completed = collectionProgress.filter((p) => p.status === 'completed' || p.status === 'passed').length;
            const total = enrollment.collection._count.collectionLessons + enrollment.collection._count.modules;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            // Get next lesson (from collection lessons)
            const collectionLessons = await prisma_1.prisma.collectionLesson.findMany({
                where: { collectionId: enrollment.collectionId },
                include: { lesson: true },
                orderBy: { order: 'asc' },
            });
            const completedLessonIds = collectionProgress
                .filter((p) => p.type === 'lesson' && p.status === 'completed')
                .map((p) => p.itemId);
            const nextLessonData = collectionLessons.find((cl) => !completedLessonIds.includes(cl.lessonId));
            const lastProgress = collectionProgress[0];
            return {
                id: enrollment.collection.id,
                title: enrollment.collection.title,
                thumbnailUrl: enrollment.collection.thumbnailUrl || undefined,
                progress: Math.round(progress),
                lastAccessed: lastProgress?.lastAccessed,
                nextLesson: nextLessonData ? {
                    id: nextLessonData.lesson.id,
                    title: nextLessonData.lesson.title,
                } : undefined,
            };
        }));
        // Get upcoming deadlines (assignments and quizzes)
        const now = new Date();
        const upcomingAssignments = await prisma_1.prisma.assignment.findMany({
            where: {
                collectionId: { in: collectionIds },
                dueDate: { gte: now },
                isPublished: true,
            },
            include: {
                collection: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { dueDate: 'asc' },
            take: 10,
        });
        const upcomingDeadlines = upcomingAssignments.map((assignment) => ({
            id: assignment.id,
            type: 'assignment',
            title: assignment.title,
            collectionId: assignment.collection.id,
            collectionTitle: assignment.collection.title,
            dueDate: assignment.dueDate,
        }));
        // Get recent activity
        const recentActivity = await prisma_1.prisma.progress.findMany({
            where: { studentId: userId },
            include: {
                collection: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
            orderBy: { lastAccessed: 'desc' },
            take: 10,
        });
        const activity = recentActivity.map((p) => ({
            id: p.id,
            type: p.type,
            title: `${p.type} activity`,
            collectionId: p.collection.id,
            collectionTitle: p.collection.title,
            timestamp: p.lastAccessed,
        }));
        // Get recommendations (using existing recommendation service logic)
        const recommendations = await prisma_1.prisma.collectionRecommendation.findMany({
            where: { userId },
            include: {
                collection: {
                    include: {
                        _count: {
                            select: {
                                reviews: true,
                            },
                        },
                    },
                },
            },
            orderBy: { score: 'desc' },
            take: 5,
        });
        // Calculate average ratings for recommendations
        const recCollectionIds = recommendations.map((r) => r.collection.id);
        const recReviews = await prisma_1.prisma.collectionReview.findMany({
            where: {
                collectionId: { in: recCollectionIds },
                isPublished: true,
            },
            select: {
                collectionId: true,
                rating: true,
            },
        });
        const ratingsMap = new Map();
        for (const collectionId of recCollectionIds) {
            const collectionReviews = recReviews.filter((r) => r.collectionId === collectionId);
            const average = collectionReviews.length > 0
                ? collectionReviews.reduce((sum, r) => sum + r.rating, 0) / collectionReviews.length
                : 0;
            ratingsMap.set(collectionId, Math.round(average * 10) / 10);
        }
        const recs = recommendations.map((rec) => ({
            id: rec.collection.id,
            title: rec.collection.title,
            thumbnailUrl: rec.collection.thumbnailUrl || undefined,
            difficulty: rec.collection.difficulty || undefined,
            averageRating: ratingsMap.get(rec.collection.id) || 0,
        }));
        // Get statistics
        const certificates = await prisma_1.prisma.certificate.count({
            where: { studentId: userId },
        });
        const userPoints = await prisma_1.prisma.userPoints.findUnique({
            where: { userId },
            select: {
                totalPoints: true,
                currentLevel: true,
            },
        });
        // Calculate average score
        const quizAttempts = await prisma_1.prisma.quizAttempt.findMany({
            where: { studentId: userId },
            select: {
                percentage: true,
            },
        });
        const averageScore = quizAttempts.length > 0
            ? quizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / quizAttempts.length
            : 0;
        const completedCourses = enrolledCourses.filter((c) => c.progress === 100).length;
        const statistics = {
            totalCourses: enrollments.length,
            completedCourses,
            inProgressCourses: enrollments.length - completedCourses,
            totalCertificates: certificates,
            totalPoints: userPoints?.totalPoints || 0,
            currentLevel: userPoints?.currentLevel || 1,
            averageScore: Math.round(averageScore * 10) / 10,
        };
        // Get recent achievements
        const achievements = await prisma_1.prisma.achievement.findMany({
            where: { studentId: userId },
            select: {
                id: true,
                badgeName: true,
                badgeIcon: true,
                earnedAt: true,
            },
            orderBy: { earnedAt: 'desc' },
            take: 5,
        });
        const dashboardData = {
            enrolledCourses,
            upcomingDeadlines,
            recentActivity: activity,
            recommendations: recs,
            statistics,
            achievements: achievements.map((a) => ({
                id: a.id,
                badgeName: a.badgeName,
                badge: {
                    name: a.badgeName,
                    description: undefined,
                    icon: a.badgeIcon || undefined,
                },
                earnedAt: a.earnedAt,
            })),
        };
        // Cache for 5 minutes
        await (0, cache_1.setCache)(cacheKey, dashboardData, cache_1.CACHE_TTL.SHORT);
        return dashboardData;
    }
    /**
     * Clear dashboard cache for a user
     */
    async clearDashboardCache(userId) {
        const cacheKey = `dashboard:${userId}`;
        // Cache clearing is handled by the cache utility
    }
}
exports.DashboardService = DashboardService;
