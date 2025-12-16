"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReviewsService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class ReviewsService {
    /**
     * Create a course review
     */
    async createReview(data) {
        // Check if student is enrolled
        const enrollment = await prisma_1.prisma.enrollment.findFirst({
            where: {
                courseId: data.courseId,
                studentId: data.studentId,
            },
        });
        if (!enrollment) {
            throw new Error('You must be enrolled in the course to leave a review');
        }
        // Check if review already exists
        const existing = await prisma_1.prisma.courseReview.findFirst({
            where: {
                courseId: data.courseId,
                studentId: data.studentId,
            },
        });
        if (existing) {
            throw new Error('You have already reviewed this course');
        }
        // Validate rating
        if (data.rating < 1 || data.rating > 5) {
            throw new Error('Rating must be between 1 and 5');
        }
        const review = await prisma_1.prisma.courseReview.create({
            data: {
                courseId: data.courseId,
                studentId: data.studentId,
                rating: data.rating,
                title: data.title,
                content: data.content,
                isVerified: true, // Verified because they're enrolled
                isPublished: true,
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // Invalidate course cache
        await (0, cache_1.deleteCache)(`course:${data.courseId}`);
        return this.mapToDto(review);
    }
    /**
     * Get course reviews
     */
    async getCourseReviews(courseId, page = 1, limit = 20, minRating) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = {
            courseId,
            isPublished: true,
        };
        if (minRating) {
            where.rating = { gte: minRating };
        }
        const [reviews, total, allReviews] = await Promise.all([
            prisma_1.prisma.courseReview.findMany({
                where,
                skip,
                take,
                include: {
                    course: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                    student: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: [
                    { helpfulCount: 'desc' },
                    { createdAt: 'desc' },
                ],
            }),
            prisma_1.prisma.courseReview.count({ where }),
            prisma_1.prisma.courseReview.findMany({
                where: { courseId, isPublished: true },
                select: { rating: true },
            }),
        ]);
        // Calculate average rating
        const averageRating = allReviews.length > 0
            ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
            : 0;
        // Rating distribution
        const distribution = [1, 2, 3, 4, 5].map((rating) => ({
            rating,
            count: allReviews.filter((r) => r.rating === rating).length,
        }));
        return {
            data: reviews.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                averageRating: Math.round(averageRating * 10) / 10,
                ratingDistribution: distribution,
            },
        };
    }
    /**
     * Get review by ID
     */
    async getReviewById(reviewId) {
        const review = await prisma_1.prisma.courseReview.findUnique({
            where: { id: reviewId },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        return this.mapToDto(review);
    }
    /**
     * Update review
     */
    async updateReview(reviewId, studentId, data) {
        const review = await prisma_1.prisma.courseReview.findFirst({
            where: { id: reviewId, studentId },
        });
        if (!review) {
            throw new Error('Review not found or unauthorized');
        }
        const updateData = {};
        if (data.rating !== undefined) {
            if (data.rating < 1 || data.rating > 5) {
                throw new Error('Rating must be between 1 and 5');
            }
            updateData.rating = data.rating;
        }
        if (data.title !== undefined)
            updateData.title = data.title;
        if (data.content !== undefined)
            updateData.content = data.content;
        const updated = await prisma_1.prisma.courseReview.update({
            where: { id: reviewId },
            data: updateData,
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        await (0, cache_1.deleteCache)(`course:${updated.courseId}`);
        return this.mapToDto(updated);
    }
    /**
     * Delete review
     */
    async deleteReview(reviewId, studentId) {
        const review = await prisma_1.prisma.courseReview.findFirst({
            where: { id: reviewId, studentId },
        });
        if (!review) {
            throw new Error('Review not found or unauthorized');
        }
        await prisma_1.prisma.courseReview.delete({
            where: { id: reviewId },
        });
        await (0, cache_1.deleteCache)(`course:${review.courseId}`);
    }
    /**
     * Mark review as helpful
     */
    async markHelpful(reviewId, userId) {
        const review = await prisma_1.prisma.courseReview.findUnique({
            where: { id: reviewId },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        // Check if already marked
        const existing = await prisma_1.prisma.reviewHelpful.findFirst({
            where: {
                reviewId,
                userId,
            },
        });
        if (existing) {
            // Remove helpful vote
            await prisma_1.prisma.reviewHelpful.delete({
                where: { id: existing.id },
            });
        }
        else {
            // Add helpful vote
            await prisma_1.prisma.reviewHelpful.create({
                data: {
                    reviewId,
                    userId,
                    isHelpful: true,
                },
            });
        }
        // Update helpful count
        const helpfulCount = await prisma_1.prisma.reviewHelpful.count({
            where: { reviewId, isHelpful: true },
        });
        await prisma_1.prisma.courseReview.update({
            where: { id: reviewId },
            data: { helpfulCount },
        });
        return helpfulCount;
    }
    /**
     * Add instructor response
     */
    async addInstructorResponse(reviewId, instructorId, response) {
        const review = await prisma_1.prisma.courseReview.findUnique({
            where: { id: reviewId },
            include: {
                course: {
                    select: {
                        instructorId: true,
                    },
                },
            },
        });
        if (!review) {
            throw new Error('Review not found');
        }
        if (review.course.instructorId !== instructorId) {
            throw new Error('Only the course instructor can respond to reviews');
        }
        const updated = await prisma_1.prisma.courseReview.update({
            where: { id: reviewId },
            data: {
                instructorResponse: response,
                instructorResponseAt: new Date(),
            },
            include: {
                course: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
                student: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapToDto(updated);
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(review) {
        return {
            id: review.id,
            courseId: review.courseId,
            course: review.course,
            studentId: review.studentId,
            student: review.student,
            rating: review.rating,
            title: review.title || undefined,
            content: review.content,
            isVerified: review.isVerified,
            isPublished: review.isPublished,
            helpfulCount: review.helpfulCount,
            instructorResponse: review.instructorResponse || undefined,
            instructorResponseAt: review.instructorResponseAt || undefined,
            createdAt: review.createdAt,
            updatedAt: review.updatedAt,
        };
    }
}
exports.ReviewsService = ReviewsService;
