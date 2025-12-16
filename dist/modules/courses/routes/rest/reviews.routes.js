"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reviews_service_1 = require("../../services/reviews.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const reviewsService = new reviews_service_1.ReviewsService();
/**
 * @swagger
 * /api/courses/{courseId}/reviews:
 *   post:
 *     summary: Create a course review
 *     tags: [Reviews]
 */
const createReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5),
    title: zod_1.z.string().optional(),
    content: zod_1.z.string().min(10),
});
router.post('/courses/:courseId/reviews', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ courseId: zod_1.z.string().min(1) }),
    body: createReviewSchema,
}), async (req, res) => {
    try {
        const { courseId } = req.params;
        const studentId = req.user?.id;
        const review = await reviewsService.createReview({
            courseId,
            studentId,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: review,
            message: 'Review created successfully'
        });
    }
    catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ error: error.message || 'Failed to create review' });
    }
});
/**
 * @swagger
 * /api/courses/{courseId}/reviews:
 *   get:
 *     summary: Get course reviews
 *     tags: [Reviews]
 */
router.get('/courses/:courseId/reviews', (0, validation_1.validate)({
    params: zod_1.z.object({ courseId: zod_1.z.string().min(1) }),
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
        minRating: zod_1.z.string().optional().transform(val => val ? parseInt(val) : undefined),
    }),
}), async (req, res) => {
    try {
        const { courseId } = req.params;
        const page = typeof req.query.page === 'number' ? req.query.page : 1;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
        const minRating = typeof req.query.minRating === 'number' ? req.query.minRating : undefined;
        const result = await reviewsService.getCourseReviews(courseId, page, limit, minRating);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching reviews:', error);
        res.status(500).json({ error: 'Failed to fetch reviews' });
    }
});
/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   get:
 *     summary: Get review by ID
 *     tags: [Reviews]
 */
router.get('/reviews/:reviewId', (0, validation_1.validate)({ params: zod_1.z.object({ reviewId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { reviewId } = req.params;
        const review = await reviewsService.getReviewById(reviewId);
        res.json({
            success: true,
            data: review
        });
    }
    catch (error) {
        console.error('Error fetching review:', error);
        res.status(404).json({ error: error.message || 'Review not found' });
    }
});
/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   put:
 *     summary: Update review
 *     tags: [Reviews]
 */
const updateReviewSchema = zod_1.z.object({
    rating: zod_1.z.number().int().min(1).max(5).optional(),
    title: zod_1.z.string().optional(),
    content: zod_1.z.string().min(10).optional(),
});
router.put('/reviews/:reviewId', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ reviewId: zod_1.z.string().min(1) }),
    body: updateReviewSchema,
}), async (req, res) => {
    try {
        const { reviewId } = req.params;
        const studentId = req.user?.id;
        const review = await reviewsService.updateReview(reviewId, studentId, req.body);
        res.json({
            success: true,
            data: review,
            message: 'Review updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating review:', error);
        res.status(500).json({ error: error.message || 'Failed to update review' });
    }
});
/**
 * @swagger
 * /api/reviews/{reviewId}:
 *   delete:
 *     summary: Delete review
 *     tags: [Reviews]
 */
router.delete('/reviews/:reviewId', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ reviewId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { reviewId } = req.params;
        const studentId = req.user?.id;
        await reviewsService.deleteReview(reviewId, studentId);
        res.json({
            success: true,
            message: 'Review deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting review:', error);
        res.status(500).json({ error: error.message || 'Failed to delete review' });
    }
});
/**
 * @swagger
 * /api/reviews/{reviewId}/helpful:
 *   post:
 *     summary: Mark review as helpful
 *     tags: [Reviews]
 */
router.post('/reviews/:reviewId/helpful', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ reviewId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user?.id;
        const helpfulCount = await reviewsService.markHelpful(reviewId, userId);
        res.json({
            success: true,
            data: { helpfulCount },
            message: 'Review helpful status updated'
        });
    }
    catch (error) {
        console.error('Error marking review as helpful:', error);
        res.status(500).json({ error: error.message || 'Failed to update helpful status' });
    }
});
/**
 * @swagger
 * /api/reviews/{reviewId}/instructor-response:
 *   post:
 *     summary: Add instructor response to review (Teacher only)
 *     tags: [Reviews]
 */
router.post('/reviews/:reviewId/instructor-response', auth_1.requireAuth, (0, roles_1.requireRole)('Teacher'), (0, validation_1.validate)({
    params: zod_1.z.object({ reviewId: zod_1.z.string().min(1) }),
    body: zod_1.z.object({
        response: zod_1.z.string().min(1),
    }),
}), async (req, res) => {
    try {
        const { reviewId } = req.params;
        const instructorId = req.user?.id;
        const review = await reviewsService.addInstructorResponse(reviewId, instructorId, req.body.response);
        res.json({
            success: true,
            data: review,
            message: 'Instructor response added successfully'
        });
    }
    catch (error) {
        console.error('Error adding instructor response:', error);
        res.status(500).json({ error: error.message || 'Failed to add instructor response' });
    }
});
exports.default = router;
