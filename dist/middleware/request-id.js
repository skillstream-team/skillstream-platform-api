"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestId = void 0;
const crypto_1 = require("crypto");
const sentry_1 = require("../utils/sentry");
/**
 * Request ID middleware
 * Generates unique request IDs for tracing requests across services
 */
const requestId = (req, res, next) => {
    // Get request ID from header or generate new one
    const requestId = req.headers['x-request-id'] || (0, crypto_1.randomUUID)();
    // Attach to request object
    req.requestId = requestId;
    // Add to response header
    res.setHeader('X-Request-ID', requestId);
    // Add breadcrumb to Sentry for tracing
    (0, sentry_1.addBreadcrumb)({
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
exports.requestId = requestId;
