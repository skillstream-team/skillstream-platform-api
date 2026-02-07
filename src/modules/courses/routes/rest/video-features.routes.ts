import { Router } from 'express';
import { VideoFeaturesService } from '../../services/video-features.service';
import { requireAuth } from '../../../../middleware/auth';
import { requireRole } from '../../../../middleware/roles';
import { requireSubscription } from '../../../../middleware/subscription';
import { validate } from '../../../../middleware/validation';
import { z } from 'zod';

const router = Router();
const videoFeaturesService = new VideoFeaturesService();

/**
 * @swagger
 * /api/videos/{videoId}/chapters:
 *   post:
 *     summary: Create video chapter (Teacher only)
 *     tags: [Video Features]
 */
const createChapterSchema = z.object({
  title: z.string().min(1),
  startTime: z.number().min(0),
  endTime: z.number().min(0).optional(),
  order: z.number().int().min(0),
});

router.post('/videos/:videoId/chapters',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    body: createChapterSchema,
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const chapter = await videoFeaturesService.createChapter({
        videoId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: chapter,
        message: 'Chapter created successfully'
      });
    } catch (error) {
      console.error('Error creating chapter:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create chapter' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/chapters:
 *   get:
 *     summary: Get video chapters
 *     tags: [Video Features]
 */
router.get('/videos/:videoId/chapters',
  validate({ params: z.object({ videoId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const chapters = await videoFeaturesService.getVideoChapters(videoId);

      res.json({
        success: true,
        data: chapters
      });
    } catch (error) {
      console.error('Error fetching chapters:', error);
      res.status(500).json({ error: 'Failed to fetch chapters' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/notes:
 *   post:
 *     summary: Create video note
 *     tags: [Video Features]
 */
const createNoteSchema = z.object({
  timestamp: z.number().min(0),
  content: z.string().min(1),
});

router.post('/videos/:videoId/notes',
  requireAuth,
  requireSubscription,
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    body: createNoteSchema,
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      const note = await videoFeaturesService.createNote({
        videoId,
        userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: note,
        message: 'Note created successfully'
      });
    } catch (error) {
      console.error('Error creating note:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create note' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/notes:
 *   get:
 *     summary: Get user's video notes
 *     tags: [Video Features]
 */
router.get('/videos/:videoId/notes',
  requireAuth,
  requireSubscription,
  validate({ params: z.object({ videoId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      const notes = await videoFeaturesService.getUserVideoNotes(videoId, userId);

      res.json({
        success: true,
        data: notes
      });
    } catch (error) {
      console.error('Error fetching notes:', error);
      res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }
);

router.delete('/videos/:videoId/notes/:noteId',
  requireAuth,
  requireSubscription,
  validate({
    params: z.object({ videoId: z.string().min(1), noteId: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { videoId, noteId } = req.params;
      const userId = (req as any).user?.id;

      await videoFeaturesService.deleteNote(videoId, noteId, userId);

      res.json({
        success: true,
        message: 'Note deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete note' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/bookmarks:
 *   post:
 *     summary: Create video bookmark
 *     tags: [Video Features]
 */
const createBookmarkSchema = z.object({
  timestamp: z.number().min(0),
  title: z.string().optional(),
  notes: z.string().optional(),
});

router.post('/videos/:videoId/bookmarks',
  requireAuth,
  requireSubscription,
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    body: createBookmarkSchema,
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      const bookmark = await videoFeaturesService.createBookmark({
        videoId,
        userId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: bookmark,
        message: 'Bookmark created successfully'
      });
    } catch (error) {
      console.error('Error creating bookmark:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to create bookmark' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/bookmarks:
 *   get:
 *     summary: Get user's video bookmarks
 *     tags: [Video Features]
 */
router.get('/videos/:videoId/bookmarks',
  requireAuth,
  requireSubscription,
  validate({ params: z.object({ videoId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      const bookmarks = await videoFeaturesService.getUserVideoBookmarks(videoId, userId);

      res.json({
        success: true,
        data: bookmarks
      });
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      res.status(500).json({ error: 'Failed to fetch bookmarks' });
    }
  }
);

router.delete('/videos/:videoId/bookmarks/:bookmarkId',
  requireAuth,
  requireSubscription,
  validate({
    params: z.object({ videoId: z.string().min(1), bookmarkId: z.string().min(1) }),
  }),
  async (req, res) => {
    try {
      const { videoId, bookmarkId } = req.params;
      const userId = (req as any).user?.id;

      await videoFeaturesService.deleteBookmark(videoId, bookmarkId, userId);

      res.json({
        success: true,
        message: 'Bookmark deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to delete bookmark' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/transcript:
 *   post:
 *     summary: Create/update video transcript (Teacher only)
 *     tags: [Video Features]
 */
const createTranscriptSchema = z.object({
  language: z.string().default('en'),
  segments: z.array(z.object({
    start: z.number(),
    end: z.number(),
    text: z.string(),
  })),
});

router.post('/videos/:videoId/transcript',
  requireAuth,
  requireRole('TEACHER'),
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    body: createTranscriptSchema,
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const transcript = await videoFeaturesService.upsertTranscript({
        videoId,
        ...req.body,
      });

      res.json({
        success: true,
        data: transcript,
        message: 'Transcript saved successfully'
      });
    } catch (error) {
      console.error('Error saving transcript:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to save transcript' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/transcript:
 *   get:
 *     summary: Get video transcript
 *     tags: [Video Features]
 */
router.get('/videos/:videoId/transcript',
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    query: z.object({
      language: z.string().optional().default('en'),
    }),
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const language = (req.query.language as string) || 'en';

      const transcript = await videoFeaturesService.getVideoTranscript(videoId, language);

      if (!transcript) {
        return res.status(404).json({ error: 'Transcript not found' });
      }

      res.json({
        success: true,
        data: transcript
      });
    } catch (error) {
      console.error('Error fetching transcript:', error);
      res.status(500).json({ error: 'Failed to fetch transcript' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/analytics:
 *   put:
 *     summary: Update video analytics
 *     tags: [Video Features]
 */
const updateAnalyticsSchema = z.object({
  watchTime: z.number().min(0),
  completionRate: z.number().min(0).max(100),
  dropOffPoints: z.array(z.number()).optional(),
  playbackSpeed: z.number().min(0.25).max(2.0).optional(),
});

router.put('/videos/:videoId/analytics',
  requireAuth,
  validate({
    params: z.object({ videoId: z.string().min(1) }),
    body: updateAnalyticsSchema,
  }),
  async (req, res) => {
    try {
      const { videoId } = req.params;
      const userId = (req as any).user?.id;

      const analytics = await videoFeaturesService.updateAnalytics({
        videoId,
        userId,
        ...req.body,
      });

      res.json({
        success: true,
        data: analytics,
        message: 'Analytics updated successfully'
      });
    } catch (error) {
      console.error('Error updating analytics:', error);
      res.status(500).json({ error: (error as Error).message || 'Failed to update analytics' });
    }
  }
);

/**
 * @swagger
 * /api/videos/{videoId}/analytics:
 *   get:
 *     summary: Get video analytics (aggregated)
 *     tags: [Video Features]
 */
router.get('/videos/:videoId/analytics',
  requireAuth,
  requireRole('TEACHER'),
  validate({ params: z.object({ videoId: z.string().min(1) }) }),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      const analytics = await videoFeaturesService.getVideoAnalytics(videoId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      res.status(500).json({ error: 'Failed to fetch analytics' });
    }
  }
);

export default router;
