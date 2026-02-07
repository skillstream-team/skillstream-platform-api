import { Router } from 'express';
import { requireAuth } from '../../../../middleware/auth';
import { prisma } from '../../../../utils/prisma';
import { logger } from '../../../../utils/logger';
import { CloudflareR2Service } from '../../services/cloudflare-r2.service';
import { CloudflareStreamService } from '../../services/cloudflare-stream.service';
import { isCloudflareImagesConfigured, uploadImageToCloudflareImages } from '../../../../utils/cloudflare-images';

const router = Router();
const r2Service = new CloudflareR2Service();
const streamService = new CloudflareStreamService();

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

    // Get resources from modules user is part of
    const bookings = await prisma.booking.findMany({
      where: { studentId: userId },
      select: { slot: true }
    });

    // Get resources from quick modules user is involved in
    const resources = await prisma.moduleResource.findMany({
      where: {
        OR: [
          { sharedBy: userId },
          {
            module: {
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
        module: {
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
 * /api/modules/{moduleId}/resources:
 *   get:
 *     summary: Get all resources for a module
 *     tags: [Resources]
 */
router.get('/modules/:moduleId/resources', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;

    // ModuleResource schema only relates to QuickModule, but moduleId is just a string
    // So we can query by moduleId directly without the relation constraint
    const resources = await prisma.moduleResource.findMany({
      where: { moduleId },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error fetching module resources', error);
    res.status(500).json({ error: 'Failed to fetch module resources' });
  }
});

/**
 * @swagger
 * /api/modules/{moduleId}/resources:
 *   post:
 *     summary: Share a resource in a module
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/resources', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = (req as any).user?.id;
    const { title, type, url, fileUrl, filename, size, mimeType } = req.body;

    const resource = await prisma.moduleResource.create({
      data: {
        moduleId,
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
 * /api/modules/{moduleId}/resources/upload:
 *   post:
 *     summary: Upload a file and attach to module
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/resources/upload', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = (req as any).user?.id;
    const { file, title, filename, contentType } = req.body;

    if (!file || !filename || !contentType) {
      return res.status(400).json({ 
        error: 'file (base64), filename, and contentType are required' 
      });
    }

    // Videos must use the Stream flow (POST .../videos/prepare then upload to returned URL), not R2
    if (contentType.startsWith('video/')) {
      return res.status(400).json({
        error: 'Video uploads use Cloudflare Stream. Use POST /modules/:moduleId/videos/prepare to get an upload URL, then upload the file to that URL.',
        code: 'VIDEO_USE_STREAM',
      });
    }

    // Verify module exists - check both Module and QuickModule types
    // Even though schema shows ModuleResource relates to QuickModule, 
    // moduleId is just a string field, so we can support both types
    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } })
    ]);

    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    // Determine courseId based on module type
    // For regular Module, try to get programId from ProgramModule relation
    // For QuickModule, use moduleId as courseId
    let courseId = moduleId;
    if (regularModule) {
      // Try to find the program this module belongs to
      const programModule = await prisma.programModule.findFirst({
        where: { moduleId },
        select: { programId: true }
      });
      if (programModule) {
        courseId = programModule.programId;
      }
    }

    const fileBuffer = Buffer.from(file, 'base64');
    let fileUrl: string;
    let size: number;
    let mimeType: string;

    if (contentType.startsWith('image/') && isCloudflareImagesConfigured()) {
      const result = await uploadImageToCloudflareImages(fileBuffer, filename, contentType);
      fileUrl = result.url;
      size = fileBuffer.length;
      mimeType = contentType;
    } else {
      let fileType: 'pdf' | 'image' | 'document' | 'zip' | 'other' = 'other';
      if (contentType.includes('pdf')) fileType = 'pdf';
      else if (contentType.startsWith('image/')) fileType = 'image';
      else if (contentType.includes('zip') || contentType.includes('archive')) fileType = 'zip';
      else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text')) fileType = 'document';
      const uploadResult = await r2Service.uploadFile({
        file: fileBuffer,
        filename,
        contentType,
        programId: courseId.toString(),
        type: fileType,
      });
      fileUrl = uploadResult.url;
      size = uploadResult.size;
      mimeType = uploadResult.contentType;
    }

    const resource = await prisma.moduleResource.create({
      data: {
        moduleId,
        title: title || filename,
        type: 'file',
        fileUrl,
        filename,
        size,
        mimeType,
        sharedBy: userId
      },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        },
        module: {
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
 * /api/modules/{moduleId}/resources/{resourceId}:
 *   delete:
 *     summary: Delete a resource from a module
 *     tags: [Resources]
 */
router.delete('/modules/:moduleId/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { moduleId, resourceId } = req.params;
    const userId = (req as any).user?.id;

    // Check if resource exists and user has permission
    const resource = await prisma.moduleResource.findUnique({
      where: { id: resourceId },
      include: {
        module: {
          select: { teacherId: true }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Check if user is the sharer or the module teacher
    if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this resource' });
    }

    // Delete the resource
    await prisma.moduleResource.delete({
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

/**
 * @swagger
 * /api/modules/{moduleId}/videos/prepare:
 *   post:
 *     summary: Prepare a lesson video upload (Cloudflare Stream). Returns upload URL for client to PUT the file.
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/videos/prepare', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = (req as any).user?.id;
    const { title } = req.body;

    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } })
    ]);
    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    let programId = moduleId;
    if (regularModule) {
      const programModule = await prisma.programModule.findFirst({
        where: { moduleId },
        select: { programId: true }
      });
      if (programModule) programId = programModule.programId;
    }

    const { streamId, uploadURL } = await streamService.createDirectUpload({
      collectionId: programId,
      title: title || 'Lesson video',
      type: 'on-demand',
      duration: 3600,
    });

    const resource = await prisma.moduleResource.create({
      data: {
        moduleId,
        title: title || 'Video',
        type: 'video',
        fileUrl: null,
        url: streamId,
        filename: null,
        size: null,
        mimeType: 'video/mp4',
        sharedBy: userId,
      },
      include: {
        sharer: { select: { id: true, username: true, email: true } },
        module: { select: { id: true, title: true, scheduledAt: true } },
      },
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    res.status(201).json({
      success: true,
      data: {
        resourceId: resource.id,
        uploadUrl: uploadURL,
        streamId,
        expiresAt,
        title: resource.title,
      },
    });
  } catch (error) {
    logger.error('Error preparing video upload', error);
    res.status(500).json({ error: 'Failed to prepare video upload: ' + (error as Error).message });
  }
});

/**
 * @swagger
 * /api/modules/{moduleId}/videos/{resourceId}/status:
 *   get:
 *     summary: Refresh lesson video status from Cloudflare Stream and return resource with playback URL.
 *     tags: [Resources]
 */
router.get('/modules/:moduleId/videos/:resourceId/status', requireAuth, async (req, res) => {
  try {
    const { moduleId, resourceId } = req.params;

    const resource = await prisma.moduleResource.findFirst({
      where: { id: resourceId, moduleId },
      include: { sharer: { select: { id: true, username: true, email: true } } },
    });
    if (!resource || resource.type !== 'video' || !resource.url) {
      return res.status(404).json({ error: 'Video resource not found' });
    }

    const streamId = resource.url;
    const streamVideo = await streamService.getVideo(streamId);
    const playbackUrl = streamVideo.playbackUrl || undefined;

    const updated = await prisma.moduleResource.update({
      where: { id: resourceId },
      data: { fileUrl: playbackUrl || null },
      include: { sharer: { select: { id: true, username: true, email: true } } },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        title: updated.title,
        type: updated.type,
        fileUrl: updated.fileUrl,
        streamId,
        status: streamVideo.status,
      },
    });
  } catch (error) {
    logger.error('Error fetching video status', error);
    res.status(500).json({ error: 'Failed to fetch video status: ' + (error as Error).message });
  }
});

// Backward compatibility routes for /lessons endpoints
router.get('/lessons/:lessonId/resources', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const moduleId = lessonId;

    const resources = await prisma.moduleResource.findMany({
      where: { moduleId },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    logger.error('Error fetching module resources', error);
    res.status(500).json({ error: 'Failed to fetch module resources' });
  }
});

router.post('/lessons/:lessonId/resources/upload', requireAuth, async (req, res) => {
  try {
    const { lessonId } = req.params;
    const moduleId = lessonId;
    const userId = (req as any).user?.id;
    const { file, title, filename, contentType } = req.body;

    if (!file || !filename || !contentType) {
      return res.status(400).json({ 
        error: 'file (base64), filename, and contentType are required' 
      });
    }

    if (contentType.startsWith('video/')) {
      return res.status(400).json({
        error: 'Video uploads use Cloudflare Stream. Use POST /modules/:moduleId/videos/prepare to get an upload URL, then upload the file to that URL.',
        code: 'VIDEO_USE_STREAM',
      });
    }

    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } })
    ]);

    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Lesson not found' });
    }

    let courseId = moduleId;
    if (regularModule) {
      const programModule = await prisma.programModule.findFirst({
        where: { moduleId },
        select: { programId: true }
      });
      if (programModule) {
        courseId = programModule.programId;
      }
    }

    const fileBuffer = Buffer.from(file, 'base64');
    let fileUrl: string;
    let size: number;
    let mimeType: string;

    if (contentType.startsWith('image/') && isCloudflareImagesConfigured()) {
      const result = await uploadImageToCloudflareImages(fileBuffer, filename, contentType);
      fileUrl = result.url;
      size = fileBuffer.length;
      mimeType = contentType;
    } else {
      let fileType: 'pdf' | 'image' | 'document' | 'zip' | 'other' = 'other';
      if (contentType.includes('pdf')) fileType = 'pdf';
      else if (contentType.startsWith('image/')) fileType = 'image';
      else if (contentType.includes('zip') || contentType.includes('archive')) fileType = 'zip';
      else if (contentType.includes('document') || contentType.includes('word') || contentType.includes('text')) fileType = 'document';
      const uploadResult = await r2Service.uploadFile({
        file: fileBuffer,
        filename,
        contentType,
        programId: courseId.toString(),
        type: fileType,
      });
      fileUrl = uploadResult.url;
      size = uploadResult.size;
      mimeType = uploadResult.contentType;
    }

    const resource = await prisma.moduleResource.create({
      data: {
        moduleId,
        title: title || filename,
        type: 'file',
        fileUrl,
        filename,
        size,
        mimeType,
        sharedBy: userId
      },
      include: {
        sharer: {
          select: { id: true, username: true, email: true }
        },
        module: {
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

router.delete('/lessons/:lessonId/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { lessonId, resourceId } = req.params;
    const userId = (req as any).user?.id;

    const resource = await prisma.moduleResource.findUnique({
      where: { id: resourceId },
      include: {
        module: {
          select: { teacherId: true }
        }
      }
    });

    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to delete this resource' });
    }

    await prisma.moduleResource.delete({
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

