"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const webhooks_service_1 = require("../../services/webhooks.service");
const auth_1 = require("../../../../middleware/auth");
const roles_1 = require("../../../../middleware/roles");
const validation_1 = require("../../../../middleware/validation");
const zod_1 = require("zod");
const router = (0, express_1.Router)();
const webhooksService = new webhooks_service_1.WebhooksService();
/**
 * @swagger
 * /api/webhooks:
 *   post:
 *     summary: Create a webhook (Admin only)
 *     tags: [Webhooks]
 */
const createWebhookSchema = zod_1.z.object({
    url: zod_1.z.string().url(),
    events: zod_1.z.array(zod_1.z.string()).min(1),
    secret: zod_1.z.string().optional(),
});
router.post('/webhooks', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ body: createWebhookSchema }), async (req, res) => {
    try {
        const webhook = await webhooksService.createWebhook(req.body);
        res.status(201).json({
            success: true,
            data: webhook,
            message: 'Webhook created successfully'
        });
    }
    catch (error) {
        console.error('Error creating webhook:', error);
        res.status(500).json({ error: error.message || 'Failed to create webhook' });
    }
});
/**
 * @swagger
 * /api/webhooks:
 *   get:
 *     summary: Get all webhooks (Admin only)
 *     tags: [Webhooks]
 */
router.get('/webhooks', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const webhooks = await webhooksService.getAllWebhooks();
        res.json({
            success: true,
            data: webhooks
        });
    }
    catch (error) {
        console.error('Error fetching webhooks:', error);
        res.status(500).json({ error: 'Failed to fetch webhooks' });
    }
});
/**
 * @swagger
 * /api/webhooks/{id}:
 *   get:
 *     summary: Get webhook by ID (Admin only)
 *     tags: [Webhooks]
 */
router.get('/webhooks/:id', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ params: zod_1.z.object({ id: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const webhook = await webhooksService.getWebhookById(req.params.id);
        res.json({
            success: true,
            data: webhook
        });
    }
    catch (error) {
        console.error('Error fetching webhook:', error);
        res.status(404).json({ error: error.message || 'Webhook not found' });
    }
});
/**
 * @swagger
 * /api/webhooks/{id}:
 *   put:
 *     summary: Update webhook (Admin only)
 *     tags: [Webhooks]
 */
const updateWebhookSchema = zod_1.z.object({
    url: zod_1.z.string().url().optional(),
    events: zod_1.z.array(zod_1.z.string()).min(1).optional(),
    secret: zod_1.z.string().optional(),
});
router.put('/webhooks/:id', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: updateWebhookSchema
}), async (req, res) => {
    try {
        const webhook = await webhooksService.updateWebhook(req.params.id, req.body);
        res.json({
            success: true,
            data: webhook,
            message: 'Webhook updated successfully'
        });
    }
    catch (error) {
        console.error('Error updating webhook:', error);
        res.status(500).json({ error: error.message || 'Failed to update webhook' });
    }
});
/**
 * @swagger
 * /api/webhooks/{id}:
 *   delete:
 *     summary: Delete webhook (Admin only)
 *     tags: [Webhooks]
 */
router.delete('/webhooks/:id', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ params: zod_1.z.object({ id: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        await webhooksService.deleteWebhook(req.params.id);
        res.json({
            success: true,
            message: 'Webhook deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting webhook:', error);
        res.status(500).json({ error: error.message || 'Failed to delete webhook' });
    }
});
/**
 * @swagger
 * /api/webhooks/{id}/toggle:
 *   put:
 *     summary: Toggle webhook active status (Admin only)
 *     tags: [Webhooks]
 */
router.put('/webhooks/:id/toggle', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({
    params: zod_1.z.object({ id: zod_1.z.string().min(1) }),
    body: zod_1.z.object({ isActive: zod_1.z.boolean() })
}), async (req, res) => {
    try {
        const webhook = await webhooksService.toggleWebhook(req.params.id, req.body.isActive);
        res.json({
            success: true,
            data: webhook,
            message: `Webhook ${req.body.isActive ? 'activated' : 'deactivated'} successfully`
        });
    }
    catch (error) {
        console.error('Error toggling webhook:', error);
        res.status(500).json({ error: error.message || 'Failed to toggle webhook' });
    }
});
/**
 * @swagger
 * /api/webhooks/{id}/deliveries:
 *   get:
 *     summary: Get webhook deliveries (Admin only)
 *     tags: [Webhooks]
 */
router.get('/webhooks/:id/deliveries', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), (0, validation_1.validate)({ params: zod_1.z.object({ id: zod_1.z.string().min(1) }) }), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await webhooksService.getWebhookDeliveries(req.params.id, page, limit);
        res.json({
            success: true,
            ...result
        });
    }
    catch (error) {
        console.error('Error fetching webhook deliveries:', error);
        res.status(500).json({ error: 'Failed to fetch webhook deliveries' });
    }
});
/**
 * @swagger
 * /api/webhooks/retry-failed:
 *   post:
 *     summary: Retry failed webhook deliveries (Admin only)
 *     tags: [Webhooks]
 */
router.post('/webhooks/retry-failed', auth_1.requireAuth, (0, roles_1.requireRole)('ADMIN'), async (req, res) => {
    try {
        const retried = await webhooksService.retryFailedDeliveries();
        res.json({
            success: true,
            data: { retried },
            message: `Retried ${retried} failed webhook deliveries`
        });
    }
    catch (error) {
        console.error('Error retrying webhook deliveries:', error);
        res.status(500).json({ error: 'Failed to retry webhook deliveries' });
    }
});
exports.default = router;
