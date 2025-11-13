"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RecommendationService = void 0;
const prisma_1 = require("../../../utils/prisma");
class RecommendationService {
    /**
     * Generate recommendations for a user based on different algorithms
     */
    async generateRecommendations(userId, limit = 10) {
        // Clear old recommendations for this user
        await prisma_1.prisma.courseRecommendation.deleteMany({
            where: { userId }
        });
        const recommendations = [];
        // Get user's enrolled courses and interactions
        const userEnrollments = await prisma_1.prisma.enrollment.findMany({
            where: { studentId: userId },
            include: { course: true }
        });
        const userInteractions = await prisma_1.prisma.userInteraction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        // Algorithm 1: Collaborative Filtering
        const collaborativeRecs = await this.getCollaborativeRecommendations(userId, userEnrollments);
        recommendations.push(...collaborativeRecs);
        // Algorithm 2: Content-Based Filtering
        const contentBasedRecs = await this.getContentBasedRecommendations(userId, userEnrollments);
        recommendations.push(...contentBasedRecs);
        // Algorithm 3: Popularity-Based
        const popularityRecs = await this.getPopularityBasedRecommendations(userId, userEnrollments);
        recommendations.push(...popularityRecs);
        // Sort by score and take top recommendations
        const topRecommendations = recommendations
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);
        // Save recommendations to database
        const savedRecommendations = await Promise.all(topRecommendations.map(rec => prisma_1.prisma.courseRecommendation.create({
            data: rec,
            include: {
                course: {
                    include: {
                        instructor: {
                            select: { id: true, username: true }
                        }
                    }
                }
            }
        })));
        return savedRecommendations.map(this.mapToResponseDto);
    }
    /**
     * Collaborative filtering: recommend courses based on similar users
     */
    async getCollaborativeRecommendations(userId, userEnrollments) {
        const enrolledCourseIds = userEnrollments.map(e => e.courseId);
        if (enrolledCourseIds.length === 0)
            return [];
        // Find users with similar course enrollments
        const similarUsers = await prisma_1.prisma.enrollment.groupBy({
            by: ['studentId'],
            where: {
                courseId: { in: enrolledCourseIds },
                studentId: { not: userId }
            },
            _count: { courseId: true },
            having: { courseId: { _count: { gte: Math.max(1, Math.floor(enrolledCourseIds.length * 0.3)) } } },
            orderBy: { _count: { courseId: 'desc' } },
            take: 20
        });
        // Get courses enrolled by similar users that current user hasn't enrolled in
        const recommendedCourses = await prisma_1.prisma.enrollment.findMany({
            where: {
                studentId: { in: similarUsers.map(u => u.studentId) },
                courseId: { notIn: enrolledCourseIds }
            },
            include: { course: true },
            distinct: ['courseId']
        });
        return recommendedCourses.slice(0, 5).map(enrollment => ({
            userId,
            courseId: enrollment.courseId,
            score: Math.min(0.9, 0.6 + (Math.random() * 0.3)), // Score between 0.6-0.9
            reason: 'Students with similar interests also enrolled in this course',
            algorithm: 'collaborative',
            metadata: { similarUserCount: similarUsers.length }
        }));
    }
    /**
     * Content-based filtering: recommend courses based on user's course history
     */
    async getContentBasedRecommendations(userId, userEnrollments) {
        if (userEnrollments.length === 0)
            return [];
        const enrolledCourseIds = userEnrollments.map(e => e.courseId);
        // For simplicity, recommend courses from the same instructors
        const instructorIds = [...new Set(userEnrollments.map(e => e.course.instructorId))];
        const instructorCourses = await prisma_1.prisma.course.findMany({
            where: {
                instructorId: { in: instructorIds },
                id: { notIn: enrolledCourseIds }
            },
            take: 5
        });
        return instructorCourses.map(course => ({
            userId,
            courseId: course.id,
            score: Math.min(0.85, 0.5 + (Math.random() * 0.35)), // Score between 0.5-0.85
            reason: 'From instructors of courses you\'ve enrolled in',
            algorithm: 'content_based',
            metadata: { instructorId: course.instructorId }
        }));
    }
    /**
     * Popularity-based recommendations: recommend trending courses
     */
    async getPopularityBasedRecommendations(userId, userEnrollments) {
        const enrolledCourseIds = userEnrollments.map(e => e.courseId);
        // Get most popular courses (by enrollment count) that user hasn't enrolled in
        const popularCourses = await prisma_1.prisma.course.findMany({
            where: {
                id: { notIn: enrolledCourseIds }
            },
            include: {
                _count: {
                    select: { enrollments: true }
                }
            },
            orderBy: {
                enrollments: { _count: 'desc' }
            },
            take: 5
        });
        return popularCourses.map((course, index) => ({
            userId,
            courseId: course.id,
            score: Math.max(0.3, 0.7 - (index * 0.1)), // Decreasing score based on popularity rank
            reason: `Popular course with ${course._count.enrollments} enrollments`,
            algorithm: 'popularity',
            metadata: { enrollmentCount: course._count.enrollments, rank: index + 1 }
        }));
    }
    /**
     * Get user's recommendations
     */
    async getUserRecommendations(filters) {
        const recommendations = await prisma_1.prisma.courseRecommendation.findMany({
            where: {
                userId: filters.userId,
                ...(filters.algorithm && { algorithm: filters.algorithm }),
                ...(filters.minScore && { score: { gte: filters.minScore } }),
                ...(filters.excludeViewed && { isViewed: false })
            },
            include: {
                course: {
                    include: {
                        instructor: {
                            select: { id: true, username: true }
                        }
                    }
                }
            },
            orderBy: { score: 'desc' },
            take: filters.limit || 10
        });
        return recommendations.map(this.mapToResponseDto);
    }
    /**
     * Record user interaction with a course
     */
    async recordInteraction(interaction) {
        await prisma_1.prisma.userInteraction.create({
            data: interaction
        });
        // If user viewed a recommended course, mark it as viewed
        if (interaction.type === 'view' && interaction.courseId) {
            await prisma_1.prisma.courseRecommendation.updateMany({
                where: {
                    userId: interaction.userId,
                    courseId: interaction.courseId
                },
                data: { isViewed: true }
            });
        }
        // If user enrolled in a recommended course, mark it as clicked
        if (interaction.type === 'enroll' && interaction.courseId) {
            await prisma_1.prisma.courseRecommendation.updateMany({
                where: {
                    userId: interaction.userId,
                    courseId: interaction.courseId
                },
                data: { isClicked: true }
            });
        }
    }
    /**
     * Get recommendation statistics for a user
     */
    async getRecommendationStats(userId) {
        const stats = await prisma_1.prisma.courseRecommendation.aggregate({
            where: { userId },
            _count: { id: true },
            _avg: { score: true }
        });
        const viewedCount = await prisma_1.prisma.courseRecommendation.count({
            where: { userId, isViewed: true }
        });
        const clickedCount = await prisma_1.prisma.courseRecommendation.count({
            where: { userId, isClicked: true }
        });
        const topAlgorithm = await prisma_1.prisma.courseRecommendation.groupBy({
            by: ['algorithm'],
            where: { userId, isClicked: true },
            _count: { algorithm: true },
            orderBy: { _count: { algorithm: 'desc' } },
            take: 1
        });
        return {
            totalRecommendations: stats._count.id,
            viewedRecommendations: viewedCount,
            clickedRecommendations: clickedCount,
            averageScore: stats._avg.score || 0,
            topAlgorithm: topAlgorithm[0]?.algorithm || 'none'
        };
    }
    /**
     * Refresh recommendations for a user
     */
    async refreshRecommendations(userId) {
        return this.generateRecommendations(userId);
    }
    /**
     * Map database model to response DTO
     */
    mapToResponseDto(recommendation) {
        return {
            id: recommendation.id,
            userId: recommendation.userId,
            courseId: recommendation.courseId,
            score: recommendation.score,
            reason: recommendation.reason,
            algorithm: recommendation.algorithm,
            metadata: recommendation.metadata,
            isViewed: recommendation.isViewed,
            isClicked: recommendation.isClicked,
            createdAt: recommendation.createdAt,
            updatedAt: recommendation.updatedAt,
            course: {
                id: recommendation.course.id,
                title: recommendation.course.title,
                description: recommendation.course.description,
                price: recommendation.course.price,
                instructor: {
                    id: recommendation.course.instructor.id,
                    username: recommendation.course.instructor.username
                }
            }
        };
    }
}
exports.RecommendationService = RecommendationService;
