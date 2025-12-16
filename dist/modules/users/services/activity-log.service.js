"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActivityLogService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ActivityLogService {
    /**
     * Log an activity
     */
    async logActivity(data) {
        const activity = await prisma_1.prisma.activityLog.create({
            data: {
                userId: data.userId,
                action: data.action,
                entity: data.entity,
                entityId: data.entityId,
                metadata: data.metadata ? data.metadata : null,
            },
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
        return this.mapToDto(activity);
    }
    /**
     * Get user activity feed
     */
    async getUserActivityFeed(userId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [activities, total] = await Promise.all([
            prisma_1.prisma.activityLog.findMany({
                where: { userId },
                skip,
                take,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.activityLog.count({ where: { userId } }),
        ]);
        return {
            data: activities.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Get activity feed for an entity
     */
    async getEntityActivityFeed(entity, entityId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [activities, total] = await Promise.all([
            prisma_1.prisma.activityLog.findMany({
                where: { entity, entityId },
                skip,
                take,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.activityLog.count({ where: { entity, entityId } }),
        ]);
        return {
            data: activities.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Get recent activities (global feed)
     */
    async getRecentActivities(page = 1, limit = 20, action) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = {};
        if (action) {
            where.action = action;
        }
        const [activities, total] = await Promise.all([
            prisma_1.prisma.activityLog.findMany({
                where,
                skip,
                take,
                include: {
                    user: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.activityLog.count({ where }),
        ]);
        return {
            data: activities.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
                hasNext: page * take < total,
                hasPrev: page > 1,
            },
        };
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(activity) {
        return {
            id: activity.id,
            userId: activity.userId,
            user: activity.user,
            action: activity.action,
            entity: activity.entity,
            entityId: activity.entityId || undefined,
            metadata: activity.metadata
                ? (typeof activity.metadata === 'string'
                    ? JSON.parse(activity.metadata)
                    : activity.metadata)
                : undefined,
            createdAt: activity.createdAt,
        };
    }
}
exports.ActivityLogService = ActivityLogService;
