"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebhooksService = void 0;
const prisma_1 = require("../../../utils/prisma");
const crypto_1 = __importDefault(require("crypto"));
const axios_1 = __importDefault(require("axios"));
class WebhooksService {
    /**
     * Generate a webhook secret
     */
    generateSecret() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
    /**
     * Create a webhook signature
     */
    createSignature(secret, payload) {
        return crypto_1.default
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    }
    /**
     * Create a webhook
     */
    async createWebhook(data) {
        const secret = data.secret || this.generateSecret();
        const webhook = await prisma_1.prisma.webhook.create({
            data: {
                url: data.url,
                secret,
                events: data.events,
                isActive: true,
            },
        });
        return this.mapToDto(webhook);
    }
    /**
     * Get all webhooks
     */
    async getAllWebhooks() {
        const webhooks = await prisma_1.prisma.webhook.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return webhooks.map(this.mapToDto);
    }
    /**
     * Get webhook by ID
     */
    async getWebhookById(id) {
        const webhook = await prisma_1.prisma.webhook.findUnique({
            where: { id },
        });
        if (!webhook) {
            throw new Error('Webhook not found');
        }
        return this.mapToDto(webhook);
    }
    /**
     * Update webhook
     */
    async updateWebhook(id, data) {
        const updateData = {};
        if (data.url)
            updateData.url = data.url;
        if (data.events)
            updateData.events = data.events;
        if (data.secret)
            updateData.secret = data.secret;
        const webhook = await prisma_1.prisma.webhook.update({
            where: { id },
            data: updateData,
        });
        return this.mapToDto(webhook);
    }
    /**
     * Delete webhook
     */
    async deleteWebhook(id) {
        await prisma_1.prisma.webhook.delete({
            where: { id },
        });
    }
    /**
     * Toggle webhook active status
     */
    async toggleWebhook(id, isActive) {
        const webhook = await prisma_1.prisma.webhook.update({
            where: { id },
            data: { isActive },
        });
        return this.mapToDto(webhook);
    }
    /**
     * Trigger webhook (internal use)
     */
    async triggerWebhook(webhookId, event, payload) {
        const webhook = await prisma_1.prisma.webhook.findUnique({
            where: { id: webhookId },
        });
        if (!webhook || !webhook.isActive) {
            return;
        }
        // Check if webhook subscribes to this event
        if (!webhook.events.includes(event)) {
            return;
        }
        const payloadString = JSON.stringify(payload);
        const signature = this.createSignature(webhook.secret, payloadString);
        // Create delivery record
        const delivery = await prisma_1.prisma.webhookDelivery.create({
            data: {
                webhookId: webhook.id,
                event,
                payload: payload,
                status: 'pending',
                attempts: 0,
            },
        });
        // Attempt delivery
        try {
            const response = await axios_1.default.post(webhook.url, payload, {
                headers: {
                    'X-Webhook-Signature': signature,
                    'X-Webhook-Event': event,
                    'Content-Type': 'application/json',
                },
                timeout: 10000, // 10 second timeout
            });
            // Success
            await prisma_1.prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    status: 'success',
                    statusCode: response.status,
                    response: JSON.stringify(response.data),
                    deliveredAt: new Date(),
                },
            });
            await prisma_1.prisma.webhook.update({
                where: { id: webhook.id },
                data: {
                    lastTriggered: new Date(),
                    failureCount: 0,
                },
            });
        }
        catch (error) {
            // Failure
            const statusCode = error.response?.status;
            const response = error.response?.data
                ? JSON.stringify(error.response.data)
                : error.message;
            await prisma_1.prisma.webhookDelivery.update({
                where: { id: delivery.id },
                data: {
                    status: 'failed',
                    statusCode: statusCode || 0,
                    response,
                    attempts: 1,
                    nextRetry: new Date(Date.now() + 60000), // Retry in 1 minute
                },
            });
            await prisma_1.prisma.webhook.update({
                where: { id: webhook.id },
                data: {
                    failureCount: webhook.failureCount + 1,
                },
            });
        }
    }
    /**
     * Trigger webhooks for an event (finds all matching webhooks)
     */
    async triggerEvent(event, payload) {
        const webhooks = await prisma_1.prisma.webhook.findMany({
            where: {
                isActive: true,
                events: { has: event },
            },
        });
        // Trigger all matching webhooks in parallel
        await Promise.allSettled(webhooks.map((webhook) => this.triggerWebhook(webhook.id, event, payload)));
    }
    /**
     * Retry failed webhook deliveries
     */
    async retryFailedDeliveries() {
        const failedDeliveries = await prisma_1.prisma.webhookDelivery.findMany({
            where: {
                status: 'failed',
                nextRetry: { lte: new Date() },
                attempts: { lt: 5 }, // Max 5 attempts
            },
            include: {
                webhook: true,
            },
        });
        let retried = 0;
        for (const delivery of failedDeliveries) {
            if (!delivery.webhook.isActive)
                continue;
            const payloadString = JSON.stringify(delivery.payload);
            const signature = this.createSignature(delivery.webhook.secret, payloadString);
            try {
                const response = await axios_1.default.post(delivery.webhook.url, delivery.payload, {
                    headers: {
                        'X-Webhook-Signature': signature,
                        'X-Webhook-Event': delivery.event,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                });
                await prisma_1.prisma.webhookDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'success',
                        statusCode: response.status,
                        response: JSON.stringify(response.data),
                        deliveredAt: new Date(),
                    },
                });
                retried++;
            }
            catch (error) {
                const statusCode = error.response?.status;
                const response = error.response?.data
                    ? JSON.stringify(error.response.data)
                    : error.message;
                const nextRetry = new Date(Date.now() + Math.pow(2, delivery.attempts) * 60000); // Exponential backoff
                await prisma_1.prisma.webhookDelivery.update({
                    where: { id: delivery.id },
                    data: {
                        status: 'failed',
                        statusCode: statusCode || 0,
                        response,
                        attempts: delivery.attempts + 1,
                        nextRetry: delivery.attempts < 4 ? nextRetry : null, // Stop retrying after 5 attempts
                    },
                });
            }
        }
        return retried;
    }
    /**
     * Get webhook deliveries
     */
    async getWebhookDeliveries(webhookId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [deliveries, total] = await Promise.all([
            prisma_1.prisma.webhookDelivery.findMany({
                where: { webhookId },
                skip,
                take,
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.webhookDelivery.count({ where: { webhookId } }),
        ]);
        return {
            data: deliveries,
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(webhook) {
        return {
            id: webhook.id,
            url: webhook.url,
            events: webhook.events,
            isActive: webhook.isActive,
            lastTriggered: webhook.lastTriggered,
            failureCount: webhook.failureCount,
            createdAt: webhook.createdAt,
            updatedAt: webhook.updatedAt,
        };
    }
}
exports.WebhooksService = WebhooksService;
