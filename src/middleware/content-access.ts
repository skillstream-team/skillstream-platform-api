import { Request, Response, NextFunction } from 'express';
import { MonetizationService } from '../modules/courses/services/monetization.service';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

/**
 * Middleware to check if user has access to content
 * Use this on routes that serve content (videos, lessons, etc.)
 */
export async function requireContentAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { collectionId, lessonId } = req.params;
    const monetizationService = new MonetizationService();

    if (collectionId) {
      const canAccess = await monetizationService.canAccess(userId, collectionId, 'PROGRAM');
      if (!canAccess) {
        const requirements = await monetizationService.getAccessRequirements(collectionId, 'PROGRAM');
        return res.status(403).json({
          error: 'Access denied',
          requirements,
          message: requirements.type === 'SUBSCRIPTION'
            ? 'Active subscription required'
            : requirements.type === 'PREMIUM'
            ? 'Purchase required'
            : 'Access denied',
        });
      }
    }

    if (lessonId) {
      const canAccess = await monetizationService.canAccess(userId, lessonId, 'MODULE');
      if (!canAccess) {
        const requirements = await monetizationService.getAccessRequirements(lessonId, 'MODULE');
        return res.status(403).json({
          error: 'Access denied',
          requirements,
          message: requirements.type === 'SUBSCRIPTION'
            ? 'Active subscription required'
            : requirements.type === 'PREMIUM'
            ? 'Purchase required'
            : 'Access denied',
        });
      }
    }

    next();
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
