import axios from 'axios';
import { prisma } from '../../../utils/prisma';
import { generateToken } from '../../../utils/jwt';
import { emailService } from './email.service';

interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

interface LinkedInUserInfo {
  id: string;
  email: string;
  firstName: { localized: { [key: string]: string }; preferredLocale: { language: string; country: string } };
  lastName: { localized: { [key: string]: string }; preferredLocale: { language: string; country: string } };
  profilePicture?: { displayImage: string };
}

export class OAuthService {
  /**
   * Authenticate user with Google OAuth
   */
  async authenticateGoogle(accessToken: string) {
    try {
      // Get user info from Google
      const response = await axios.get<GoogleUserInfo>(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const googleUser = response.data;

      if (!googleUser.verified_email) {
        throw new Error('Google email is not verified');
      }

      // Find or create user
      let user = await prisma.user.findFirst({
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
          user = await prisma.user.update({
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
        } else {
          // Update profile picture if changed
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              avatar: googleUser.picture,
              firstName: googleUser.given_name,
              lastName: googleUser.family_name,
            }
          });
        }
      } else {
        // Create new user
        const username = await this.generateUniqueUsername(googleUser.email.split('@')[0]);
        
        user = await prisma.user.create({
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
          await emailService.sendWelcomeEmail(user.email, user.username, user.firstName || undefined);
        } catch (error) {
          console.error('Error sending welcome email:', error);
          // Don't fail authentication if email fails
        }
      }

      const { password, ...userWithoutPassword } = user;
      const token = generateToken({ id: user.id, role: user.role });

      return { token, user: userWithoutPassword };
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw new Error('Google authentication failed: ' + (error as Error).message);
    }
  }

  /**
   * Authenticate user with LinkedIn OAuth
   */
  async authenticateLinkedIn(accessToken: string) {
    try {
      // Get user info from LinkedIn
      const profileResponse = await axios.get(
        'https://api.linkedin.com/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      );

      const linkedInUser = profileResponse.data as LinkedInUserInfo;

      // Find or create user
      let user = await prisma.user.findFirst({
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
          user = await prisma.user.update({
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
        } else {
          // Update profile if changed
          user = await prisma.user.update({
            where: { id: user.id },
            data: {
              avatar: linkedInUser.profilePicture?.displayImage,
              firstName,
              lastName,
            }
          });
        }
      } else {
        // Create new user
        const username = await this.generateUniqueUsername(
          (firstName + lastName).replace(/\s+/g, '').toLowerCase() || linkedInUser.email.split('@')[0]
        );
        
        user = await prisma.user.create({
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
          await emailService.sendWelcomeEmail(user.email, user.username, user.firstName || undefined);
        } catch (error) {
          console.error('Error sending welcome email:', error);
          // Don't fail authentication if email fails
        }
      }

      const { password, ...userWithoutPassword } = user;
      const token = generateToken({ id: user.id, role: user.role });

      return { token, user: userWithoutPassword };
    } catch (error) {
      console.error('LinkedIn OAuth error:', error);
      throw new Error('LinkedIn authentication failed: ' + (error as Error).message);
    }
  }

  /**
   * Generate a unique username
   */
  private async generateUniqueUsername(base: string): Promise<string> {
    let username = base.replace(/[^a-z0-9]/gi, '').toLowerCase().substring(0, 20);
    let counter = 0;
    
    while (true) {
      const existing = await prisma.user.findUnique({
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

export const oauthService = new OAuthService();

