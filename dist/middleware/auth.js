"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
const sentry_1 = require("../utils/sentry");
const env_1 = require("../utils/env");
const logger_1 = require("../utils/logger");
const requireAuth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const jwtSecret = env_1.env.JWT_SECRET;
        if (!jwtSecret) {
            return res.status(500).json({ error: 'Server configuration error.' });
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (!decoded || !decoded.id) {
            return res.status(401).json({ error: 'Invalid token format.' });
        }
        // Get user from database
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });
        if (!user) {
            return res.status(401).json({ error: 'Invalid token. User not found.' });
        }
        req.user = user;
        // Set user context in Sentry for error tracking
        (0, sentry_1.setUser)({
            id: user.id,
            email: user.email,
            username: user.username,
        });
        next();
    }
    catch (error) {
        // Log authentication errors for debugging (but don't expose sensitive info)
        logger_1.logger.warn(`Authentication failed for ${req.path}`, {
            error: error.name,
            hasToken: !!req.header('Authorization'),
            path: req.path,
        });
        // More specific error messages
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expired. Please login again.' });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ error: 'Invalid token.' });
        }
        return res.status(401).json({ error: 'Authentication failed.' });
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return next();
        }
        const jwtSecret = env_1.env.JWT_SECRET;
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        // Get user from database
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true
            }
        });
        if (user) {
            req.user = user;
        }
        next();
    }
    catch (error) {
        // If token is invalid, just continue without user
        next();
    }
};
exports.optionalAuth = optionalAuth;
