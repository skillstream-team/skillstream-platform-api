"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireAuth = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../utils/prisma");
const sentry_1 = require("../utils/sentry");
const requireAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Access denied. No token provided.' });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            console.error('JWT_SECRET is not configured');
            return res.status(500).json({ error: 'Server configuration error' });
        }
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
        res.status(401).json({ error: 'Invalid token.' });
    }
};
exports.requireAuth = requireAuth;
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return next();
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            // If JWT_SECRET is not configured, skip auth
            return next();
        }
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
