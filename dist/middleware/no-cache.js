"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.noCache = void 0;
/**
 * No-cache middleware
 * Adds headers to prevent all caching of API responses
 */
const noCache = (req, res, next) => {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('ETag', ''); // Remove ETag support
    next();
};
exports.noCache = noCache;
