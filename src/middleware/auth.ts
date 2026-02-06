import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { setUser } from '../utils/sentry';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
  };
}

export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // If Firebase middleware already set req.user, we're done
    if (req.user) {
      return next();
    }

    const authHeader = req.header('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const jwtSecret = env.JWT_SECRET;
    
    if (!jwtSecret) {
      return res.status(500).json({ error: 'Server configuration error.' });
    }
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token format.' });
    }
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token. User not found.' });
    }

    req.user = user;
    
    // Set user context in Sentry for error tracking
    setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
    
    next();
  } catch (error: any) {
    // Token expiry is expected when users leave the tab open; log at debug to avoid noise
    if (error.name === 'TokenExpiredError') {
      logger.debug(`Token expired for ${req.path}`);
      return res.status(401).json({
        error: 'Token expired. Please login again.',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Log other auth failures at warn for debugging
    logger.warn(`Authentication failed for ${req.path}`, {
      error: error.name,
      hasToken: !!req.header('Authorization'),
      path: req.path,
    });

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token.' });
    }
    return res.status(401).json({ error: 'Authentication failed.' });
  }
};

export const optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // If Firebase middleware already set req.user, we're done
    if (req.user) {
      return next();
    }

    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return next();
    }

    const jwtSecret = env.JWT_SECRET;
    
    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        email: true,
        role: true
      }
    });

    if (user) {
      req.user = user;
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};
