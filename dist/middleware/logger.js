"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = void 0;
/**
 * Request logging middleware
 * Logs all incoming requests for monitoring and debugging
 */
const requestLogger = (req, res, next) => {
    const start = Date.now();
    const { method, path, ip } = req;
    const requestId = req.requestId || 'unknown';
    // Log request
    console.log(`[${new Date().toISOString()}] [${requestId}] ${method} ${path} - ${ip}`);
    // Log response when finished
    res.on('finish', () => {
        const duration = Date.now() - start;
        const { statusCode } = res;
        const logLevel = statusCode >= 400 ? 'ERROR' : 'INFO';
        console.log(`[${new Date().toISOString()}] [${requestId}] ${logLevel} ${method} ${path} - ${statusCode} - ${duration}ms`);
    });
    next();
};
exports.requestLogger = requestLogger;
