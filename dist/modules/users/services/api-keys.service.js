"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeysService = void 0;
const prisma_1 = require("../../../utils/prisma");
const crypto_1 = __importDefault(require("crypto"));
class ApiKeysService {
    /**
     * Generate API key
     */
    generateApiKey() {
        return `sk_${crypto_1.default.randomBytes(32).toString('hex')}`;
    }
    /**
     * Hash API key for storage
     */
    hashApiKey(key) {
        return crypto_1.default.createHash('sha256').update(key).digest('hex');
    }
    /**
     * Create API key
     */
    async createApiKey(data) {
        const apiKey = this.generateApiKey();
        const keyHash = this.hashApiKey(apiKey);
        const created = await prisma_1.prisma.apiKey.create({
            data: {
                name: data.name,
                userId: data.userId,
                keyHash,
                permissions: data.permissions,
                rateLimit: data.rateLimit || 1000,
                expiresAt: data.expiresAt,
                isActive: true,
            },
        });
        return {
            id: created.id,
            name: created.name,
            key: apiKey, // Return plain key only on creation
            permissions: created.permissions,
            rateLimit: created.rateLimit,
            lastUsed: created.lastUsed || undefined,
            expiresAt: created.expiresAt || undefined,
            isActive: created.isActive,
            createdAt: created.createdAt,
            updatedAt: created.updatedAt,
        };
    }
    /**
     * Get all API keys for a user
     */
    async getUserApiKeys(userId) {
        const apiKeys = await prisma_1.prisma.apiKey.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
        });
        return apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            permissions: key.permissions,
            rateLimit: key.rateLimit,
            lastUsed: key.lastUsed || undefined,
            expiresAt: key.expiresAt || undefined,
            isActive: key.isActive,
            createdAt: key.createdAt,
        }));
    }
    /**
     * Get all API keys (Admin only)
     */
    async getAllApiKeys() {
        const apiKeys = await prisma_1.prisma.apiKey.findMany({
            orderBy: { createdAt: 'desc' },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return apiKeys.map((key) => ({
            id: key.id,
            name: key.name,
            permissions: key.permissions,
            rateLimit: key.rateLimit,
            lastUsed: key.lastUsed || undefined,
            expiresAt: key.expiresAt || undefined,
            isActive: key.isActive,
            createdAt: key.createdAt,
        }));
    }
    /**
     * Get API key by ID
     */
    async getApiKeyById(id, userId) {
        const where = { id };
        if (userId) {
            where.userId = userId;
        }
        const apiKey = await prisma_1.prisma.apiKey.findFirst({
            where,
        });
        if (!apiKey) {
            throw new Error('API key not found');
        }
        return {
            id: apiKey.id,
            name: apiKey.name,
            permissions: apiKey.permissions,
            rateLimit: apiKey.rateLimit,
            lastUsed: apiKey.lastUsed || undefined,
            expiresAt: apiKey.expiresAt || undefined,
            isActive: apiKey.isActive,
            createdAt: apiKey.createdAt,
        };
    }
    /**
     * Validate API key
     */
    async validateApiKey(key) {
        const keyHash = this.hashApiKey(key);
        const apiKey = await prisma_1.prisma.apiKey.findUnique({
            where: { keyHash },
        });
        if (!apiKey || !apiKey.isActive) {
            return { valid: false };
        }
        // Check expiration
        if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { valid: false };
        }
        // Update last used
        await prisma_1.prisma.apiKey.update({
            where: { id: apiKey.id },
            data: { lastUsed: new Date() },
        });
        return {
            valid: true,
            apiKey: {
                id: apiKey.id,
                userId: apiKey.userId || undefined,
                permissions: apiKey.permissions,
                rateLimit: apiKey.rateLimit,
            },
        };
    }
    /**
     * Update API key
     */
    async updateApiKey(id, data, userId) {
        const where = { id };
        if (userId) {
            where.userId = userId;
        }
        const existing = await prisma_1.prisma.apiKey.findFirst({ where });
        if (!existing) {
            throw new Error('API key not found');
        }
        const updateData = {};
        if (data.name)
            updateData.name = data.name;
        if (data.permissions)
            updateData.permissions = data.permissions;
        if (data.rateLimit)
            updateData.rateLimit = data.rateLimit;
        if (data.expiresAt !== undefined)
            updateData.expiresAt = data.expiresAt;
        const updated = await prisma_1.prisma.apiKey.update({
            where: { id },
            data: updateData,
        });
        return {
            id: updated.id,
            name: updated.name,
            permissions: updated.permissions,
            rateLimit: updated.rateLimit,
            lastUsed: updated.lastUsed || undefined,
            expiresAt: updated.expiresAt || undefined,
            isActive: updated.isActive,
            createdAt: updated.createdAt,
        };
    }
    /**
     * Delete API key
     */
    async deleteApiKey(id, userId) {
        const where = { id };
        if (userId) {
            where.userId = userId;
        }
        await prisma_1.prisma.apiKey.deleteMany({ where });
    }
    /**
     * Toggle API key active status
     */
    async toggleApiKey(id, isActive, userId) {
        const where = { id };
        if (userId) {
            where.userId = userId;
        }
        const existing = await prisma_1.prisma.apiKey.findFirst({ where });
        if (!existing) {
            throw new Error('API key not found');
        }
        const updated = await prisma_1.prisma.apiKey.update({
            where: { id },
            data: { isActive },
        });
        return {
            id: updated.id,
            name: updated.name,
            permissions: updated.permissions,
            rateLimit: updated.rateLimit,
            lastUsed: updated.lastUsed || undefined,
            expiresAt: updated.expiresAt || undefined,
            isActive: updated.isActive,
            createdAt: updated.createdAt,
        };
    }
}
exports.ApiKeysService = ApiKeysService;
