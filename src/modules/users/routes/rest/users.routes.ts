// modules/users/routes/rest/users.routes.ts
import { Router } from 'express';
import { UsersService } from '../../services/users.service';
// Import loginRateLimiter middleware
import { loginRateLimiter, registrationRateLimiter, passwordResetRateLimiter, generalRateLimiter } from '../../../../middleware/rate-limit';
import { validate } from '../../../../middleware/validation';
import { loginSchema, createUserSchema, forgotPasswordSchema, resetPasswordSchema, refreshTokenSchema } from '../../../../utils/validation-schemas';
import { requireAuth } from '../../../../middleware/auth';
import { z } from 'zod';

const router = Router();
const service = new UsersService();

/**
 * @swagger
 * /api/users/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticate user with email and password. Returns JWT token and user information.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *           example:
 *             email: user@example.com
 *             password: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               refreshToken: refresh_token_123
 *               user:
 *                 id: user_123
 *                 username: johndoe
 *                 email: user@example.com
 *                 role: STUDENT
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: Invalid email or password
 */
router.post('/auth/login', 
  loginRateLimiter,
  validate({ body: loginSchema }),
  async (req, res) => {
  try {
    const user = await service.login(req.body);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
  }
);

/**
 * @swagger
 * /api/users/auth/register:
 *   post:
 *     summary: User registration
 *     description: Register a new user account. Returns JWT token and user information.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *           example:
 *             username: johndoe
 *             email: john@example.com
 *             password: password123
 *             role: STUDENT
 *             firstName: John
 *             lastName: Doe
 *             referralCode: REF123
 *     responses:
 *       201:
 *         description: User created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *             example:
 *               token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               refreshToken: refresh_token_123
 *               user:
 *                 id: user_123
 *                 username: johndoe
 *                 email: john@example.com
 *                 role: STUDENT
 *       400:
 *         description: Bad request - validation error or user already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error: User already exists
 */
router.post('/auth/register', 
  registrationRateLimiter,
  validate({ body: createUserSchema }),
  async (req, res) => {
  try {
    const user = await service.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
  }
);

/**
 * @swagger
 * /api/users/auth/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     description: Get a new access token using a refresh token.
 *     tags: [Authentication]
 *     security: []
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
 *                 example: refresh_token_123
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/refresh-token', 
  validate({ body: refreshTokenSchema }),
  async (req, res) => {
  try {
    const user = await service.refreshToken(req.body.token);
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: (error as Error).message });
  }
  }
);

/**
 * @swagger
 * /api/users/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     description: Send password reset email to user's email address.
 *     tags: [Authentication]
 *     security: []
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
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset email sent
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/forgot-password', 
  passwordResetRateLimiter,
  validate({ body: forgotPasswordSchema }),
  async (req, res) => {
  try {
    const user = await service.forgotPassword(req.body.email);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: (error as Error).message });
  }
  }
);

/**
 * @swagger
 * /api/users/auth/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Reset user password using reset token from email.
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: reset_token_123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Invalid token or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/auth/reset-password', 
  passwordResetRateLimiter,
  validate({ body: resetPasswordSchema }),
  async (req, res) => {
  try {
    const user = await service.resetPassword(req.body);
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
  }
);

/**
 * @swagger
 * /api/users/search:
 *   get:
 *     summary: Search users by username or email
 *     description: Search for users by username or email address. Requires authentication.
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query (username or email)
 *         example: john
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *           maximum: 50
 *         description: Maximum number of results (max 50)
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: [STUDENT, TEACHER, ADMIN]
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
 *       401:
 *         description: Unauthorized
 */
const searchUsersSchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
  role: z.enum(['STUDENT', 'TEACHER', 'ADMIN']).optional(),
});

router.get('/search',
  requireAuth,
  generalRateLimiter,
  validate({ query: searchUsersSchema }),
  async (req, res) => {
    try {
      const { q, limit, role } = req.query;
      
      const result = await service.searchUsers(
        q as string,
        limit ? parseInt(limit as string, 10) : 20,
        role as string | undefined
      );
      
      res.json(result);
    } catch (error) {
      const statusCode = (error as Error).message.includes('required') ? 400 : 500;
      res.status(statusCode).json({ 
        error: (error as Error).message || 'Failed to search users' 
      });
    }
  }
);

export default router;