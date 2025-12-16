import { prisma } from '../../../utils/prisma';
import crypto from 'crypto';

export interface CreateApiKeyDto {
  name: string;
  userId?: string;
  permissions: string[];
  rateLimit?: number;
  expiresAt?: Date;
}

export interface ApiKeyResponseDto {
  id: string;
  name: string;
  key: string; // Only returned on creation
  permissions: string[];
  rateLimit: number;
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApiKeyListDto {
  id: string;
  name: string;
  permissions: string[];
  rateLimit: number;
  lastUsed?: Date;
  expiresAt?: Date;
  isActive: boolean;
  createdAt: Date;
}

export class ApiKeysService {
  /**
   * Generate API key
   */
  private generateApiKey(): string {
    return `sk_${crypto.randomBytes(32).toString('hex')}`;
  }

  /**
   * Hash API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create API key
   */
  async createApiKey(data: CreateApiKeyDto): Promise<ApiKeyResponseDto> {
    const apiKey = this.generateApiKey();
    const keyHash = this.hashApiKey(apiKey);

    const created = await prisma.apiKey.create({
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
  async getUserApiKeys(userId: string): Promise<ApiKeyListDto[]> {
    const apiKeys = await prisma.apiKey.findMany({
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
  async getAllApiKeys(): Promise<ApiKeyListDto[]> {
    const apiKeys = await prisma.apiKey.findMany({
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
  async getApiKeyById(id: string, userId?: string): Promise<ApiKeyListDto> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const apiKey = await prisma.apiKey.findFirst({
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
  async validateApiKey(key: string): Promise<{
    valid: boolean;
    apiKey?: {
      id: string;
      userId?: string;
      permissions: string[];
      rateLimit: number;
    };
  }> {
    const keyHash = this.hashApiKey(key);

    const apiKey = await prisma.apiKey.findUnique({
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
    await prisma.apiKey.update({
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
  async updateApiKey(
    id: string,
    data: Partial<CreateApiKeyDto>,
    userId?: string
  ): Promise<ApiKeyListDto> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const existing = await prisma.apiKey.findFirst({ where });
    if (!existing) {
      throw new Error('API key not found');
    }

    const updateData: any = {};
    if (data.name) updateData.name = data.name;
    if (data.permissions) updateData.permissions = data.permissions;
    if (data.rateLimit) updateData.rateLimit = data.rateLimit;
    if (data.expiresAt !== undefined) updateData.expiresAt = data.expiresAt;

    const updated = await prisma.apiKey.update({
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
  async deleteApiKey(id: string, userId?: string): Promise<void> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    await prisma.apiKey.deleteMany({ where });
  }

  /**
   * Toggle API key active status
   */
  async toggleApiKey(id: string, isActive: boolean, userId?: string): Promise<ApiKeyListDto> {
    const where: any = { id };
    if (userId) {
      where.userId = userId;
    }

    const existing = await prisma.apiKey.findFirst({ where });
    if (!existing) {
      throw new Error('API key not found');
    }

    const updated = await prisma.apiKey.update({
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
