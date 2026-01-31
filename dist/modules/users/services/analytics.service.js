"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const prisma_1 = require("../../../utils/prisma");
class AnalyticsService {
    /**
     * Get platform-wide analytics
     */
    async getPlatformAnalytics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Overview stats
        const [totalUsers, totalCourses, totalEnrollments, activeUsers, allPayments, usersByRole,] = await Promise.all([
            prisma_1.prisma.user.count(),
            prisma_1.prisma.program.count(),
            prisma_1.prisma.enrollment.count(),
            prisma_1.prisma.user.count({
                where: {
                    OR: [
                        { updatedAt: { gte: thirtyDaysAgo } },
                        { createdAt: { gte: thirtyDaysAgo } },
                    ],
                },
            }),
            prisma_1.prisma.payment.findMany({
                where: { status: 'COMPLETED' },
                include: { collection: { select: { id: true, title: true } } },
            }),
            prisma_1.prisma.user.groupBy({
                by: ['role'],
                _count: { id: true },
            }),
        ]);
        const totalRevenue = allPayments.reduce((sum, p) => sum + p.amount, 0);
        // User growth (last 12 months)
        const userGrowth = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const count = await prisma_1.prisma.user.count({
                where: {
                    createdAt: { gte: monthStart, lte: monthEnd },
                },
            });
            userGrowth.push({
                month: monthStart.toISOString().substring(0, 7),
                count,
            });
        }
        // Collection stats
        const courses = await prisma_1.prisma.collection.findMany({
            include: {
                enrollments: true,
                payments: { where: { status: 'COMPLETED' } },
            },
        });
        const publishedCourses = courses.filter((c) => c.isPublished !== false).length;
        const averageEnrollments = totalEnrollments / Math.max(totalCourses, 1);
        const topCourses = courses
            .map((c) => ({
            id: c.id,
            title: c.title,
            enrollments: c.enrollments.length,
            revenue: c.payments.reduce((sum, p) => sum + p.amount, 0),
        }))
            .sort((a, b) => b.enrollments - a.enrollments)
            .slice(0, 10);
        // Revenue analytics
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const thisMonthRevenue = allPayments
            .filter((p) => p.createdAt >= thisMonthStart)
            .reduce((sum, p) => sum + p.amount, 0);
        const lastMonthRevenue = allPayments
            .filter((p) => p.createdAt >= lastMonthStart && p.createdAt <= lastMonthEnd)
            .reduce((sum, p) => sum + p.amount, 0);
        const revenueGrowth = lastMonthRevenue > 0
            ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
            : 0;
        // Revenue by month
        const revenueByMonth = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const revenue = allPayments
                .filter((p) => p.createdAt >= monthStart && p.createdAt <= monthEnd)
                .reduce((sum, p) => sum + p.amount, 0);
            revenueByMonth.push({
                month: monthStart.toISOString().substring(0, 7),
                revenue,
            });
        }
        // Revenue by course
        const revenueByCourse = courses
            .map((c) => ({
            courseId: c.id,
            courseTitle: c.title,
            revenue: c.payments.reduce((sum, p) => sum + p.amount, 0),
        }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
        // Engagement metrics
        const allProgress = await prisma_1.prisma.progress.findMany({
            where: { status: 'completed' },
            include: {
                collection: { select: { id: true, title: true } },
            },
        });
        const allQuizAttempts = await prisma_1.prisma.quizAttempt.findMany({
            where: { score: { not: null } },
        });
        const totalStudents = await prisma_1.prisma.enrollment.count();
        const completedCourses = allProgress.filter((p) => p.type === 'course' && p.status === 'completed').length;
        const averageCompletionRate = totalStudents > 0 ? (completedCourses / totalStudents) * 100 : 0;
        const averageQuizScore = allQuizAttempts.length > 0
            ? allQuizAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) /
                allQuizAttempts.length
            : 0;
        // Completion by course
        const completionByCourse = courses.map((c) => {
            const courseProgress = allProgress.filter((p) => p.courseId === c.id && p.type === 'course' && p.status === 'completed');
            const courseEnrollments = c.enrollments.length;
            return {
                courseId: c.id,
                courseTitle: c.title,
                completionRate: courseEnrollments > 0 ? (courseProgress.length / courseEnrollments) * 100 : 0,
            };
        });
        return {
            overview: {
                totalUsers,
                totalCourses,
                totalEnrollments,
                totalRevenue,
                activeUsers,
            },
            users: {
                byRole: usersByRole.map((r) => ({ role: r.role, count: r._count.id })),
                growth: userGrowth,
                activeUsers,
            },
            courses: {
                total: totalCourses,
                published: publishedCourses,
                totalEnrollments,
                averageEnrollments: Math.round(averageEnrollments * 100) / 100,
                topCourses,
            },
            revenue: {
                total: totalRevenue,
                thisMonth: thisMonthRevenue,
                lastMonth: lastMonthRevenue,
                growth: Math.round(revenueGrowth * 100) / 100,
                byMonth: revenueByMonth,
                byCourse: revenueByCourse,
            },
            engagement: {
                averageCompletionRate: Math.round(averageCompletionRate * 100) / 100,
                averageQuizScore: Math.round(averageQuizScore * 100) / 100,
                averageTimeSpent: 0, // Would need time tracking
                completionByCourse: completionByCourse.sort((a, b) => b.completionRate - a.completionRate),
            },
        };
    }
    /**
     * Get collection-specific analytics
     */
    async getCollectionAnalytics(collectionId) {
        const course = await prisma_1.prisma.program.findUnique({
            where: { id: collectionId },
            include: {
                enrollments: {
                    include: { student: { select: { id: true, username: true } } },
                },
                payments: { where: { status: 'COMPLETED' } },
                progress: true,
                quizzes: {
                    include: {
                        attempts: {
                            where: { score: { not: null } },
                        },
                    },
                },
                assignments: {
                    include: {
                        submissions: {
                            where: { gradedAt: { not: null } },
                        },
                    },
                },
            },
        });
        if (!course) {
            throw new Error('Course not found');
        }
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        // Overview
        const totalEnrollments = course.enrollments.length;
        const activeStudents = course.enrollments.filter((e) => e.createdAt >= thirtyDaysAgo).length;
        const completedProgress = course.progress.filter((p) => p.type === 'course' && p.status === 'completed');
        const completionRate = totalEnrollments > 0 ? (completedProgress.length / totalEnrollments) * 100 : 0;
        const allQuizScores = course.quizzes.flatMap((q) => q.attempts.map((a) => a.percentage || 0));
        const averageScore = allQuizScores.length > 0
            ? allQuizScores.reduce((sum, s) => sum + s, 0) / allQuizScores.length
            : 0;
        const totalRevenue = course.payments.reduce((sum, p) => sum + p.amount, 0);
        // Enrollments by month
        const enrollmentsByMonth = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const count = course.enrollments.filter((e) => e.createdAt >= monthStart && e.createdAt <= monthEnd).length;
            enrollmentsByMonth.push({
                month: monthStart.toISOString().substring(0, 7),
                count,
            });
        }
        const lastMonthEnrollments = enrollmentsByMonth.length > 1
            ? enrollmentsByMonth[enrollmentsByMonth.length - 2].count
            : 0;
        const thisMonthEnrollments = enrollmentsByMonth.length > 0
            ? enrollmentsByMonth[enrollmentsByMonth.length - 1].count
            : 0;
        const enrollmentGrowth = lastMonthEnrollments > 0
            ? ((thisMonthEnrollments - lastMonthEnrollments) / lastMonthEnrollments) * 100
            : 0;
        // Progress breakdown
        const notStarted = course.progress.filter((p) => p.type === 'course' && p.status === 'not_started').length;
        const inProgress = course.progress.filter((p) => p.type === 'course' && p.status === 'in_progress').length;
        const completed = completedProgress.length;
        const averageProgress = totalEnrollments > 0
            ? course.progress
                .filter((p) => p.type === 'course')
                .reduce((sum, p) => sum + (p.progress || 0), 0) / totalEnrollments
            : 0;
        // Performance
        const allAssignmentScores = course.assignments.flatMap((a) => a.submissions.map((s) => s.grade || 0));
        const averageAssignmentScore = allAssignmentScores.length > 0
            ? allAssignmentScores.reduce((sum, s) => sum + s, 0) / allAssignmentScores.length
            : 0;
        // Top performers (students with highest average scores)
        const studentScores = new Map();
        course.enrollments.forEach((e) => {
            const studentProgress = course.progress.filter((p) => p.studentId === e.studentId);
            const scores = studentProgress
                .map((p) => p.score || 0)
                .filter((s) => s > 0);
            if (scores.length > 0) {
                studentScores.set(e.studentId, {
                    scores,
                    name: e.student.username,
                });
            }
        });
        const topPerformers = Array.from(studentScores.entries())
            .map(([studentId, data]) => ({
            studentId,
            studentName: data.name,
            score: data.scores.reduce((sum, s) => sum + s, 0) / data.scores.length,
        }))
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        // Revenue by month
        const revenueByMonth = [];
        for (let i = 11; i >= 0; i--) {
            const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
            const revenue = course.payments
                .filter((p) => p.createdAt >= monthStart && p.createdAt <= monthEnd)
                .reduce((sum, p) => sum + p.amount, 0);
            revenueByMonth.push({
                month: monthStart.toISOString().substring(0, 7),
                revenue,
            });
        }
        return {
            courseId: course.id,
            courseTitle: course.title,
            overview: {
                totalEnrollments,
                activeStudents,
                completionRate: Math.round(completionRate * 100) / 100,
                averageScore: Math.round(averageScore * 100) / 100,
                totalRevenue,
            },
            enrollments: {
                total: totalEnrollments,
                byMonth: enrollmentsByMonth,
                growth: Math.round(enrollmentGrowth * 100) / 100,
            },
            progress: {
                notStarted,
                inProgress,
                completed,
                averageProgress: Math.round(averageProgress * 100) / 100,
            },
            performance: {
                averageQuizScore: Math.round(averageScore * 100) / 100,
                averageAssignmentScore: Math.round(averageAssignmentScore * 100) / 100,
                topPerformers,
            },
            revenue: {
                total: totalRevenue,
                byMonth: revenueByMonth,
            },
        };
    }
}
exports.AnalyticsService = AnalyticsService;
