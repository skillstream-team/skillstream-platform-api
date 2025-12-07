import { Request, Response, NextFunction } from 'express';

/**
 * Request timeout middleware
 * Prevents hanging requests by setting a timeout
 */
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Set timeout
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'Request timeout',
          message: 'The request took too long to process',
        });
      }
    }, timeoutMs);

    // Clear timeout when response finishes
    res.on('finish', () => {
      clearTimeout(timeout);
    });

    res.on('close', () => {
      clearTimeout(timeout);
    });

    next();
  };
};
