"use strict";
// src/middleware/firebase-auth.ts
// Middleware to verify Firebase ID tokens and map to internal user ID
// This allows Firebase-authenticated requests to work with the existing backend
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuthFlexible = exports.verifyFirebaseToken = void 0;
const firebase_1 = require("../utils/firebase");
const prisma_1 = require("../utils/prisma");
const sentry_1 = require("../utils/sentry");
/**
 * Verify Firebase ID token and map to internal user
 * This middleware checks if the token is a Firebase token and verifies it
 */
const verifyFirebaseToken = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(); // Not a Firebase token, continue to next middleware
        }
        const token = authHeader.replace('Bearer ', '');
        // Check if this looks like a Firebase token (JWT tokens are typically shorter)
        // Firebase tokens are longer and have a specific structure
        // For now, we'll try to verify as Firebase token first
        try {
            const auth = (0, firebase_1.getAuth)();
            const decodedToken = await auth.verifyIdToken(token);
            // Require email verification when enabled (default: true). Skip in dev if explicitly disabled.
            const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
            const emailVerified = !!decodedToken.email_verified;
            if (requireEmailVerification && !emailVerified) {
                return res.status(403).json({
                    error: 'Please verify your email before signing in.',
                    code: 'EMAIL_NOT_VERIFIED',
                });
            }
            // Find user by firebaseUid (using findFirst since firebaseUid is not @unique in schema)
            const user = await prisma_1.prisma.user.findFirst({
                where: { firebaseUid: decodedToken.uid },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    firebaseUid: true,
                },
            });
            if (!user) {
                // User not found - might be a new Firebase user that needs to be created
                // This should be handled by the sync endpoint
                return next();
            }
            req.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                firebaseUid: user.firebaseUid || undefined,
            };
            // Set user context in Sentry
            (0, sentry_1.setUser)({
                id: user.id,
                email: user.email,
                username: user.username,
            });
            return next();
        }
        catch (firebaseError) {
            // Not a Firebase token, continue to next middleware (JWT verification)
            return next();
        }
    }
    catch (error) {
        // If there's an error, continue to next middleware
        return next();
    }
};
exports.verifyFirebaseToken = verifyFirebaseToken;
/**
 * Require authentication via either Firebase or JWT
 * This middleware tries Firebase first, then falls back to JWT
 */
const requireAuthFlexible = async (req, res, next) => {
    // First try Firebase token
    await (0, exports.verifyFirebaseToken)(req, res, async () => {
        // If Firebase auth succeeded, user is set
        if (req.user) {
            return next();
        }
        // Fall back to JWT verification
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
            const jwt = require('jsonwebtoken');
            const decoded = jwt.verify(token, jwtSecret);
            // Get user from database
            const user = await prisma_1.prisma.user.findUnique({
                where: { id: decoded.id },
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                },
            });
            if (!user) {
                return res.status(401).json({ error: 'Invalid token. User not found.' });
            }
            req.user = user;
            // Set user context in Sentry
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
    });
};
exports.requireAuthFlexible = requireAuthFlexible;
