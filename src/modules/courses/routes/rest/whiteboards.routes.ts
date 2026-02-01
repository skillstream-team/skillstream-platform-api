import { Router } from 'express';
import { WhiteboardService } from '../../services/whiteboard.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const whiteboardService = new WhiteboardService();

/**
 * @swagger
 * /api/whiteboards:
 *   post:
 *     summary: Create a new whiteboard
 *     tags: [Whiteboards]
 */
const createWhiteboardSchema = z.object({
  courseId: z.string().optional(),
  liveStreamId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  width: z.number().int().min(100).max(10000).optional(),
  height: z.number().int().min(100).max(10000).optional(),
  isPublic: z.boolean().optional(),
}).refine(data => data.courseId || data.liveStreamId, {
  message: "Either courseId or liveStreamId must be provided",
});

router.post('/',
  requireAuth,
  requireRole('TEACHER'),
  validate({ body: createWhiteboardSchema }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const whiteboard = await whiteboardService.createWhiteboard(req.body, userId);
      res.status(201).json({
        success: true,
        data: whiteboard
      });
    } catch (error) {
      console.error('Error creating whiteboard:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to create whiteboard' 
      });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   get:
 *     summary: Get whiteboard by ID
 *     tags: [Whiteboards]
 */
router.get('/:whiteboardId',
  requireAuth,
  validate({ params: z.object({ whiteboardId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const includeActions = req.query.includeActions === 'true';
      const whiteboard = await whiteboardService.getWhiteboardById(req.params.whiteboardId, includeActions);
      
      res.json({
        success: true,
        data: whiteboard
      });
    } catch (error) {
      console.error('Error fetching whiteboard:', error);
      res.status(404).json({ 
        error: error instanceof Error ? error.message : 'Whiteboard not found' 
      });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/courses/{courseId}:
 *   get:
 *     summary: Get whiteboards for a course
 *     tags: [Whiteboards]
 */
router.get('/programs/:programId',
  requireAuth,
  validate({ params: z.object({ programId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await whiteboardService.getProgramWhiteboards(req.params.programId, page, limit);
      
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('Error fetching course whiteboards:', error);
      res.status(500).json({ error: 'Failed to fetch whiteboards' });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/streams/{liveStreamId}:
 *   get:
 *     summary: Get whiteboards for a live stream
 *     tags: [Whiteboards]
 */
router.get('/streams/:liveStreamId',
  requireAuth,
  validate({ params: z.object({ liveStreamId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const whiteboards = await whiteboardService.getStreamWhiteboards(req.params.liveStreamId);
      
      res.json({
        success: true,
        data: whiteboards
      });
    } catch (error) {
      console.error('Error fetching stream whiteboards:', error);
      res.status(500).json({ error: 'Failed to fetch whiteboards' });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   put:
 *     summary: Update whiteboard
 *     tags: [Whiteboards]
 */
const updateWhiteboardSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  isActive: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

router.put('/:whiteboardId',
  requireAuth,
  requireRole('TEACHER'),
  validate({ 
    params: z.object({ whiteboardId: z.string().min(1) }),
    body: updateWhiteboardSchema 
  }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const whiteboard = await whiteboardService.updateWhiteboard(req.params.whiteboardId, userId, req.body);
      
      res.json({
        success: true,
        data: whiteboard
      });
    } catch (error) {
      console.error('Error updating whiteboard:', error);
      res.status(403).json({ 
        error: error instanceof Error ? error.message : 'Failed to update whiteboard' 
      });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}:
 *   delete:
 *     summary: Delete whiteboard
 *     tags: [Whiteboards]
 */
router.delete('/:whiteboardId',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: z.object({ whiteboardId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await whiteboardService.deleteWhiteboard(req.params.whiteboardId, userId);
      
      res.json({
        success: true,
        message: 'Whiteboard deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting whiteboard:', error);
      res.status(403).json({ 
        error: error instanceof Error ? error.message : 'Failed to delete whiteboard' 
      });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/actions:
 *   post:
 *     summary: Add action to whiteboard
 *     tags: [Whiteboards]
 */
const createActionSchema = z.object({
  actionType: z.enum(['draw', 'erase', 'clear', 'undo', 'redo', 'add_text', 'add_shape']),
  data: z.any(), // Flexible JSON structure for different action types
});

router.post('/:whiteboardId/actions',
  requireAuth,
  validate({ 
    params: z.object({ whiteboardId: z.string().min(1) }),
    body: createActionSchema 
  }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const action = await whiteboardService.addAction({
        whiteboardId: req.params.whiteboardId,
        ...req.body
      }, userId);
      
      res.status(201).json({
        success: true,
        data: action
      });
    } catch (error) {
      console.error('Error adding whiteboard action:', error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : 'Failed to add action' 
      });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/actions:
 *   get:
 *     summary: Get whiteboard actions
 *     tags: [Whiteboards]
 */
router.get('/:whiteboardId/actions',
  requireAuth,
  validate({ params: z.object({ whiteboardId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 1000;
      const actions = await whiteboardService.getWhiteboardActions(req.params.whiteboardId, limit);
      
      res.json({
        success: true,
        data: actions
      });
    } catch (error) {
      console.error('Error fetching whiteboard actions:', error);
      res.status(500).json({ error: 'Failed to fetch actions' });
    }
  }
);

/**
 * @swagger
 * /api/whiteboards/{whiteboardId}/clear:
 *   post:
 *     summary: Clear whiteboard (delete all actions)
 *     tags: [Whiteboards]
 */
router.post('/:whiteboardId/clear',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: z.object({ whiteboardId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      await whiteboardService.clearWhiteboard(req.params.whiteboardId, userId);
      
      res.json({
        success: true,
        message: 'Whiteboard cleared successfully'
      });
    } catch (error) {
      console.error('Error clearing whiteboard:', error);
      res.status(403).json({ 
        error: error instanceof Error ? error.message : 'Failed to clear whiteboard' 
      });
    }
  }
);

export default router;
