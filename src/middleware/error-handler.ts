import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { captureException } from '../utils/sentry';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 * Handles all errors and returns appropriate responses
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error for monitoring
  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // Send to Sentry in production (only for server errors, not client errors)
  const appError = err as AppError;
  const statusCode = appError.statusCode || 500;
  
  // Only send server errors (5xx) to Sentry, not client errors (4xx)
  if (statusCode >= 500) {
    captureException(err, {
      user: (req as any).user ? {
        id: (req as any).user.id,
        email: (req as any).user.email,
        username: (req as any).user.username,
      } : undefined,
      tags: {
        path: req.path,
        method: req.method,
        statusCode: statusCode.toString(),
        requestId: (req as any).requestId || 'unknown',
      },
      extra: {
        requestId: (req as any).requestId,
        query: req.query,
        body: req.body,
        headers: {
          'user-agent': req.get('user-agent'),
          'content-type': req.get('content-type'),
        },
      },
    });
  }

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate entry',
        message: 'A record with this information already exists',
      });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: 'Not found',
        message: 'The requested resource was not found',
      });
    }
    return res.status(400).json({
      error: 'Database error',
      message: 'An error occurred while processing your request',
    });
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'Invalid data provided',
    });
  }

  // Custom application errors (statusCode already set above)
  const message = appError.isOperational || process.env.NODE_ENV === 'development'
    ? err.message
    : 'An internal server error occurred';

  res.status(statusCode).json({
    error: statusCode >= 500 ? 'Internal server error' : 'Request error',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create custom error
 */
export function createError(message: string, statusCode: number = 400): AppError {
  const error = new Error(message) as AppError;
  error.statusCode = statusCode;
  error.isOperational = true;
  return error;
}

