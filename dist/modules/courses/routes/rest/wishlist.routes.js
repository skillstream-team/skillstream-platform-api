"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const wishlist_service_1 = require("../../services/wishlist.service");
const router = (0, express_1.Router)();
const wishlistService = new wishlist_service_1.WishlistService();
/**
 * @swagger
 * /api/courses/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     description: Returns paginated list of courses in user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 100
 *     responses:
 *       200:
 *         description: Wishlist retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await wishlistService.getUserWishlist(userId, page, limit);
        res.json(result);
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/wishlist/{courseId}:
 *   post:
 *     summary: Add course to wishlist
 *     description: Adds a course to the authenticated user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Course added to wishlist successfully
 *       400:
 *         description: Course already in wishlist or invalid request
 *       404:
 *         description: Course not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:programId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;
        const result = await wishlistService.addToWishlist(userId, courseId);
        res.status(201).json(result);
    }
    catch (err) {
        const error = err;
        if (error.message === 'Course not found') {
            res.status(404).json({ error: error.message });
        }
        else if (error.message.includes('already in your wishlist')) {
            res.status(400).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
/**
 * @swagger
 * /api/courses/wishlist/{courseId}:
 *   delete:
 *     summary: Remove course from wishlist
 *     description: Removes a course from the authenticated user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course removed from wishlist successfully
 *       404:
 *         description: Course not in wishlist
 *       401:
 *         description: Unauthorized
 */
router.delete('/:programId', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;
        await wishlistService.removeFromWishlist(userId, courseId);
        res.json({ message: 'Course removed from wishlist' });
    }
    catch (err) {
        const error = err;
        if (error.message.includes('not in your wishlist')) {
            res.status(404).json({ error: error.message });
        }
        else {
            res.status(500).json({ error: error.message });
        }
    }
});
/**
 * @swagger
 * /api/courses/wishlist/{courseId}/check:
 *   get:
 *     summary: Check if course is in wishlist
 *     description: Checks if a course is in the authenticated user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Check result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 isInWishlist:
 *                   type: boolean
 *       401:
 *         description: Unauthorized
 */
router.get('/:programId/check', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const { courseId } = req.params;
        const isInWishlist = await wishlistService.isInWishlist(userId, courseId);
        res.json({ isInWishlist });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
/**
 * @swagger
 * /api/courses/wishlist/count:
 *   get:
 *     summary: Get wishlist count
 *     description: Returns the total number of courses in user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Wishlist count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *       401:
 *         description: Unauthorized
 */
router.get('/count', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const count = await wishlistService.getWishlistCount(userId);
        res.json({ count });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
exports.default = router;
