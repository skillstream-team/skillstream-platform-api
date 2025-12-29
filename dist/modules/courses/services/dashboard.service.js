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
                course: {
                    include: {
                        _count: {
                            select: {
                                lessons: true,
                                modules: true,
                            },
                        },
                    },
                },
            },
        });
        // Get progress for all enrolled courses
        const courseIds = enrollments.map((e) => e.courseId);
        const progressRecords = await prisma_1.prisma.progress.findMany({
            where: {
                studentId: userId,
                courseId: { in: courseIds },
            },
            orderBy: { lastAccessed: 'desc' },
        });
        // Calculate progress per course
        const enrolledCourses = await Promise.all(enrollments.map(async (enrollment) => {
            const courseProgress = progressRecords.filter((p) => p.courseId === enrollment.courseId);
            const completed = courseProgress.filter((p) => p.status === 'completed' || p.status === 'passed').length;
            const total = enrollment.course._count.lessons + enrollment.course._count.modules;
            const progress = total > 0 ? (completed / total) * 100 : 0;
            // Get next lesson
            const nextLesson = await prisma_1.prisma.lesson.findFirst({
                where: {
                    courseId: enrollment.courseId,
                    id: {
                        notIn: courseProgress
                            .filter((p) => p.type === 'lesson' && p.status === 'completed')
                            .map((p) => p.itemId),
                    },
                },
                orderBy: { order: 'asc' },
                select: {
                    id: true,
                    title: true,
                },
            });
            const lastProgress = courseProgress[0];
            return {
                id: enrollment.course.id,
                title: enrollment.course.title,
                thumbnailUrl: enrollment.course.thumbnailUrl || undefined,
                progress: Math.round(progress),
                lastAccessed: lastProgress?.lastAccessed,
                nextLesson: nextLesson || undefined,
            };
        }));
        // Get upcoming deadlines (assignments and quizzes)
        const now = new Date();
        const upcomingAssignments = await prisma_1.prisma.assignment.findMany({
            where: {
                courseId: { in: courseIds },
                dueDate: { gte: now },
                isPublished: true,
            },
            include: {
                course: {
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
            courseId: assignment.course.id,
            courseTitle: assignment.course.title,
            dueDate: assignment.dueDate,
        }));
        // Get recent activity
        const recentActivity = await prisma_1.prisma.progress.findMany({
            where: { studentId: userId },
            include: {
                course: {
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
            courseId: p.course.id,
            courseTitle: p.course.title,
            timestamp: p.lastAccessed,
        }));
        // Get recommendations (using existing recommendation service logic)
        const recommendations = await prisma_1.prisma.courseRecommendation.findMany({
            where: { userId },
            include: {
                course: {
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
        const recCourseIds = recommendations.map((r) => r.course.id);
        const recReviews = await prisma_1.prisma.courseReview.findMany({
            where: {
                courseId: { in: recCourseIds },
                isPublished: true,
            },
            select: {
                courseId: true,
                rating: true,
            },
        });
        const ratingsMap = new Map();
        for (const courseId of recCourseIds) {
            const courseReviews = recReviews.filter((r) => r.courseId === courseId);
            const average = courseReviews.length > 0
                ? courseReviews.reduce((sum, r) => sum + r.rating, 0) / courseReviews.length
                : 0;
            ratingsMap.set(courseId, Math.round(average * 10) / 10);
        }
        const recs = recommendations.map((rec) => ({
            id: rec.course.id,
            title: rec.course.title,
            thumbnailUrl: rec.course.thumbnailUrl || undefined,
            difficulty: rec.course.difficulty || undefined,
            averageRating: ratingsMap.get(rec.course.id) || 0,
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
