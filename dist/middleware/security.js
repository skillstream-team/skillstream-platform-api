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
        // Always allow localhost origins (for local development even when backend is in production)
        const localhostOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:3001',
            'http://127.0.0.1:5173',
            'http://127.0.0.1:5174',
            'http://127.0.0.1:5175'
        ];
        // Check if origin is localhost
        const isLocalhost = localhostOrigins.includes(origin) ||
            origin.startsWith('http://localhost:') ||
            origin.startsWith('http://127.0.0.1:');
        // In development, always allow localhost
        if (env_1.env.NODE_ENV === 'development') {
            allowedOrigins.push(...localhostOrigins);
        }
        // In production, allow localhost for development purposes
        // but still require FRONTEND_URL for non-localhost origins
        if (env_1.env.NODE_ENV === 'production') {
            if (isLocalhost) {
                // Allow localhost even in production (for local dev against deployed backend)
                return callback(null, true);
            }
            // For non-localhost origins in production, require FRONTEND_URL
            if (allowedOrigins.length === 0) {
                return callback(new Error('CORS: FRONTEND_URL must be set in production for non-localhost origins'));
            }
        }
        if (allowedOrigins.length === 0 || allowedOrigins.includes(origin) || isLocalhost) {
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
