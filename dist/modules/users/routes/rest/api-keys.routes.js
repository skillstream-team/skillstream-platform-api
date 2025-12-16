"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const api_keys_service_1 = require("../../services/api-keys.service");
const auth_1 = require("../../../../middleware/auth");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const apiKeysService = new api_keys_service_1.ApiKeysService();
/**
 * @swagger
 * /api/api-keys:
 *   post:
 *     summary: Create API key
 *     tags: [API Keys]
 */
const createApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    permissions: zod_1.z.array(zod_1.z.string()).min(1),
    rateLimit: zod_1.z.number().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
router.post('/api-keys', auth_1.requireAuth, (0, validation_1.validate)({ body: createApiKeySchema }), async (req, res) => {
    try {
        const userId = req.user?.id;
        const apiKey = await apiKeysService.createApiKey({
            ...req.body,
            userId,
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        });
        res.status(201).json({
            success: true,
            data: apiKey,
            message: 'API key created successfully. Save this key - it will not be shown again.'
        });
    }
    catch (error) {
        console.error('Error creating API key:', error);
        res.status(500).json({ error: error.message || 'Failed to create API key' });
    }
});
/**
 * @swagger
 * /api/api-keys:
 *   get:
 *     summary: Get user's API keys
 *     tags: [API Keys]
 */
router.get('/api-keys', auth_1.requireAuth, async (req, res) => {
    try {
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';
        const apiKeys = isAdmin
            ? await apiKeysService.getAllApiKeys()
            : await apiKeysService.getUserApiKeys(userId);
        res.json({
            success: true,
            data: apiKeys
        });
    }
    catch (error) {
        console.error('Error fetching API keys:', error);
        res.status(500).json({ error: 'Failed to fetch API keys' });
    }
});
/**
 * @swagger
 * /api/api-keys/{id}:
 *   get:
 *     summary: Get API key by ID
 *     tags: [API Keys]
 */
router.get('/api-keys/:id', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ id: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';
        const apiKey = await apiKeysService.getApiKeyById(id, isAdmin ? undefined : userId);
        res.json({
            success: true,
            data: apiKey
        });
    }
    catch (error) {
        console.error('Error fetching API key:', error);
        res.status(404).json({ error: error.message || 'API key not found' });
    }
});
/**
 * @swagger
 * /api/api-keys/{id}:
 *   put:
 *     summary: Update API key
 *     tags: [API Keys]
 */
const updateApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).optional(),
    permissions: zod_1.z.array(zod_1.z.string()).min(1).optional(),
    rateLimit: zod_1.z.number().optional(),
    expiresAt: zod_1.z.string().datetime().optional(),
});
router.put('/api-keys/:id', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateApiKeySchema
}), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';
        const apiKey = await apiKeysService.updateApiKey(id, {
            ...req.body,
            expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        }, isAdmin ? undefined : userId);
        res.json({
            success: true,
            data: apiKey,
            message: 'API key updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating API key:', error);
        res.status(500).json({ error: error.message || 'Failed to update API key' });
    }
});
/**
 * @swagger
 * /api/api-keys/{id}:
 *   delete:
 *     summary: Delete API key
 *     tags: [API Keys]
 */
router.delete('/api-keys/:id', auth_1.requireAuth, (0, validation_1.validate)({ params: zod_1.z.object({ id: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';
        await apiKeysService.deleteApiKey(id, isAdmin ? undefined : userId);
        res.json({
            success: true,
            message: 'API key deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting API key:', error);
        res.status(500).json({ error: error.message || 'Failed to delete API key' });
    }
});
/**
 * @swagger
 * /api/api-keys/{id}/toggle:
 *   put:
 *     summary: Toggle API key active status
 *     tags: [API Keys]
 */
router.put('/api-keys/:id/toggle', auth_1.requireAuth, (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: zod_1.z.object({ isActive: zod_1.z.boolean() })
}), async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.id;
        const isAdmin = req.user?.role === 'ADMIN';
        const apiKey = await apiKeysService.toggleApiKey(id, req.body.isActive, isAdmin ? undefined : userId);
        res.json({
            success: true,
            data: apiKey,
            message: `API key ${req.body.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling API key:', error);
        res.status(500).json({ error: error.message || 'Failed to toggle API key' });
    }
});
exports.default = router;
