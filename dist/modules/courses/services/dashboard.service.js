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
                program: {
                    include: {
                        _count: {
                            select: {
                                programModules: true,
                                sections: true,
                            },
                        },
                    },
                },
            },
        });
        // Get progress for all enrolled programs
        const programIds = enrollments.map((e) => e.programId).filter(Boolean);
        const progressRecords = await prisma_1.prisma.progress.findMany({
            where: {
                studentId: userId,
                programId: { in: programIds },
            },
            orderBy: { lastAccessed: 'desc' },
        });
        // Calculate progress per program
        const enrolledCourses = await Promise.all(enrollments.map(async (enrollment) => {
            const program = enrollment.program;
            const programId = enrollment.programId;
            const programProgress = progressRecords.filter((p) => p.programId === programId);
            const completed = programProgress.filter((p) => p.status === 'completed' || p.status === 'passed').length;
            const total = (program?._count?.programModules || 0) + (program?._count?.sections || 0);
            const progress = total > 0 ? (completed / total) * 100 : 0;
            // Get next module (from program modules)
            const programModules = await prisma_1.prisma.programModule.findMany({
                where: { programId },
                include: { module: true },
                orderBy: { order: 'asc' },
            });
            const completedModuleIds = programProgress
                .filter((p) => p.type === 'module' && p.status === 'completed')
                .map((p) => p.itemId);
            const nextModuleData = programModules.find((pm) => !completedModuleIds.includes(pm.moduleId));
            const lastProgress = programProgress[0];
            return {
                id: program?.id || programId,
                title: program?.title || '',
                thumbnailUrl: program?.thumbnailUrl || undefined,
                progress: Math.round(progress),
                lastAccessed: lastProgress?.lastAccessed,
                nextLesson: nextModuleData ? {
                    id: nextModuleData.module.id,
                    title: nextModuleData.module.title,
                } : undefined,
            };
        }));
        // Get upcoming deadlines (assignments and quizzes)
        const now = new Date();
        const upcomingAssignments = await prisma_1.prisma.assignment.findMany({
            where: {
                programId: { in: programIds },
                dueDate: { gte: now },
                isPublished: true,
            },
            include: {
                program: {
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
            programId: assignment.program?.id || assignment.programId || '',
            programTitle: assignment.program?.title || '',
            dueDate: assignment.dueDate,
        }));
        // Get recent activity
        const recentActivity = await prisma_1.prisma.progress.findMany({
            where: { studentId: userId },
            include: {
                program: {
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
            programId: p.program?.id || p.programId || '',
            programTitle: p.program?.title || '',
            timestamp: p.lastAccessed,
        }));
        // Get recommendations (using existing recommendation service logic)
        const recommendations = await prisma_1.prisma.programRecommendation.findMany({
            where: { userId },
            include: {
                program: {
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
        const recProgramIds = recommendations.map((r) => r.program.id);
        const recReviews = await prisma_1.prisma.programReview.findMany({
            where: {
                programId: { in: recProgramIds },
                isPublished: true,
            },
            select: {
                programId: true,
                rating: true,
            },
        });
        const ratingsMap = new Map();
        for (const programId of recProgramIds) {
            const programReviews = recReviews.filter((r) => r.programId === programId);
            const average = programReviews.length > 0
                ? programReviews.reduce((sum, r) => sum + r.rating, 0) / programReviews.length
                : 0;
            ratingsMap.set(programId, Math.round(average * 10) / 10);
        }
        const recs = recommendations.map((rec) => ({
            id: rec.program.id,
            title: rec.program.title,
            thumbnailUrl: rec.program.thumbnailUrl || undefined,
            difficulty: rec.program.difficulty || undefined,
            averageRating: ratingsMap.get(rec.program.id) || 0,
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
