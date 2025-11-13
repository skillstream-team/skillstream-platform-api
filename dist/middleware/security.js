"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsOptions = exports.securityHeaders = void 0;
const env_1 = require("../utils/env");
/**
 * Security headers middleware
 */
const securityHeaders = (req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    // Remove X-Powered-By header
    res.removeHeader('X-Powered-By');
    next();
};
exports.securityHeaders = securityHeaders;
/**
 * CORS configuration
 */
exports.corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) {
            return callback(null, true);
        }
        const allowedOrigins = env_1.env.FRONTEND_URL
            ? env_1.env.FRONTEND_URL.split(',').map(url => url.trim())
            : [];
        // In development, allow localhost
        if (env_1.env.NODE_ENV === 'development') {
            allowedOrigins.push('http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000');
        }
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};
