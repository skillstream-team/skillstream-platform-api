import { Router } from 'express';
import { ForumsService } from '../../services/forums.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { validate } from '../../../../middleware/validation';
import { logger } from '../../../../utils/logger';
import { z } from 'zod';

const router = Router();
const forumsService = new ForumsService();

/**
 * @swagger
 * /api/courses/{courseId}/forum/posts:
 *   post:
 *     summary: Create a forum post
 *     tags: [Forums]
 */
const createPostSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
});

router.post('/courses/:courseId/forum/posts',
  requireAuth,
  requireSubscription,
  validate({
    params: z.object({ courseId: z.string().min(1) }),
    body: createPostSchema,
  }),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const authorId = (req as any).user?.id;

      const post = await forumsService.createPost({
        courseId,
        authorId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: post,
        message: 'Post created successfully'
      });
    } catch (error) {
      logger.error('Error creating post', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create post' });
    }
  }
);

/**
 * @swagger
 * /api/courses/{courseId}/forum/posts:
 *   get:
 *     summary: Get forum posts for a course
 *     tags: [Forums]
 */
router.get('/courses/:courseId/forum/posts',
  validate({
    params: z.object({ courseId: z.string().min(1) }),
    query: z.object({
      page: z.string().optional().transform(val => val ? parseInt(val) : 1),
      limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
      search: z.string().optional(),
    }),
  }),
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const page = typeof req.query.page === 'number' ? req.query.page : 1;
      const limit = typeof req.query.limit === 'number' ? req.query.limit : 20;
      const search = req.query.search as string | undefined;

      const result = await forumsService.getCoursePosts(courseId, page, limit, search);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      logger.error('Error fetching posts', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}:
 *   get:
 *     summary: Get post by ID
 *     tags: [Forums]
 */
router.get('/forum/posts/:postId',
  validate({ params: z.object({ postId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { postId } = req.params;

      const post = await forumsService.getPostById(postId);

      res.json({
        success: true,
        data: post
      });
    } catch (error) {
      logger.error('Error fetching post', error);
      res.status(404).json({ error: (error as Error).message || 'Post not found' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/replies:
 *   get:
 *     summary: Get replies for a post
 *     tags: [Forums]
 */
router.get('/forum/posts/:postId/replies',
  validate({ params: z.object({ postId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { postId } = req.params;

      const replies = await forumsService.getPostReplies(postId);

      res.json({
        success: true,
        data: replies
      });
    } catch (error) {
      logger.error('Error fetching replies', error);
      res.status(500).json({ error: 'Failed to fetch replies' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/replies:
 *   post:
 *     summary: Create a reply
 *     tags: [Forums]
 */
const createReplySchema = z.object({
  content: z.string().min(1),
  parentId: z.string().optional(),
});

router.post('/forum/posts/:postId/replies',
  requireAuth,
  validate({
    params: z.object({ postId: z.string().min(1) }),
    body: createReplySchema,
  }),
  async (req, res) => {
    try {
      const { postId } = req.params;
      const authorId = (req as any).user?.id;

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
    } catch (error) {
      logger.error('Error creating reply', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create reply' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/upvote:
 *   post:
 *     summary: Upvote a post
 *     tags: [Forums]
 */
router.post('/forum/posts/:postId/upvote',
  requireAuth,
  validate({ params: z.object({ postId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { postId } = req.params;
      const userId = (req as any).user?.id;

      const upvoteCount = await forumsService.upvote(postId, null, userId);

      res.json({
        success: true,
        data: { upvoteCount },
        message: 'Upvote toggled'
      });
    } catch (error) {
      logger.error('Error upvoting post', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to upvote post' });
    }
  }
);

/**
 * @swagger
 * /api/forum/replies/{replyId}/upvote:
 *   post:
 *     summary: Upvote a reply
 *     tags: [Forums]
 */
router.post('/forum/replies/:replyId/upvote',
  requireAuth,
  validate({ params: z.object({ replyId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { replyId } = req.params;
      const userId = (req as any).user?.id;

      const upvoteCount = await forumsService.upvote(null, replyId, userId);

      res.json({
        success: true,
        data: { upvoteCount },
        message: 'Upvote toggled'
      });
    } catch (error) {
      logger.error('Error upvoting reply', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to upvote reply' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/best-answer:
 *   post:
 *     summary: Mark best answer (Teacher only)
 *     tags: [Forums]
 */
router.post('/forum/posts/:postId/best-answer',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({
      postId: z.string().min(1),
    }),
    body: z.object({
      replyId: z.string().min(1),
    }),
  }),
  async (req, res) => {
    try {
      const { postId } = req.params;
      const instructorId = (req as any).user?.id;

      await forumsService.markBestAnswer(postId, req.body.replyId, instructorId);

      res.json({
        success: true,
        message: 'Best answer marked successfully'
      });
    } catch (error) {
      logger.error('Error marking best answer', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to mark best answer' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/pin:
 *   put:
 *     summary: Pin/unpin a post (Teacher/Admin only)
 *     tags: [Forums]
 */
router.put('/forum/posts/:postId/pin',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ postId: z.string().min(1) }),
    body: z.object({ isPinned: z.boolean() }),
  }),
  async (req, res) => {
    try {
      const { postId } = req.params;

      const post = await forumsService.togglePin(postId, req.body.isPinned);

      res.json({
        success: true,
        data: post,
        message: `Post ${req.body.isPinned ? 'pinned' : 'unpinned'} successfully`
      });
    } catch (error) {
      logger.error('Error toggling pin', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to toggle pin' });
    }
  }
);

/**
 * @swagger
 * /api/forum/posts/{postId}/lock:
 *   put:
 *     summary: Lock/unlock a post (Teacher/Admin only)
 *     tags: [Forums]
 */
router.put('/forum/posts/:postId/lock',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ postId: z.string().min(1) }),
    body: z.object({ isLocked: z.boolean() }),
  }),
  async (req, res) => {
    try {
      const { postId } = req.params;

      const post = await forumsService.toggleLock(postId, req.body.isLocked);

      res.json({
        success: true,
        data: post,
        message: `Post ${req.body.isLocked ? 'locked' : 'unlocked'} successfully`
      });
    } catch (error) {
      logger.error('Error toggling lock', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to toggle lock' });
    }
  }
);

export default router;
