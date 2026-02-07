"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
// modules/users/services/users.service.ts
const user_model_1 = require("../models/user.model");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("../../../utils/jwt");
const email_service_1 = require("./email.service");
const cache_1 = require("../../../utils/cache");
const referral_service_1 = require("../../courses/services/referral.service");
const firebase_1 = require("../../../utils/firebase");
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in your environment variables');
}
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
if (!RESET_TOKEN_SECRET) {
    throw new Error('RESET_TOKEN_SECRET is not defined in your environment variables');
}
const RESET_TOKEN_EXPIRY = '15m'; // 15 Minutes
const VERIFICATION_TOKEN_SECRET = process.env.VERIFICATION_TOKEN_SECRET || process.env.RESET_TOKEN_SECRET;
if (!VERIFICATION_TOKEN_SECRET) {
    throw new Error('VERIFICATION_TOKEN_SECRET or RESET_TOKEN_SECRET is not defined in your environment variables');
}
const VERIFICATION_TOKEN_EXPIRY = '24h'; // 24 Hours
class UsersService {
    /**
     * @swagger
     * /users:
     *   post:
     *     summary: Create a new user
     *     description: Creates a new user in the database with hashed password and returns a JWT token along with user info.
     *     tags:
     *       - Users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *               - username
     *               - role
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               password:
     *                 type: string
     *                 format: password
     *                 example: StrongPassword123
     *               username:
     *                 type: string
     *                 example: johndoe
     *               role:
     *                 type: string
     *                 example: STUDENT
     *     responses:
     *       200:
     *         description: Successfully created user and returned JWT
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   description: JWT token for authentication
     *                 user:
     *                   type: object
     *                   description: User record from the database
     *                   properties:
     *                     id:
     *                       type: string
     *                     email:
     *                       type: string
     *                     username:
     *                       type: string
     *                     role:
     *                       type: string
     *       400:
     *         description: Bad request, invalid input or database error
     */
    async createUser(data) {
        try {
            const { email, password, username, role } = data;
            // Check if user already exists
            const existingUser = await user_model_1.prisma.user.findFirst({
                where: {
                    OR: [{ email }, { username }],
                },
            });
            if (existingUser) {
                throw new Error('User already exists');
            }
            // Hash password if provided
            const hashedPassword = password ? await bcrypt_1.default.hash(password, 10) : null;
            // Create user in database
            const user = await user_model_1.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                    role,
                },
            });
            // Create default settings for new user
            try {
                const { SettingsService } = await Promise.resolve().then(() => __importStar(require('./settings.service')));
                const settingsService = new SettingsService();
                await settingsService.createDefaultSettings(user.id);
            }
            catch (error) {
                console.error('Error creating default settings:', error);
                // Don't fail user creation if settings creation fails
            }
            // Apply referral code if provided
            if (data.referralCode) {
                try {
                    const referralService = new referral_service_1.ReferralService();
                    await referralService.applyReferralCode(data.referralCode, user.id);
                }
                catch (referralError) {
                    console.warn('Failed to apply referral code:', referralError);
                    // Don't fail user creation if referral fails
                }
            }
            // Send verification email
            try {
                const verificationToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, VERIFICATION_TOKEN_SECRET, { expiresIn: VERIFICATION_TOKEN_EXPIRY });
                const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
                await email_service_1.emailService.sendVerificationEmail(user.email, user.username, verificationLink, user.firstName || undefined);
            }
            catch (error) {
                console.error('Error sending verification email:', error);
                // Don't fail user creation if email fails
            }
            // Send welcome email (after verification)
            // Note: Welcome email will be sent after email verification
            // Generate JWT token
            const { password: _, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            // Invalidate user list cache
            await (0, cache_1.deleteCachePattern)('users:list:*');
            return { token, user: userWithoutPassword };
        }
        catch (error) {
            throw new Error('Error creating user: ' + error.message);
        }
    }
    /**
     * @swagger
     * /auth/login:
     *   post:
     *     summary: User login
     *     description: Authenticates a user with email and password, and returns a JWT token along with user info (excluding password).
     *     tags:
     *       - Authentication
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *               - password
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 example: user@example.com
     *               password:
     *                 type: string
     *                 format: password
     *                 example: StrongPassword123
     *     responses:
     *       200:
     *         description: Successfully authenticated
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   description: JWT token for authentication
     *                 user:
     *                   type: object
     *                   description: Authenticated user details (password excluded)
     *                   properties:
     *                     id:
     *                       type: integer
     *                     email:
     *                       type: string
     *                     username:
     *                       type: string
     *                     role:
     *                       type: string
     *       401:
     *         description: Invalid credentials
     *       500:
     *         description: Server error during login
     */
    async login({ email, password }) {
        try {
            const user = await user_model_1.prisma.user.findUnique({ where: { email } });
            if (!user)
                throw new Error('Invalid credentials');
            // Check if user is OAuth-only user (no password)
            if (!user.password) {
                throw new Error('Please sign in with your OAuth provider (Google/LinkedIn)');
            }
            const isValid = await bcrypt_1.default.compare(password, user.password);
            if (!isValid)
                throw new Error('Invalid credentials');
            const { password: _, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            return { token, user: userWithoutPassword };
        }
        catch (error) {
            throw new Error('Error during login: ' + error.message);
        }
    }
    /**
     * @swagger
     * /auth/refresh-token:
     *   post:
     *     summary: Refresh JWT token
     *     description: Validates the provided JWT token and issues a new token along with user info (excluding password).
     *     tags:
     *       - Authentication
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - token
     *             properties:
     *               token:
     *                 type: string
     *                 description: The current JWT token to be refreshed
     *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     *     responses:
     *       200:
     *         description: Token successfully refreshed
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 token:
     *                   type: string
     *                   description: New JWT token
     *                 user:
     *                   type: object
     *                   description: User details excluding password
     *                   properties:
     *                     id:
     *                       type: integer
     *                     email:
     *                       type: string
     *                     username:
     *                       type: string
     *                     role:
     *                       type: string
     *       401:
     *         description: Invalid or expired token
     *       500:
     *         description: Server error while refreshing token
     */
    async refreshToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            // Fetch the user from the DB - support both id and userId for backward compatibility
            const userId = decoded.id || decoded.userId;
            if (!userId)
                throw new Error('Invalid token payload');
            const user = await user_model_1.prisma.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User not found');
            const { password, ...userWithoutPassword } = user;
            const newToken = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            return { token: newToken, user: userWithoutPassword };
        }
        catch (err) {
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * @swagger
     * /auth/forgot-password:
     *   post:
     *     summary: Send a password reset email to a user
     *     description: Generates a password reset token and emails a reset link to the user.
     *     tags:
     *       - Auth
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               email:
     *                 type: string
     *                 example: "user@example.com"
     *     responses:
     *       200:
     *         description: Password reset link sent successfully
     *       404:
     *         description: User not found
     */
    async forgotPassword(email) {
        const user = await user_model_1.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new Error('User not found');
        try {
            const resetToken = jsonwebtoken_1.default.sign({ userId: user.id }, RESET_TOKEN_SECRET, { expiresIn: RESET_TOKEN_EXPIRY });
            const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            await email_service_1.emailService.sendPasswordResetEmail(email, user.username, resetLink);
            return { message: 'Password reset link sent' };
        }
        catch (err) {
            throw new Error('Error sending password reset email: ' + err.message);
        }
    }
    /**
     * @swagger
     * /auth/reset-password:
     *   post:
     *     summary: Reset user password
     *     description: Verifies the password reset token and updates the users password.
     *     tags:
     *       - Auth
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               token:
     *                 type: string
     *               newPassword:
     *                 type: string
     *     responses:
     *       200:
     *         description: Password reset successfully
     *       400:
     *         description: Invalid or expired token
     */
    async resetPassword(data) {
        try {
            const decoded = jsonwebtoken_1.default.verify(data.token, RESET_TOKEN_SECRET);
            if (!data.newPassword || data.newPassword.length < 6)
                throw new Error('Password must be at least 6 characters long');
            const hashedPassword = await bcrypt_1.default.hash(data.newPassword, 10);
            await user_model_1.prisma.user.update({
                where: { id: decoded.userId },
                data: { password: hashedPassword },
            });
            return { message: 'Password has been reset successfully' };
        }
        catch (error) {
            throw new Error('Error resetting password: ' + error.message);
        }
    }
    /**
     * @swagger
     * /auth/verify-email:
     *   post:
     *     summary: Verify user email address
     *     description: Verifies the email verification token and marks the user's email as verified.
     *     tags:
     *       - Authentication
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - token
     *             properties:
     *               token:
     *                 type: string
     *                 description: Email verification token
     *     responses:
     *       200:
     *         description: Email verified successfully
     *       400:
     *         description: Invalid or expired token
     */
    async verifyEmail(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, VERIFICATION_TOKEN_SECRET);
            const user = await user_model_1.prisma.user.findUnique({ where: { id: decoded.userId } });
            if (!user) {
                throw new Error('User not found');
            }
            if (user.isVerified) {
                return { message: 'Email is already verified', user };
            }
            // Verify that the token email matches the user's email
            if (user.email !== decoded.email) {
                throw new Error('Invalid verification token');
            }
            // Update user to verified
            const updatedUser = await user_model_1.prisma.user.update({
                where: { id: decoded.userId },
                data: { isVerified: true },
            });
            // Send welcome email after verification
            try {
                await email_service_1.emailService.sendWelcomeEmail(updatedUser.email, updatedUser.username, updatedUser.firstName || undefined);
            }
            catch (error) {
                console.error('Error sending welcome email:', error);
                // Don't fail verification if welcome email fails
            }
            const { password: _, ...userWithoutPassword } = updatedUser;
            return {
                message: 'Email verified successfully',
                user: userWithoutPassword
            };
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new Error('Invalid or expired verification token');
            }
            throw new Error('Error verifying email: ' + error.message);
        }
    }
    /**
     * @swagger
     * /auth/resend-verification:
     *   post:
     *     summary: Resend email verification
     *     description: Sends a new email verification link to the user's email address.
     *     tags:
     *       - Authentication
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - email
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *                 description: User's email address
     *     responses:
     *       200:
     *         description: Verification email sent successfully
     *       400:
     *         description: User not found or already verified
     */
    async resendVerificationEmail(email) {
        try {
            const user = await user_model_1.prisma.user.findUnique({ where: { email } });
            if (!user) {
                throw new Error('User not found');
            }
            if (user.isVerified) {
                throw new Error('Email is already verified');
            }
            const verificationToken = jsonwebtoken_1.default.sign({ userId: user.id, email: user.email }, VERIFICATION_TOKEN_SECRET, { expiresIn: VERIFICATION_TOKEN_EXPIRY });
            const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
            await email_service_1.emailService.sendVerificationEmail(user.email, user.username, verificationLink, user.firstName || undefined);
            return { message: 'Verification email sent successfully' };
        }
        catch (error) {
            throw new Error('Error sending verification email: ' + error.message);
        }
    }
    /**
     * @swagger
     * /users:
     *   get:
     *     summary: Get all users (paginated)
     *     tags: [Users]
     *     parameters:
     *       - in: query
     *         name: page
     *         schema:
     *           type: integer
     *           default: 1
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *           maximum: 100
     */
    async getAllUsers(page = 1, limit = 20) {
        const cacheKey = `users:list:${page}:${limit}`;
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100); // Max 100 per page
        const [users, total] = await Promise.all([
            user_model_1.prisma.user.findMany({
                skip,
                take,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    role: true,
                    firstName: true,
                    lastName: true,
                    avatar: true,
                    createdAt: true,
                },
                orderBy: { createdAt: 'desc' },
            }),
            user_model_1.prisma.user.count(),
        ]);
        const result = {
            data: users,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
        // Cache result
        await (0, cache_1.setCache)(cacheKey, result, cache_1.CACHE_TTL.SHORT);
        return result;
    }
    /**
     * @swagger
     * /users/search:
     *   get:
     *     summary: Search users by username or email
     *     description: Search for users by username or email address. Returns matching users.
     *     tags: [Users]
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *         description: Search query (username or email)
     *       - in: query
     *         name: limit
     *         schema:
     *           type: integer
     *           default: 20
     *           maximum: 50
     *         description: Maximum number of results
     *       - in: query
     *         name: role
     *         schema:
     *           type: string
     *         description: Filter by role (optional)
     *     responses:
     *       200:
     *         description: List of matching users
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       username:
     *                         type: string
     *                       email:
     *                         type: string
     *                       firstName:
     *                         type: string
     *                       lastName:
     *                         type: string
     *                       role:
     *                         type: string
     *                       avatar:
     *                         type: string
     *                 count:
     *                   type: integer
     *       400:
     *         description: Bad request - missing search query
     */
    async searchUsers(query, limit = 20, role) {
        if (!query || query.trim().length === 0) {
            throw new Error('Search query is required');
        }
        const searchTerm = query.trim();
        const take = Math.min(limit, 50); // Max 50 results
        const where = {
            OR: [
                { username: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
        };
        // Optional role filter
        if (role) {
            where.role = role;
        }
        const users = await user_model_1.prisma.user.findMany({
            where,
            take,
            select: {
                id: true,
                username: true,
                email: true,
                firstName: true,
                lastName: true,
                role: true,
                avatar: true,
            },
            orderBy: [
                // Prioritize exact matches
                { username: 'asc' },
                { email: 'asc' },
            ],
        });
        return {
            success: true,
            data: users,
            count: users.length,
        };
    }
    /**
     * @swagger
     * /users/{id}:
     *   get:
     *     summary: Get a user by ID
     *     tags:
     *       - Users
     *     parameters:
     *       - name: id
     *         in: path
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: User details
     *       404:
     *         description: User not found
     */
    async getUserById(id) {
        const cacheKey = cache_1.cacheKeys.user(id);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const user = await user_model_1.prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (user) {
            await (0, cache_1.setCache)(cacheKey, user, cache_1.CACHE_TTL.MEDIUM);
        }
        return user;
    }
    /**
     * @swagger
     * /users/profile/{userId}:
     *   get:
     *     summary: Get the profile of a specific user
     *     tags:
     *       - Users
     */
    async getUserProfile(userId) {
        const cacheKey = cache_1.cacheKeys.userProfile(userId);
        // Try cache first
        const cached = await (0, cache_1.getCache)(cacheKey);
        if (cached) {
            return cached;
        }
        const user = await user_model_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                username: true,
                email: true,
                role: true,
                firstName: true,
                lastName: true,
                avatar: true,
                createdAt: true,
                updatedAt: true,
            },
        });
        if (user) {
            await (0, cache_1.setCache)(cacheKey, user, cache_1.CACHE_TTL.MEDIUM);
        }
        return user;
    }
    /**
     * Update the current user's profile (firstName, lastName, avatar). Invalidates profile cache.
     */
    async updateMyProfile(userId, data) {
        const updateData = {};
        if (data.firstName !== undefined)
            updateData.firstName = data.firstName || null;
        if (data.lastName !== undefined)
            updateData.lastName = data.lastName || null;
        if (data.avatar !== undefined)
            updateData.avatar = data.avatar || null;
        if (Object.keys(updateData).length === 0)
            return this.getUserProfile(userId);
        const updated = await user_model_1.prisma.user.update({
            where: { id: userId },
            data: updateData,
            select: { id: true, username: true, email: true, role: true, firstName: true, lastName: true, avatar: true, createdAt: true, updatedAt: true },
        });
        await (0, cache_1.deleteCache)(cache_1.cacheKeys.userProfile(userId));
        return updated;
    }
    /**
     * @swagger
     * /roles:
     *   get:
     *     summary: Get all predefined roles
     *     tags:
     *       - Users
     */
    async getRoles() {
        return ['ADMIN', 'TEACHER', 'STUDENT'];
    }
    /**
     * @swagger
     * /users/{id}/change-password:
     *   patch:
     *     summary: Change a user's password
     *     tags:
     *       - Users
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               newPassword:
     *                 type: string
     *                 example: "NewPass123"
     */
    async changePassword(id, newPassword) {
        try {
            if (!newPassword || newPassword.length < 6)
                throw new Error('Password must be at least 6 characters long');
            const hashedPassword = await bcrypt_1.default.hash(newPassword, 10);
            await user_model_1.prisma.user.update({
                where: { id },
                data: { password: hashedPassword },
            });
            return { message: 'Password changed successfully' };
        }
        catch (error) {
            throw new Error('Error changing password: ' + error.message);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   put:
     *     summary: Update a user
     *     tags:
     *       - Users
     */
    async updateUser(id, data) {
        try {
            if (data.password) {
                data.password = await bcrypt_1.default.hash(data.password, 10);
            }
            return user_model_1.prisma.user.update({ where: { id }, data });
        }
        catch (error) {
            throw new Error('Error updating user: ' + error.message);
        }
    }
    /**
     * @swagger
     * /users/{id}:
     *   delete:
     *     summary: Delete a user
     *     tags:
     *       - Users
     */
    async deleteUser(id) {
        try {
            return user_model_1.prisma.user.delete({ where: { id } });
        }
        catch (error) {
            throw new Error('Error deleting user: ' + error.message);
        }
    }
    /**
     * @swagger
     * /users/{id}/roles:
     *   patch:
     *     summary: Update user roles
     *     tags:
     *       - Users
     */
    async updateUserRole(id, roles) {
        try {
            return user_model_1.prisma.user.update({
                where: { id },
                data: { role: roles.join(',') },
            });
        }
        catch (error) {
            throw new Error('Error updating user roles: ' + error.message);
        }
    }
    /**
     * Sync Firebase user with backend database
     * Creates or updates user record with firebaseUid
     * This is called when a user authenticates via Firebase
     */
    async syncFirebaseUser(data) {
        try {
            // Verify Firebase token
            const auth = (0, firebase_1.getAuth)();
            const decodedToken = await auth.verifyIdToken(data.firebaseToken);
            // Require email verification before syncing (and issuing JWT) when enabled
            const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION !== 'false';
            const emailVerified = !!decodedToken.email_verified;
            if (requireEmailVerification && !emailVerified) {
                const err = new Error('Please verify your email before signing in.');
                err.code = 'EMAIL_NOT_VERIFIED';
                throw err;
            }
            // Check if user exists by firebaseUid (using findFirst since firebaseUid is not @unique in schema)
            let user = await user_model_1.prisma.user.findFirst({
                where: { firebaseUid: data.firebaseUid },
            });
            if (user) {
                // Update existing user
                user = await user_model_1.prisma.user.update({
                    where: { id: user.id },
                    data: {
                        email: data.email,
                        isVerified: data.emailVerified || false,
                        avatar: data.photoURL || user.avatar,
                        firstName: data.firstName || user.firstName,
                        lastName: data.lastName || user.lastName,
                        provider: data.provider || user.provider,
                        providerId: data.firebaseUid,
                        providerEmail: data.email,
                    },
                });
            }
            else {
                // Check if user exists by email
                const existingUser = await user_model_1.prisma.user.findUnique({
                    where: { email: data.email },
                });
                if (existingUser) {
                    // Link Firebase UID to existing user
                    user = await user_model_1.prisma.user.update({
                        where: { id: existingUser.id },
                        data: {
                            firebaseUid: data.firebaseUid,
                            provider: data.provider || existingUser.provider,
                            providerId: data.firebaseUid,
                            providerEmail: data.email,
                            avatar: data.photoURL || existingUser.avatar,
                        },
                    });
                }
                else {
                    // Create new user
                    // Generate username from email if not provided
                    const username = data.username || data.email.split('@')[0] + '_' + Date.now();
                    // Check username uniqueness
                    let finalUsername = username;
                    let counter = 1;
                    while (await user_model_1.prisma.user.findUnique({ where: { username: finalUsername } })) {
                        finalUsername = `${username}_${counter}`;
                        counter++;
                    }
                    user = await user_model_1.prisma.user.create({
                        data: {
                            firebaseUid: data.firebaseUid,
                            email: data.email,
                            username: finalUsername,
                            role: data.role || 'STUDENT',
                            firstName: data.firstName || data.displayName?.split(' ')[0] || null,
                            lastName: data.lastName || data.displayName?.split(' ').slice(1).join(' ') || null,
                            avatar: data.photoURL || null,
                            isVerified: data.emailVerified || false,
                            provider: data.provider || 'firebase',
                            providerId: data.firebaseUid,
                            providerEmail: data.email,
                            password: null, // No password for Firebase users
                        },
                    });
                    // Create default settings for new user (same as regular registration)
                    try {
                        const { SettingsService } = await Promise.resolve().then(() => __importStar(require('./settings.service')));
                        const settingsService = new SettingsService();
                        await settingsService.createDefaultSettings(user.id);
                    }
                    catch (error) {
                        console.error('Error creating default settings:', error);
                        // Don't fail user creation if settings creation fails
                    }
                    // Apply referral code if provided (only for new users)
                    if (data.referralCode) {
                        try {
                            const referralService = new referral_service_1.ReferralService();
                            await referralService.applyReferralCode(data.referralCode, user.id);
                        }
                        catch (referralError) {
                            console.warn('Failed to apply referral code:', referralError);
                            // Don't fail user creation if referral fails
                        }
                    }
                }
            }
            // Generate JWT token for backend
            const { password: _, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            return { token, user: userWithoutPassword };
        }
        catch (error) {
            console.error('Firebase sync error:', error);
            throw new Error('Error syncing Firebase user: ' + error.message);
        }
    }
}
exports.UsersService = UsersService;
