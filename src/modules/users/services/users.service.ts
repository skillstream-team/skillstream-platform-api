// modules/users/services/users.service.ts
import { prisma } from '../models/user.model';
import { CreateUserDTO } from '../dtos/user.dto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { generateToken, JWTPayload } from '../../../utils/jwt';
import { emailService } from './email.service';
import { getCache, setCache, deleteCachePattern, cacheKeys, CACHE_TTL } from '../../../utils/cache';
import { ReferralService } from '../../courses/services/referral.service';

const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in your environment variables');
}

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET as string;
if (!RESET_TOKEN_SECRET) {
  throw new Error('RESET_TOKEN_SECRET is not defined in your environment variables');
}
const RESET_TOKEN_EXPIRY = '15m'; // 15 Minutes

const VERIFICATION_TOKEN_SECRET = process.env.VERIFICATION_TOKEN_SECRET || process.env.RESET_TOKEN_SECRET as string;
if (!VERIFICATION_TOKEN_SECRET) {
  throw new Error('VERIFICATION_TOKEN_SECRET or RESET_TOKEN_SECRET is not defined in your environment variables');
}
const VERIFICATION_TOKEN_EXPIRY = '24h'; // 24 Hours

export class UsersService {
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
  async createUser(data: CreateUserDTO) {
    try {
      const { email, password, username, role } = data;

      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [{ email }, { username }],
        },
      });

      if (existingUser) {
        throw new Error('User already exists');
      }

      // Hash password if provided
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

      // Create user in database
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          username,
          role,
        },
      });

      // Create default settings for new user
      try {
        const { SettingsService } = await import('./settings.service');
        const settingsService = new SettingsService();
        await settingsService.createDefaultSettings(user.id);
      } catch (error) {
        console.error('Error creating default settings:', error);
        // Don't fail user creation if settings creation fails
      }

      // Apply referral code if provided
      if (data.referralCode) {
        try {
          const referralService = new ReferralService();
          await referralService.applyReferralCode(data.referralCode, user.id);
        } catch (referralError) {
          console.warn('Failed to apply referral code:', referralError);
          // Don't fail user creation if referral fails
        }
      }

      // Send verification email
      try {
        const verificationToken = jwt.sign({ userId: user.id, email: user.email }, VERIFICATION_TOKEN_SECRET, { expiresIn: VERIFICATION_TOKEN_EXPIRY });
        const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        await emailService.sendVerificationEmail(user.email, user.username, verificationLink, user.firstName || undefined);
      } catch (error) {
        console.error('Error sending verification email:', error);
        // Don't fail user creation if email fails
      }

      // Send welcome email (after verification)
      // Note: Welcome email will be sent after email verification

      // Generate JWT token
      const { password: _, ...userWithoutPassword } = user;
      const token = generateToken({ id: user.id, role: user.role });

      // Invalidate user list cache
      await deleteCachePattern('users:list:*');

      return { token, user: userWithoutPassword };
    } catch (error) {
      throw new Error('Error creating user: ' + (error as Error).message);
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
  async login({ email, password }: { email: string; password: string }) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) throw new Error('Invalid credentials');

      // Check if user is OAuth-only user (no password)
      if (!user.password) {
        throw new Error('Please sign in with your OAuth provider (Google/LinkedIn)');
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) throw new Error('Invalid credentials');

      const { password: _, ...userWithoutPassword } = user;
      const token = generateToken({ id: user.id, role: user.role });

      return { token, user: userWithoutPassword };
    } catch (error) {
      throw new Error('Error during login: ' + (error as Error).message);
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
  async refreshToken(token: string) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET as string) as unknown as JWTPayload;

      // Fetch the user from the DB - support both id and userId for backward compatibility
      const userId = decoded.id || decoded.userId;
      if (!userId) throw new Error('Invalid token payload');

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) throw new Error('User not found');

      const { password, ...userWithoutPassword } = user;
      const newToken = generateToken({ id: user.id, role: user.role });

      return { token: newToken, user: userWithoutPassword };
    } catch (err) {
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
  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) throw new Error('User not found');

    try {
      const resetToken = jwt.sign({ userId: user.id }, RESET_TOKEN_SECRET, { expiresIn: RESET_TOKEN_EXPIRY });
      const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

      await emailService.sendPasswordResetEmail(email, user.username, resetLink);
      return { message: 'Password reset link sent' };
    } catch (err) {
      throw new Error('Error sending password reset email: ' + (err as Error).message);
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
  async resetPassword(data: { token: string; newPassword: string }) {
    try {
      const decoded = jwt.verify(data.token, RESET_TOKEN_SECRET) as { userId: string };

      if (!data.newPassword || data.newPassword.length < 6)
        throw new Error('Password must be at least 6 characters long');

      const hashedPassword = await bcrypt.hash(data.newPassword, 10);
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { password: hashedPassword },
      });

      return { message: 'Password has been reset successfully' };
    } catch (error) {
      throw new Error('Error resetting password: ' + (error as Error).message);
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
  async verifyEmail(token: string) {
    try {
      const decoded = jwt.verify(token, VERIFICATION_TOKEN_SECRET) as { userId: string; email: string };

      const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
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
      const updatedUser = await prisma.user.update({
        where: { id: decoded.userId },
        data: { isVerified: true },
      });

      // Send welcome email after verification
      try {
        await emailService.sendWelcomeEmail(updatedUser.email, updatedUser.username, updatedUser.firstName || undefined);
      } catch (error) {
        console.error('Error sending welcome email:', error);
        // Don't fail verification if welcome email fails
      }

      const { password: _, ...userWithoutPassword } = updatedUser;
      return { 
        message: 'Email verified successfully', 
        user: userWithoutPassword 
      };
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid or expired verification token');
      }
      throw new Error('Error verifying email: ' + (error as Error).message);
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
  async resendVerificationEmail(email: string) {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new Error('User not found');
      }

      if (user.isVerified) {
        throw new Error('Email is already verified');
      }

      const verificationToken = jwt.sign(
        { userId: user.id, email: user.email }, 
        VERIFICATION_TOKEN_SECRET, 
        { expiresIn: VERIFICATION_TOKEN_EXPIRY }
      );
      const verificationLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;

      await emailService.sendVerificationEmail(user.email, user.username, verificationLink, user.firstName || undefined);
      
      return { message: 'Verification email sent successfully' };
    } catch (error) {
      throw new Error('Error sending verification email: ' + (error as Error).message);
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
  async getAllUsers(page: number = 1, limit: number = 20) {
    const cacheKey = `users:list:${page}:${limit}`;

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const skip = (page - 1) * limit;
    const take = Math.min(limit, 100); // Max 100 per page

    const [users, total] = await Promise.all([
      prisma.user.findMany({
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
      prisma.user.count(),
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
    await setCache(cacheKey, result, CACHE_TTL.SHORT);

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
  async searchUsers(query: string, limit: number = 20, role?: string) {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query is required');
    }

    const searchTerm = query.trim();
    const take = Math.min(limit, 50); // Max 50 results

    const where: any = {
      OR: [
        { username: { contains: searchTerm, mode: 'insensitive' } },
        { email: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    // Optional role filter
    if (role) {
      where.role = role;
    }

    const users = await prisma.user.findMany({
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
  async getUserById(id: string) {
    const cacheKey = cacheKeys.user(id);

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
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
      await setCache(cacheKey, user, CACHE_TTL.MEDIUM);
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
  async getUserProfile(userId: string) {
    const cacheKey = cacheKeys.userProfile(userId);

    // Try cache first
    const cached = await getCache(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await prisma.user.findUnique({
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
      await setCache(cacheKey, user, CACHE_TTL.MEDIUM);
    }

    return user;
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
  async changePassword(id: string, newPassword: string) {
    try {
      if (!newPassword || newPassword.length < 6)
        throw new Error('Password must be at least 6 characters long');

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });
      return { message: 'Password changed successfully' };
    } catch (error) {
      throw new Error('Error changing password: ' + (error as Error).message);
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
  async updateUser(id: string, data: Partial<CreateUserDTO>) {
    try {
      if (data.password) {
        data.password = await bcrypt.hash(data.password, 10);
      }
      return prisma.user.update({ where: { id }, data });
    } catch (error) {
      throw new Error('Error updating user: ' + (error as Error).message);
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
  async deleteUser(id: string) {
    try {
      return prisma.user.delete({ where: { id } });
    } catch (error) {
      throw new Error('Error deleting user: ' + (error as Error).message);
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
  async updateUserRole(id: string, roles: string[]) {
    try {
      return prisma.user.update({
        where: { id },
        data: { role: roles.join(',') },
      });
    } catch (error) {
      throw new Error('Error updating user roles: ' + (error as Error).message);
    }
  }
}
