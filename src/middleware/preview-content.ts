import { Request, Response, NextFunction } from 'express';
import { prisma } from '../utils/prisma';
import { SubscriptionService } from '../modules/subscriptions/services/subscription.service';

const subscriptionService = new SubscriptionService();

/**
 * Middleware to allow access to preview content without subscription
 * Checks if the content (lesson/video) is marked as preview
 * If it's preview, allows access. If not, requires subscription.
 */
export async function allowPreviewContent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const user = (req as any).user;
    
    // If no user, only allow preview content
    if (!user) {
      // Check if this is a preview lesson/video
      const isPreview = await checkIfPreviewContent(req);
      if (!isPreview) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      return next();
    }

    // Teachers and Admins have full access
    if (user.role === 'TEACHER' || user.role === 'ADMIN') {
      return next();
    }

    // Check if user has subscription
    const hasSubscription = await subscriptionService.hasActiveSubscription(user.id);
    
    if (hasSubscription) {
      return next();
    }

    // If no subscription, only allow preview content
    const isPreview = await checkIfPreviewContent(req);
    if (!isPreview) {
      return res.status(403).json({
        error: 'Active subscription required. This content is not available as a preview.',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Helper function to check if the requested content is preview
 */
async function checkIfPreviewContent(req: Request): Promise<boolean> {
  const { lessonId, videoId } = req.params;

  if (lessonId) {
    const module = await prisma.module.findUnique({
      where: { id: lessonId },
      select: { isPreview: true },
    });
    return module?.isPreview || false;
  }

  if (videoId) {
    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { isPreview: true },
    });
    return video?.isPreview || false;
  }

  // If no lessonId or videoId, assume it's not preview
  return false;
}

/**
 * Middleware to get preview content for a course (public access)
 * Returns only preview lessons and videos
 */
export async function getPreviewContent(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { collectionId } = req.params;

    const [previewModules, previewVideos] = await Promise.all([
      prisma.module.findMany({
        where: {
          programModules: {
            some: {
              programId: collectionId,
            },
          },
          isPreview: true,
        },
        select: {
          id: true,
          title: true,
          order: true,
          duration: true,
          createdAt: true,
        },
        orderBy: { order: 'asc' },
      }),
      prisma.video.findMany({
        where: {
          programId: collectionId,
          isPreview: true,
        },
        select: {
          id: true,
          title: true,
          description: true,
          thumbnailUrl: true,
          duration: true,
          playbackUrl: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    (req as any).previewContent = {
      lessons: previewModules,
      videos: previewVideos,
    };

    next();
  } catch (error) {
    next(error);
  }
}
