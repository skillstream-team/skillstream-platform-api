import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';
import { CloudflareR2Service } from '../../services/cloudflare-r2.service';

const router = Router();
const r2Service = new CloudflareR2Service();

/**
 * @swagger
 * /api/users/{userId}/resources/recent:
 *   get:
 *     summary: Get recent resources for a user
 *     tags: [Resources]
 */
router.get('/users/:userId/resources/recent', requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    // Get resources from lessons user is part of
    const bookings = await prisma.booking.findMany({
      where: { studentId: userId },
      select: { slot: true }
    });

    // Get resources from quick lessons user is involved in
    const resources = await prisma.lessonResource.findMany({
      where: {
        OR: [
          { sharedBy: userId },
          {
            lesson: {
              OR: [
                { teacherId: userId },
                { attendance: { some: { studentId: userId } } }
              ]
            }
          }
        ]
      },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        },
        lesson: {
          select: { id: true, title: true, scheduledAt: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error fetching recent resources', error);
    res.status(500).json({ error: 'Failed to fetch recent resources' });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/resources:
 *   get:
 *     summary: Get all resources for a lesson
 *     tags: [Resources]
 */
router.get('/lessons/:lessonId/resources', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;

    const resources = await prisma.lessonResource.findMany({
      where: { lessonId },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        },
        lesson: {
          select: { id: true, title: true, scheduledAt: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error fetching lesson resources', error);
    res.status(500).json({ error: 'Failed to fetch lesson resources' });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/resources:
 *   post:
 *     summary: Share a resource in a lesson
 *     tags: [Resources]
 */
router.post('/lessons/:lessonId/resources', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = (req as any).user?.id;
    const { title, type, url, fileUrl, filename, size, mimeType } = req.body;

    const resource = await prisma.lessonResource.create({
      data: {
        lessonId,
        title,
        type,
        url,
        fileUrl,
        filename,
        size,
        mimeType,
        sharedBy: userId
      },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: resource
    });
  } catch (error) {
    logger.error('Error sharing resource', error);
    res.status(500).json({ error: 'Failed to share resource' });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/resources/upload:
 *   post:
 *     summary: Upload a file and attach to lesson
 *     tags: [Resources]
 */
router.post('/lessons/:lessonId/resources/upload', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const userId = (req as any).user?.id;
    const { file, title, filename, contentType } = req.body;

    if (!file || !filename || !contentType) {
      return res.status(400).json({ 
        error: 'file (base64), filename, and contentType are required' 
      });
    }

    // Verify lesson exists - LessonResource only relates to QuickLesson in schema
    const quickLesson = await prisma.quickLesson.findUnique({
      where: { id: lessonId }
    });

    if (!quickLesson) {
      // Also check if it's a regular Lesson (for better error message)
      const regularLesson = await prisma.lesson.findUnique({
        where: { id: lessonId }
      });
      
      if (regularLesson) {
        return res.status(400).json({ 
          error: 'Resources can only be uploaded to QuickLessons, not regular Lessons' 
        });
      }
      
      return res.status(404).json({ error: 'Lesson not found' });
    }

    // Use lessonId as courseId for R2 organization (QuickLesson doesn't have collectionId)
    const courseId = lessonId;

    // Decode base64 file
    const fileBuffer = Buffer.from(file, 'base64');

    // Determine file type from content type
    let fileType: 'pdf' | 'image' | 'document' | 'zip' | 'other' = 'other';
    if (contentType.includes('pdf')) fileType = 'pdf';
    else if (contentType.startsWith('image/')) fileType = 'image';
    else if (contentType.includes('zip') || contentType.includes('archive')) fileType = 'zip';
    else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text')) fileType = 'document';

    // courseId is determined above based on lesson type

    // Upload to Cloudflare R2
    const uploadResult = await r2Service.uploadFile({
      file: fileBuffer,
      filename,
      contentType,
      collectionId: courseId.toString(),
      type: fileType,
    });

    // Create resource record
    const resource = await prisma.lessonResource.create({
      data: {
        lessonId,
        title: title || filename,
        type: 'file',
        fileUrl: uploadResult.url,
        filename: uploadResult.filename,
        size: uploadResult.size,
        mimeType: uploadResult.contentType,
        sharedBy: userId
      },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        },
        lesson: {
          select: { id: true, title: true, scheduledAt: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: resource
    });
  } catch (error) {
    logger.error('Error uploading resource', error);
    res.status(500).json({ error: 'Failed to upload resource: ' + (error as Error).message });
  }
});

/**
 * @swagger
 * /api/lessons/{lessonId}/resources/{resourceId}:
 *   delete:
 *     summary: Delete a resource from a lesson
 *     tags: [Resources]
 */
router.delete('/lessons/:lessonId/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { lessonId, resourceId } = req.params;
    const userId = (req as any).user?.id;

    // Check if resource exists and user has permission
    const resource = await prisma.lessonResource.findUnique({
      where: { id: resourceId },
      include: {
        lesson: {
          select: { teacherId: true }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user is the sharer or the lesson teacher
    if (resource.sharedBy !== userId && resource.lesson?.teacherId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this resource' });
    }

    // Delete the resource
    await prisma.lessonResource.delete({
      where: { id: resourceId }
    });

    res.json({
      success: true,
      message: 'Resource deleted successfully'
    });
  } catch (error) {
    logger.error('Error deleting resource', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;

