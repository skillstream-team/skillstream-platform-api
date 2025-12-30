"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauthService = exports.OAuthService = void 0;
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../../../utils/prisma");
const jwt_1 = require("../../../utils/jwt");
const email_service_1 = require("./email.service");
class OAuthService {
    /**
     * Authenticate user with Google OAuth
     */
    async authenticateGoogle(accessToken) {
        try {
            // Get user info from Google
            const response = await axios_1.default.get('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const googleUser = response.data;
            if (!googleUser.verified_email) {
                throw new Error('Google email is not verified');
            }
            // Find or create user
            let user = await prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        {
                            AND: [
                                { provider: 'google' },
                                { providerId: googleUser.id }
                            ]
                        },
                        { email: googleUser.email }
                    ]
                }
            });
            if (user) {
                // Update user if they logged in with email before and now using OAuth
                if (!user.provider || !user.providerId) {
                    user = await prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            provider: 'google',
                            providerId: googleUser.id,
                            providerEmail: googleUser.email,
                            firstName: googleUser.given_name,
                            lastName: googleUser.family_name,
                            avatar: googleUser.picture,
                            isVerified: true, // Verify email when linking OAuth account
                        }
                    });
                }
                else {
                    // Update profile picture if changed
                    user = await prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            avatar: googleUser.picture,
                            firstName: googleUser.given_name,
                            lastName: googleUser.family_name,
                        }
                    });
                }
            }
            else {
                // Create new user
                const username = await this.generateUniqueUsername(googleUser.email.split('@')[0]);
                user = await prisma_1.prisma.user.create({
                    data: {
                        email: googleUser.email,
                        username,
                        provider: 'google',
                        providerId: googleUser.id,
                        providerEmail: googleUser.email,
                        firstName: googleUser.given_name,
                        lastName: googleUser.family_name,
                        avatar: googleUser.picture,
                        role: 'STUDENT', // Default role
                        password: null, // No password for OAuth users
                        isVerified: true, // OAuth users are automatically verified
                    }
                });
                // Send welcome email
                try {
                    await email_service_1.emailService.sendWelcomeEmail(user.email, user.username, user.firstName || undefined);
                }
                catch (error) {
                    console.error('Error sending welcome email:', error);
                    // Don't fail authentication if email fails
                }
            }
            const { password, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            return { token, user: userWithoutPassword };
        }
        catch (error) {
            console.error('Google OAuth error:', error);
            throw new Error('Google authentication failed: ' + error.message);
        }
    }
    /**
     * Authenticate user with LinkedIn OAuth
     */
    async authenticateLinkedIn(accessToken) {
        try {
            // Get user info from LinkedIn
            const profileResponse = await axios_1.default.get('https://api.linkedin.com/v2/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            const linkedInUser = profileResponse.data;
            // Find or create user
            let user = await prisma_1.prisma.user.findFirst({
                where: {
                    OR: [
                        {
                            AND: [
                                { provider: 'linkedin' },
                                { providerId: linkedInUser.id }
                            ]
                        },
                        { email: linkedInUser.email }
                    ]
                }
            });
            const firstName = linkedInUser.firstName?.localized?.[`${linkedInUser.firstName.preferredLocale.language}_${linkedInUser.firstName.preferredLocale.country}`] || '';
            const lastName = linkedInUser.lastName?.localized?.[`${linkedInUser.lastName.preferredLocale.language}_${linkedInUser.lastName.preferredLocale.country}`] || '';
            if (user) {
                // Update user if they logged in with email before and now using OAuth
                if (!user.provider || !user.providerId) {
                    user = await prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            provider: 'linkedin',
                            providerId: linkedInUser.id,
                            providerEmail: linkedInUser.email,
                            firstName,
                            lastName,
                            avatar: linkedInUser.profilePicture?.displayImage,
                            isVerified: true, // Verify email when linking OAuth account
                        }
                    });
                }
                else {
                    // Update profile if changed
                    user = await prisma_1.prisma.user.update({
                        where: { id: user.id },
                        data: {
                            avatar: linkedInUser.profilePicture?.displayImage,
                            firstName,
                            lastName,
                        }
                    });
                }
            }
            else {
                // Create new user
                const username = await this.generateUniqueUsername((firstName + lastName).replace(/\s+/g, '').toLowerCase() || linkedInUser.email.split('@')[0]);
                user = await prisma_1.prisma.user.create({
                    data: {
                        email: linkedInUser.email,
                        username,
                        provider: 'linkedin',
                        providerId: linkedInUser.id,
                        providerEmail: linkedInUser.email,
                        firstName,
                        lastName,
                        avatar: linkedInUser.profilePicture?.displayImage,
                        role: 'STUDENT', // Default role
                        password: null, // No password for OAuth users
                        isVerified: true, // OAuth users are automatically verified
                    }
                });
                // Send welcome email
                try {
                    await email_service_1.emailService.sendWelcomeEmail(user.email, user.username, user.firstName || undefined);
                }
                catch (error) {
                    console.error('Error sending welcome email:', error);
                    // Don't fail authentication if email fails
                }
            }
            const { password, ...userWithoutPassword } = user;
            const token = (0, jwt_1.generateToken)({ id: user.id, role: user.role });
            return { token, user: userWithoutPassword };
        }
        catch (error) {
            console.error('LinkedIn OAuth error:', error);
            throw new Error('LinkedIn authentication failed: ' + error.message);
        }
    }
    /**
     * Generate a unique username
     */
    async generateUniqueUsername(base) {
        let username = base.replace(/[^a-z0-9]/gi, '').toLowerCase().substring(0, 20);
        let counter = 0;
        while (true) {
            const existing = await prisma_1.prisma.user.findUnique({
                where: { username }
            });
            if (!existing) {
                return username;
            }
            counter++;
            username = `${base}${counter}`.replace(/[^a-z0-9]/gi, '').toLowerCase().substring(0, 20);
            if (counter > 1000) {
                throw new Error('Unable to generate unique username');
            }
        }
    }
}
exports.OAuthService = OAuthService;
exports.oauthService = new OAuthService();
