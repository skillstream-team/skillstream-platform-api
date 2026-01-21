import { Request, Response, NextFunction } from 'express';

/**
 * No-cache middleware
 * Adds headers to prevent all caching of API responses
 */
export const noCache = (req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', ''); // Remove ETag support
  
  next();
};
