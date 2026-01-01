// src/middleware/firebase-auth.ts
// Middleware to verify Firebase ID tokens and map to internal user ID
// This allows Firebase-authenticated requests to work with the existing backend

import { Request, Response, NextFunction } from 'express';
import { getAuth } from '../utils/firebase';
import { prisma } from '../utils/prisma';
import { setUser } from '../utils/sentry';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    email: string;
    role: string;
    firebaseUid?: string;
  };
}

/**
 * Verify Firebase ID token and map to internal user
 * This middleware checks if the token is a Firebase token and verifies it
 */
export const verifyFirebaseToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(); // Not a Firebase token, continue to next middleware
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Check if this looks like a Firebase token (JWT tokens are typically shorter)
    // Firebase tokens are longer and have a specific structure
    // For now, we'll try to verify as Firebase token first
    try {
      const auth = getAuth();
      const decodedToken = await auth.verifyIdToken(token);
      
      // Find user by firebaseUid (using findFirst since firebaseUid is not @unique in schema)
      const user = await prisma.user.findFirst({
        where: { firebaseUid: decodedToken.uid },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
          firebaseUid: true,
        },
      });

      if (!user) {
        // User not found - might be a new Firebase user that needs to be created
        // This should be handled by the sync endpoint
        return next();
      }

      req.user = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        firebaseUid: user.firebaseUid || undefined,
      };

      // Set user context in Sentry
      setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });

      return next();
    } catch (firebaseError) {
      // Not a Firebase token, continue to next middleware (JWT verification)
      return next();
    }
  } catch (error) {
    // If there's an error, continue to next middleware
    return next();
  }
};

/**
 * Require authentication via either Firebase or JWT
 * This middleware tries Firebase first, then falls back to JWT
 */
export const requireAuthFlexible = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // First try Firebase token
  await verifyFirebaseToken(req, res, async () => {
    // If Firebase auth succeeded, user is set
    if (req.user) {
      return next();
    }

    // Fall back to JWT verification
    try {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        console.error('JWT_SECRET is not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }
      
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          username: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }

      req.user = user;
      
      // Set user context in Sentry
      setUser({
        id: user.id,
        email: user.email,
        username: user.username,
      });
      
      next();
    } catch (error) {
      res.status(401).json({ error: 'Invalid token.' });
    }
  });
};

