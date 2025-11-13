"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = exports.errorHandler = void 0;
exports.createError = createError;
const client_1 = require("@prisma/client");
/**
 * Global error handling middleware
 * Handles all errors and returns appropriate responses
 */
const errorHandler = (err, req, res, next) => {
    // Log error for monitoring
    console.error('Error:', {
        message: err.message,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        path: req.path,
        method: req.method,
    });
    // Prisma errors
    if (err instanceof client_1.Prisma.PrismaClientKnownRequestError) {
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
    if (err instanceof client_1.Prisma.PrismaClientValidationError) {
        return res.status(400).json({
            error: 'Validation error',
            message: 'Invalid data provided',
        });
    }
    // Custom application errors
    const appError = err;
    const statusCode = appError.statusCode || 500;
    const message = appError.isOperational || process.env.NODE_ENV === 'development'
        ? err.message
        : 'An internal server error occurred';
    res.status(statusCode).json({
        error: statusCode >= 500 ? 'Internal server error' : 'Request error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
/**
 * Async error wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.asyncHandler = asyncHandler;
/**
 * Create custom error
 */
function createError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.isOperational = true;
    return error;
}
