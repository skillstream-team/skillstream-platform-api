"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const forums_service_1 = require("../../services/forums.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const subscription_1 = require("../../../../middleware/subscription");
const validation_1 = require("../../../../middleware/validation");
const logger_1 = require("../../../../utils/logger");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const forumsService = new forums_service_1.ForumsService();
/**
 * @swagger
 * /api/courses/{courseId}/forum/posts:
 *   post:
 *     summary: Create a forum post
 *     tags: [Forums]
 */
const createPostSchema = zod_1.z.object({
    title: zod_1.z.string().min(1),
    content: zod_1.z.string().min(10),
});
const createForumPostHandler = async (req, res) => {
    try {
        const programId = req.params.programId;
        const authorId = req.user?.id;
        const post = await forumsService.createPost({
            programId,
            authorId,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: post,
            message: 'Post created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating post', error);
        res.status(500).json({ error: error.message || 'Failed to create post' });
    }
};
router.post('/programs/:programId/forum/posts', auth_1.requireAuth, subscription_1.requireSubscription, (0, validation_1.validate)({
    params: zod_1.z.object({ programId: zod_1.z.string().min(1) }),
    body: createPostSchema,
}), createForumPostHandler);
/**
 * @swagger
 * /api/courses/{courseId}/forum/posts:
 *   get:
 *     summary: Get forum posts for a course
 *     tags: [Forums]
 */
const getForumPostsHandler = async (req, res) => {
    try {
        const programId = req.params.programId;
        const page = typeof req.query.page === 'number' ? req.query.page : 1;
        const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
        const search = req.query.search;
        const result = await forumsService.getProgramPosts(programId, page, limit, search);
        res.json({ success: true, ...result });
    }
    catch (error) {
        logger_1.logger.error('Error fetching posts', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
};
router.get('/programs/:programId/forum/posts', (0, validation_1.validate)({
    params: zod_1.z.object({ programId: zod_1.z.string().min(1) }),
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: zod_1.z.string().optional().transform(val => val ? parseInt(val) : 20),
        search: zod_1.z.string().optional(),
    }),
}), getForumPostsHandler);
/**
 * @swagger
 * /api/forum/posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Forums]
 */
router.get('/forum/posts/:postId', (0, validation_1.validate)({ params: zod_1.z.object({ postId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await forumsService.getPostById(postId);
        res.json({
            success: true,
            data: post
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching post', error);
        res.status(404).json({ error: error.message || 'Post not found' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/replies:
 *   get:
 *     summary: Get replies for a post
 *     tags: [Forums]
 */
router.get('/forum/posts/:postId/replies', (0, validation_1.validate)({ params: zod_1.z.object({ postId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { postId } = req.params;
        const replies = await forumsService.getPostReplies(postId);
        res.json({
            success: true,
            data: replies
        });
    }
    catch (error) {
        logger_1.logger.error('Error fetching replies', error);
        res.status(500).json({ error: 'Failed to fetch replies' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/replies:
 *   post:
 *     summary: Create a reply
 *     tags: [Forums]
 */
const createReplySchema = zod_1.z.object({
    content: zod_1.z.string().min(1),
    parentId: zod_1.z.string().optional(),
});
router.post('/forum/posts/:postId/replies', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ postId: zod_1.z.string().min(1) }),
    body: createReplySchema,
}), async (req, res) => {
    try {
        const { postId } = req.params;
        const authorId = req.user?.id;
        const reply = await forumsService.createReply({
            postId,
            authorId,
            ...req.body,
        });
        res.status(201).json({
            success: true,
            data: reply,
            message: 'Reply created successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error creating reply', error);
        res.status(500).json({ error: error.message || 'Failed to create reply' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/upvote:
 *   post:
 *     summary: Upvote a post
 *     tags: [Forums]
 */
router.post('/forum/posts/:postId/upvote', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ postId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.id;
        const upvoteCount = await forumsService.upvote(postId, null, userId);
        res.json({
            success: true,
            data: { upvoteCount },
            message: 'Upvote toggled'
        });
    }
    catch (error) {
        logger_1.logger.error('Error upvoting post', error);
        res.status(500).json({ error: error.message || 'Failed to upvote post' });
    }
});
/**
 * @swagger
 * /api/forum/replies/{replyId}/upvote:
 *   post:
 *     summary: Upvote a reply
 *     tags: [Forums]
 */
router.post('/forum/replies/:replyId/upvote', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ replyId: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { replyId } = req.params;
        const userId = req.user?.id;
        const upvoteCount = await forumsService.upvote(null, replyId, userId);
        res.json({
            success: true,
            data: { upvoteCount },
            message: 'Upvote toggled'
        });
    }
    catch (error) {
        logger_1.logger.error('Error upvoting reply', error);
        res.status(500).json({ error: error.message || 'Failed to upvote reply' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/best-answer:
 *   post:
 *     summary: Mark best answer (Teacher only)
 *     tags: [Forums]
 */
router.post('/forum/posts/:postId/best-answer', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({
        postId: zod_1.z.string().min(1),
    }),
    body: zod_1.z.object({
        replyId: zod_1.z.string().min(1),
    }),
}), async (req, res) => {
    try {
        const { postId } = req.params;
        const instructorId = req.user?.id;
        await forumsService.markBestAnswer(postId, req.body.replyId, instructorId);
        res.json({
            success: true,
            message: 'Best answer marked successfully'
        });
    }
    catch (error) {
        logger_1.logger.error('Error marking best answer', error);
        res.status(500).json({ error: error.message || 'Failed to mark best answer' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/pin:
 *   put:
 *     summary: Pin/unpin a post (Teacher/Admin only)
 *     tags: [Forums]
 */
router.put('/forum/posts/:postId/pin', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({ postId: zod_1.z.string().min(1) }),
    body: zod_1.z.object({ isPinned: zod_1.z.boolean() }),
}), async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await forumsService.togglePin(postId, req.body.isPinned);
        res.json({
            success: true,
            data: post,
            message: `Post ${req.body.isPinned ? 'pinned' : 'unpinned'} successfully`
        });
    }
    catch (error) {
        logger_1.logger.error('Error toggling pin', error);
        res.status(500).json({ error: error.message || 'Failed to toggle pin' });
    }
});
/**
 * @swagger
 * /api/forum/posts/{postId}/lock:
 *   put:
 *     summary: Lock/unlock a post (Teacher/Admin only)
 *     tags: [Forums]
 */
router.put('/forum/posts/:postId/lock', auth_1.requireAuth, (0, roles_1.requireRole)('TEACHER'), (0, validation_1.validate)({
    params: zod_1.z.object({ postId: zod_1.z.string().min(1) }),
    body: zod_1.z.object({ isLocked: zod_1.z.boolean() }),
}), async (req, res) => {
    try {
        const { postId } = req.params;
        const post = await forumsService.toggleLock(postId, req.body.isLocked);
        res.json({
            success: true,
            data: post,
            message: `Post ${req.body.isLocked ? 'locked' : 'unlocked'} successfully`
        });
    }
    catch (error) {
        logger_1.logger.error('Error toggling lock', error);
        res.status(500).json({ error: error.message || 'Failed to toggle lock' });
    }
});
exports.default = router;
