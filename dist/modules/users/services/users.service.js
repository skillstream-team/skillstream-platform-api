"use strict";
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
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error('JWT_SECRET is not defined in your environment variables');
}
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;
if (!RESET_TOKEN_SECRET) {
    throw new Error('RESET_TOKEN_SECRET is not defined in your environment variables');
}
const RESET_TOKEN_EXPIRY = '15m'; // 15 Minutes
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
     *                 example: student
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
                    OR: [
                        { email },
                        { username }
                    ]
                }
            });
            if (existingUser) {
                throw new Error('User with this email or username already exists');
            }
            // Hash password
            const hashedPassword = await bcrypt_1.default.hash(password, 10);
            // Create user in database
            const user = await user_model_1.prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    username,
                    role,
                },
            });
            // Generate JWT token
            const { password: _, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
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
     *     description: Verifies the password reset token and updates the user’s password.
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
     * /users:
     *   get:
     *     summary: Get all users
     *     tags:
     *       - Users
     *     responses:
     *       200:
     *         description: List of users
     */
    async getAllUsers() {
        return user_model_1.prisma.user.findMany();
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
        return user_model_1.prisma.user.findUnique({ where: { id } });
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
        return user_model_1.prisma.user.findUnique({ where: { id: userId } });
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
        return ['ADMIN', 'TUTOR', 'STUDENT'];
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
}
exports.UsersService = UsersService;
