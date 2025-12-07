import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

/**
 * Validation middleware factory
 * Creates middleware to validate request body/query/params against a Zod schema
 */
export function validate(schema: {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate body
      if (schema.body) {
        req.body = schema.body.parse(req.body);
      }

      // Validate query
      if (schema.query) {
        req.query = schema.query.parse(req.query);
      }

      // Validate params
      if (schema.params) {
        req.params = schema.params.parse(req.params);
      }

      next();
    } catch (error: unknown) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors.map((err: any) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj };
  
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeString(sanitized[key]) as any;
    } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeObject(sanitized[key]);
    }
  }
  
  return sanitized;
}
