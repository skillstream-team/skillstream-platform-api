"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const oauth_service_1 = require("../../services/oauth.service");
const router = (0, express_1.Router)();
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
router.post('/auth/oauth/google', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'Google access token is required' });
        }
        const result = await oauth_service_1.oauthService.authenticateGoogle(accessToken);
        res.json(result);
    }
    catch (error) {
        console.error('Google OAuth error:', error);
        res.status(401).json({ error: error.message });
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
router.post('/auth/oauth/linkedin', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) {
            return res.status(400).json({ error: 'LinkedIn access token is required' });
        }
        const result = await oauth_service_1.oauthService.authenticateLinkedIn(accessToken);
        res.json(result);
    }
    catch (error) {
        console.error('LinkedIn OAuth error:', error);
        res.status(401).json({ error: error.message });
    }
});
exports.default = router;
