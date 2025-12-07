"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestTimeout = void 0;
/**
 * Request timeout middleware
 * Prevents hanging requests by setting a timeout
 */
const requestTimeout = (timeoutMs = 30000) => {
    return (req, res, next) => {
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
exports.requestTimeout = requestTimeout;
