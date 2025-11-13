import { Request, Response, NextFunction } from 'express';

/**
 * Request logging middleware
 * Logs all incoming requests for monitoring and debugging
 */
export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, path, ip } = req;

  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${path} - ${ip}`);

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    const logLevel = statusCode >= 400 ? 'ERROR' : 'INFO';
    
    console.log(
      `[${new Date().toISOString()}] ${logLevel} ${method} ${path} - ${statusCode} - ${duration}ms`
    );
  });

  next();
};

