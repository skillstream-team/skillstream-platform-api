import { Router } from 'express';
import { oauthService } from '../../services/oauth.service';
import { requireAuth } from '../../../../middleware/auth';
import axios from 'axios';

const router = Router();

/**
 * @swagger
 * /api/auth/oauth/google:
 *   post:
 *     summary: Authenticate with Google OAuth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: Google OAuth access token
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Authentication failed
 */
/**
 * GET endpoint for Google OAuth callback (handles redirect with authorization code)
 * Frontend redirects here after user authorizes with Google
 */
router.get('/auth/oauth/google', async (req, res) => {
  try {
    const { code, error } = req.query;

    // If error from Google OAuth
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${error}`);
    }

    // If no code, provide information about the endpoint
    if (!code) {
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        return res.json({
          message: 'OAuth callback endpoint - Google OAuth is not configured',
          error: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables are required',
          usage: {
            method: 'GET (OAuth callback) or POST (direct token)',
            postEndpoint: 'POST /api/auth/oauth/google',
            postBody: { accessToken: 'string (required)' },
            note: 'This endpoint is called automatically by Google OAuth after user authorization'
          }
        });
      }

      // If credentials exist, redirect to Google OAuth
      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent((process.env.SERVER_URL || 'http://localhost:3000') + '/api/auth/oauth/google')}&` +
        `response_type=code&` +
        `scope=email profile`;
      return res.redirect(googleAuthUrl);
    }

    // Exchange code for access token
    try {
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: (process.env.SERVER_URL || 'http://localhost:3000') + '/api/auth/oauth/google',
        grant_type: 'authorization_code'
      });

      const { access_token } = tokenResponse.data;

      // Authenticate user with access token
      const result = await oauthService.authenticateGoogle(access_token);

      // Redirect to frontend with token (or set cookie)
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${result.token}&provider=google`;
      return res.redirect(redirectUrl);
    } catch (tokenError) {
      console.error('Error exchanging code for token:', tokenError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=authentication_failed`);
  }
});

router.post('/auth/oauth/google', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Google access token is required' });
    }

    const result = await oauthService.authenticateGoogle(accessToken);
    res.json(result);
  } catch (error) {
    console.error('Google OAuth error:', error);
    res.status(401).json({ error: (error as Error).message });
  }
});

/**
 * @swagger
 * /api/auth/oauth/linkedin:
 *   post:
 *     summary: Authenticate with LinkedIn OAuth
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accessToken
 *             properties:
 *               accessToken:
 *                 type: string
 *                 description: LinkedIn OAuth access token
 *     responses:
 *       200:
 *         description: Successfully authenticated
 *       401:
 *         description: Authentication failed
 */
/**
 * GET endpoint for LinkedIn OAuth callback (handles redirect with authorization code)
 * Frontend redirects here after user authorizes with LinkedIn
 */
router.get('/auth/oauth/linkedin', async (req, res) => {
  try {
    const { code, error } = req.query;

    // If error from LinkedIn OAuth
    if (error) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=${error}`);
    }

    // If no code, provide information about the endpoint
    if (!code) {
      // Check if OAuth credentials are configured
      if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
        return res.json({
          message: 'OAuth callback endpoint - LinkedIn OAuth is not configured',
          error: 'LINKEDIN_CLIENT_ID and LINKEDIN_CLIENT_SECRET environment variables are required',
          usage: {
            method: 'GET (OAuth callback) or POST (direct token)',
            postEndpoint: 'POST /api/auth/oauth/linkedin',
            postBody: { accessToken: 'string (required)' },
            note: 'This endpoint is called automatically by LinkedIn OAuth after user authorization'
          }
        });
      }

      // If credentials exist, redirect to LinkedIn OAuth
      const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?` +
        `response_type=code&` +
        `client_id=${process.env.LINKEDIN_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent((process.env.SERVER_URL || 'http://localhost:3000') + '/api/auth/oauth/linkedin')}&` +
        `scope=openid profile email`;
      return res.redirect(linkedInAuthUrl);
    }

    // Exchange code for access token
    try {
      const tokenResponse = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', 
        new URLSearchParams({
          grant_type: 'authorization_code',
          code: code as string,
          redirect_uri: (process.env.SERVER_URL || 'http://localhost:3000') + '/api/auth/oauth/linkedin',
          client_id: process.env.LINKEDIN_CLIENT_ID || '',
          client_secret: process.env.LINKEDIN_CLIENT_SECRET || ''
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token } = tokenResponse.data;

      // Authenticate user with access token
      const result = await oauthService.authenticateLinkedIn(access_token);

      // Redirect to frontend with token
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/callback?token=${result.token}&provider=linkedin`;
      return res.redirect(redirectUrl);
    } catch (tokenError) {
      console.error('Error exchanging code for token:', tokenError);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=token_exchange_failed`);
    }
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error);
    return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/error?error=authentication_failed`);
  }
});

router.post('/auth/oauth/linkedin', async (req, res) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'LinkedIn access token is required' });
    }

    const result = await oauthService.authenticateLinkedIn(accessToken);
    res.json(result);
  } catch (error) {
    console.error('LinkedIn OAuth error:', error);
    res.status(401).json({ error: (error as Error).message });
  }
});

export default router;

