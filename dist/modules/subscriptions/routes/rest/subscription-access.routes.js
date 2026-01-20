"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const subscription_access_service_1 = require("../../services/subscription-access.service");
const router = (0, express_1.Router)();
const accessService = new subscription_access_service_1.SubscriptionAccessService();
/**
 * @swagger
 * /api/subscriptions/access/check:
 *   post:
 *     summary: Check if user has access to content
 */
router.post('/check', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contentId, contentType } = req.body;
        if (!contentId || !contentType) {
            return res.status(400).json({ error: 'contentId and contentType are required' });
        }
        const hasAccess = await accessService.hasAccess(userId, contentId, contentType);
        res.json({ hasAccess });
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/subscriptions/access/grant:
 *   post:
 *     summary: Grant subscription access to content (admin/teacher)
 */
router.post('/grant', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const userId = req.user?.id;
        const { contentId, contentType, accessType, expiresAt } = req.body;
        if (!contentId || !contentType) {
            return res.status(400).json({ error: 'contentId and contentType are required' });
        }
        const access = await accessService.grantAccess(userId, contentId, contentType, accessType, expiresAt ? new Date(expiresAt) : undefined);
        res.json(access);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/**
 * @swagger
 * /api/subscriptions/access/accessible:
 *   get:
 *     summary: Get all accessible content for current user
 */
router.get('/accessible', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const content = await accessService.getAccessibleContent(userId);
        res.json(content);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
