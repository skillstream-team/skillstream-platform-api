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

    const [moduleResources, lessonResources, videoRecords] = await Promise.all([
      prisma.moduleResource.findMany({
        where: { moduleId },
        include: { sharer: { select: { id: true, username: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lessonResource.findMany({
        where: { moduleId },
        include: { sharer: { select: { id: true, username: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      // Videos for this module: Video records with moduleId, or programId (standalone modules)
      prisma.video.findMany({
        where: { OR: [{ moduleId }, { programId: moduleId }] },
        select: { id: true, streamId: true, title: true, playbackUrl: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Map Video records to same shape as resources so UI can show them (id, title, type, fileUrl, url=streamId, mimeType)
    const videoAsResources = videoRecords.map((v) => ({
      id: v.id,
      moduleId,
      title: v.title,
      type: 'video',
      fileUrl: v.playbackUrl ?? null,
      url: v.streamId,
      filename: null,
      size: null,
      mimeType: 'video/mp4',
      createdAt: v.createdAt,
    }));

    const data = [...moduleResources, ...lessonResources, ...videoAsResources].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    res.json({ success: true, data });
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

    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } }),
    ]);
    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    if (quickModule) {
      const resource = await prisma.moduleResource.create({
        data: { moduleId, title, type, url, fileUrl, filename, size, mimeType, sharedBy: userId },
        include: { sharer: { select: { id: true, username: true, email: true } } },
      });
      return res.status(201).json({ success: true, data: resource });
    }

    const resource = await prisma.lessonResource.create({
      data: { moduleId, title, type, url, fileUrl, filename, size, mimeType, sharedBy: userId },
      include: { sharer: { select: { id: true, username: true, email: true } } },
    });
    return res.status(201).json({ success: true, data: resource });
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

    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } })
    ]);

    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    let courseId = moduleId;
    if (regularModule) {
      const programModule = await prisma.programModule.findFirst({
        where: { moduleId },
        select: { programId: true }
      });
      if (programModule) courseId = programModule.programId;
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

    if (quickModule) {
      const resource = await prisma.moduleResource.create({
        data: {
          moduleId,
          title: title || filename,
          type: 'file',
          fileUrl,
          filename,
          size,
          mimeType,
          sharedBy: userId,
        },
        include: {
          sharer: { select: { id: true, username: true, email: true } },
          module: { select: { id: true, title: true, scheduledAt: true } },
        },
      });
      return res.status(201).json({ success: true, data: resource });
    }

    const resource = await prisma.lessonResource.create({
      data: {
        moduleId,
        title: title || filename,
        type: 'file',
        fileUrl,
        filename,
        size,
        mimeType,
        sharedBy: userId,
      },
      include: {
        sharer: { select: { id: true, username: true, email: true } },
        module: { select: { id: true, title: true, scheduledAt: true } },
      },
    });
    return res.status(201).json({ success: true, data: resource });
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

    const resource = await prisma.moduleResource.findUnique({
      where: { id: resourceId },
      include: {
        module: {
          select: { teacherId: true }
        }
      }
    });

    if (resource) {
      if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to delete this resource' });
      }
      await prisma.moduleResource.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    const video = await prisma.video.findUnique({
      where: { id: resourceId },
      select: { id: true, uploadedBy: true, programId: true },
    });
    if (video && video.uploadedBy === userId) {
      await prisma.video.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    const lessonResource = await prisma.lessonResource.findFirst({
      where: { id: resourceId, moduleId },
      select: { id: true, sharedBy: true },
    });
    if (lessonResource && lessonResource.sharedBy === userId) {
      await prisma.lessonResource.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    return res.status(404).json({ error: 'Resource not found' });
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
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
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

    if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
      return res.status(503).json({
        error: 'Video upload is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN (with Stream Edit).',
      });
    }

    const { streamId, uploadURL } = await streamService.createDirectUpload({
      collectionId: programId,
      title: title || 'Lesson video',
      type: 'on-demand',
      duration: 3600,
    });

    const resourceTitle = title || 'Video';
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (quickModule) {
      const resource = await prisma.moduleResource.create({
        data: {
          moduleId,
          title: resourceTitle,
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
      return res.status(201).json({
        success: true,
        data: {
          resourceId: resource.id,
          uploadUrl: uploadURL,
          streamId,
          expiresAt,
          title: resource.title,
        },
      });
    }

    const video = await prisma.video.create({
      data: {
        programId,
        moduleId: regularModule ? moduleId : undefined,
        streamId,
        title: resourceTitle,
        type: 'on-demand',
        status: 'pending',
        uploadedBy: userId,
      },
    });
    return res.status(201).json({
      success: true,
      data: {
        resourceId: video.id,
        uploadUrl: uploadURL,
        streamId,
        expiresAt,
        title: video.title,
      },
    });
  } catch (error: any) {
    const cfData = error?.response?.data;
    if (cfData && (cfData.errors || cfData.messages)) {
      logger.error('Error preparing video upload (Cloudflare response)', { error: cfData });
    } else {
      logger.error('Error preparing video upload', error);
    }
    const msg = (error as Error).message || 'Unknown error';
    if (msg.includes('Foreign key') || msg.includes('Record to create not found')) {
      return res.status(400).json({ error: 'This lesson type does not support video upload.', code: 'UNSUPPORTED_MODULE' });
    }
    return res.status(500).json({ error: 'Failed to prepare video upload: ' + msg });
  }
});

/**
 * TUS proxy for Cloudflare Stream: forward initial TUS POST to Stream, create Video/Resource, return Location + stream-media-id.
 * Client (tus-js-client) sends first request here; subsequent PATCH goes to Cloudflare's Location URL.
 * @swagger
 * /api/modules/{moduleId}/videos/tus:
 *   post:
 *     summary: TUS upload creation (proxy to Cloudflare Stream). Use with tus-js-client.
 *     tags: [Resources]
 */
router.post('/modules/:moduleId/videos/tus', requireAuth, async (req, res) => {
  try {
    const { moduleId } = req.params;
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const [regularModule, quickModule] = await Promise.all([
      prisma.module.findUnique({ where: { id: moduleId } }),
      prisma.quickModule.findUnique({ where: { id: moduleId } })
    ]);
    if (!regularModule && !quickModule) {
      return res.status(404).json({ error: 'Module not found' });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;
    if (!accountId || !apiToken) {
      return res.status(503).json({
        error: 'Video upload is not configured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.',
      });
    }

    const tusResumable = req.headers['tus-resumable'] as string | undefined;
    const uploadLength = req.headers['upload-length'] as string | undefined;
    const uploadMetadata = req.headers['upload-metadata'] as string | undefined;
    if (!uploadLength) {
      return res.status(400).json({ error: 'TUS Upload-Length required' });
    }

    const streamUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
    const forwardHeaders: Record<string, string> = {
      'Authorization': `Bearer ${apiToken}`,
      'Upload-Length': uploadLength,
    };
    if (tusResumable) forwardHeaders['Tus-Resumable'] = tusResumable;
    if (uploadMetadata) forwardHeaders['Upload-Metadata'] = uploadMetadata;

    const cfRes = await fetch(streamUrl, {
      method: 'POST',
      headers: forwardHeaders,
    });

    const location = cfRes.headers.get('location');
    const streamMediaId = cfRes.headers.get('stream-media-id');

    if (!cfRes.ok) {
      const text = await cfRes.text();
      logger.error('Cloudflare TUS create failed', { status: cfRes.status, body: text });
      return res.status(cfRes.status >= 400 ? cfRes.status : 502).json({
        error: 'Stream TUS create failed',
        details: text || undefined,
      });
    }

    if (!location || !streamMediaId) {
      logger.error('Cloudflare TUS response missing Location or stream-media-id');
      return res.status(502).json({ error: 'Stream did not return Location or stream-media-id' });
    }

    let programId = moduleId;
    if (regularModule) {
      const programModule = await prisma.programModule.findFirst({
        where: { moduleId },
        select: { programId: true }
      });
      if (programModule) programId = programModule.programId;
    }

    const resourceTitle = 'Video';
    let resourceId: string;

    if (quickModule) {
      const resource = await prisma.moduleResource.create({
        data: {
          moduleId,
          title: resourceTitle,
          type: 'video',
          fileUrl: null,
          url: streamMediaId,
          filename: null,
          size: null,
          mimeType: 'video/mp4',
          sharedBy: userId,
        },
      });
      resourceId = resource.id;
    } else {
      const video = await prisma.video.create({
        data: {
          programId,
          moduleId: regularModule ? moduleId : undefined,
          streamId: streamMediaId,
          title: resourceTitle,
          type: 'on-demand',
          status: 'pending',
          uploadedBy: userId,
        },
      });
      resourceId = video.id;
    }

    res.status(201);
    res.setHeader('Location', location);
    res.setHeader('Stream-Media-Id', streamMediaId);
    res.setHeader('X-Resource-Id', resourceId);
    res.setHeader('Access-Control-Expose-Headers', 'Location, Stream-Media-Id, X-Resource-Id');
    res.end();
  } catch (error: any) {
    logger.error('Error in TUS proxy', error);
    const msg = (error as Error).message || 'Unknown error';
    return res.status(500).json({ error: 'TUS proxy failed: ' + msg });
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

    if (resource && resource.type === 'video' && resource.url) {
      const streamId = resource.url;
      const streamVideo = await streamService.getVideo(streamId);
      const playbackUrl = streamVideo.playbackUrl || undefined;
      const updated = await prisma.moduleResource.update({
        where: { id: resourceId },
        data: { fileUrl: playbackUrl || null },
        include: { sharer: { select: { id: true, username: true, email: true } } },
      });
      return res.json({
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
    }

    const video = await prisma.video.findUnique({
      where: { id: resourceId },
      select: { id: true, programId: true, streamId: true, title: true, playbackUrl: true, status: true },
    });
    if (!video) {
      return res.status(404).json({ error: 'Video resource not found' });
    }
    const streamVideo = await streamService.getVideo(video.streamId);
    const playbackUrl = streamVideo.playbackUrl || undefined;
    const updatedVideo = await prisma.video.update({
      where: { id: resourceId },
      data: {
        playbackUrl: playbackUrl || null,
        status: streamVideo.status,
        thumbnailUrl: streamVideo.thumbnailUrl || undefined,
        duration: streamVideo.duration ?? undefined,
      },
    });

    return res.json({
      success: true,
      data: {
        id: updatedVideo.id,
        title: updatedVideo.title,
        type: 'video',
        fileUrl: updatedVideo.playbackUrl,
        streamId: updatedVideo.streamId,
        status: updatedVideo.status,
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
    const moduleId = req.params.lessonId;
    const [moduleResources, lessonResources] = await Promise.all([
      prisma.moduleResource.findMany({
        where: { moduleId },
        include: { sharer: { select: { id: true, username: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.lessonResource.findMany({
        where: { moduleId },
        include: { sharer: { select: { id: true, username: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    const data = [...moduleResources, ...lessonResources].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json({ success: true, data });
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

    if (quickModule) {
      const resource = await prisma.moduleResource.create({
        data: {
          moduleId,
          title: title || filename,
          type: 'file',
          fileUrl,
          filename,
          size,
          mimeType,
          sharedBy: userId,
        },
        include: {
          sharer: { select: { id: true, username: true, email: true } },
          module: { select: { id: true, title: true, scheduledAt: true } },
        },
      });
      return res.status(201).json({ success: true, data: resource });
    }

    const resource = await prisma.lessonResource.create({
      data: {
        moduleId,
        title: title || filename,
        type: 'file',
        fileUrl,
        filename,
        size,
        mimeType,
        sharedBy: userId,
      },
      include: {
        sharer: { select: { id: true, username: true, email: true } },
        module: { select: { id: true, title: true, scheduledAt: true } },
      },
    });
    return res.status(201).json({ success: true, data: resource });
  } catch (error) {
    logger.error('Error uploading resource', error);
    res.status(500).json({ error: 'Failed to upload resource: ' + (error as Error).message });
  }
});

router.delete('/lessons/:lessonId/resources/:resourceId', requireAuth, async (req, res) => {
  try {
    const { lessonId, resourceId } = req.params;
    const moduleId = lessonId;
    const userId = (req as any).user?.id;

    const resource = await prisma.moduleResource.findUnique({
      where: { id: resourceId },
      include: { module: { select: { teacherId: true } } },
    });
    if (resource) {
      if (resource.sharedBy !== userId && resource.module?.teacherId !== userId) {
        return res.status(403).json({ error: 'You do not have permission to delete this resource' });
      }
      await prisma.moduleResource.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    const video = await prisma.video.findUnique({
      where: { id: resourceId },
      select: { id: true, uploadedBy: true },
    });
    if (video && video.uploadedBy === userId) {
      await prisma.video.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    const lessonResource = await prisma.lessonResource.findFirst({
      where: { id: resourceId, moduleId },
      select: { id: true, sharedBy: true },
    });
    if (lessonResource && lessonResource.sharedBy === userId) {
      await prisma.lessonResource.delete({ where: { id: resourceId } });
      return res.json({ success: true, message: 'Resource deleted successfully' });
    }

    return res.status(404).json({ error: 'Resource not found' });
  } catch (error) {
    logger.error('Error deleting resource', error);
    res.status(500).json({ error: 'Failed to delete resource' });
  }
});

export default router;

