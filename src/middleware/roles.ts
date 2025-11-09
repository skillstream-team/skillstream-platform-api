// src/middleware/requireRole.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) return res.status(401).json({ error: 'No token provided' });

      const token = authHeader.split(' ')[1];
      const payload = verifyToken(token);

      if (payload.role !== role) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }

      // Attach user info to req if needed
      (req as any).user = payload;

      next();
    } catch (err) {
      res.status(401).json({ error: 'Invalid or expired token' });
    }
  };
};