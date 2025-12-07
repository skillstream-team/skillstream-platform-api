import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { addBreadcrumb } from '../utils/sentry';

/**
 * Request ID middleware
 * Generates unique request IDs for tracing requests across services
 */
export const requestId = (req: Request, res: Response, next: NextFunction) => {
  // Get request ID from header or generate new one
  const requestId = req.headers['x-request-id'] as string || randomUUID();
  
  // Attach to request object
  (req as any).requestId = requestId;
  
  // Add to response header
  res.setHeader('X-Request-ID', requestId);
  
  // Add breadcrumb to Sentry for tracing
  addBreadcrumb({
    message: `Request: ${req.method} ${req.path}`,
    category: 'http',
    level: 'info',
    data: {
      requestId,
      method: req.method,
      path: req.path,
    },
  });
  
  next();
};
