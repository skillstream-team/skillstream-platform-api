"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhiteboardService = void 0;
const prisma_1 = require("../../../utils/prisma");
class WhiteboardService {
    /**
     * Create a new whiteboard
     */
    async createWhiteboard(data, userId) {
        // Validate course or liveStream exists
        if (data.courseId) {
            const course = await prisma_1.prisma.course.findUnique({
                where: { id: data.courseId },
            });
            if (!course) {
                throw new Error('Course not found');
            }
        }
        if (data.liveStreamId) {
            const stream = await prisma_1.prisma.liveStream.findUnique({
                where: { id: data.liveStreamId },
            });
            if (!stream) {
                throw new Error('Live stream not found');
            }
        }
        const whiteboard = await prisma_1.prisma.whiteboard.create({
            data: {
                courseId: data.courseId,
                liveStreamId: data.liveStreamId,
                title: data.title,
                description: data.description,
                backgroundColor: data.backgroundColor || '#FFFFFF',
                width: data.width || 1920,
                height: data.height || 1080,
                isPublic: data.isPublic || false,
                createdBy: userId,
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        actions: true,
                    },
                },
            },
        });
        return this.mapToResponseDto(whiteboard);
    }
    /**
     * Get whiteboard by ID
     */
    async getWhiteboardById(id, includeActions = false) {
        const whiteboard = await prisma_1.prisma.whiteboard.findUnique({
            where: { id },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                actions: includeActions
                    ? {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    email: true,
                                },
                            },
                        },
                        orderBy: { timestamp: 'asc' },
                    }
                    : false,
                _count: {
                    select: {
                        actions: true,
                    },
                },
            },
        });
        if (!whiteboard) {
            throw new Error('Whiteboard not found');
        }
        const response = this.mapToResponseDto(whiteboard);
        if (includeActions && 'actions' in whiteboard) {
            return {
                ...response,
                actions: whiteboard.actions.map(this.mapActionToResponseDto),
            };
        }
        return response;
    }
    /**
     * Get whiteboards for a course
     */
    async getCourseWhiteboards(courseId, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const [whiteboards, total] = await Promise.all([
            prisma_1.prisma.whiteboard.findMany({
                where: { courseId },
                skip,
                take,
                include: {
                    creator: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    _count: {
                        select: {
                            actions: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.whiteboard.count({ where: { courseId } }),
        ]);
        return {
            data: whiteboards.map(this.mapToResponseDto),
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
     * Get whiteboards for a live stream
     */
    async getStreamWhiteboards(liveStreamId) {
        const whiteboards = await prisma_1.prisma.whiteboard.findMany({
            where: { liveStreamId, isActive: true },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        actions: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return whiteboards.map(this.mapToResponseDto);
    }
    /**
     * Update whiteboard
     */
    async updateWhiteboard(id, userId, data) {
        // Check if user has permission
        const whiteboard = await prisma_1.prisma.whiteboard.findFirst({
            where: { id, createdBy: userId },
        });
        if (!whiteboard) {
            throw new Error('Whiteboard not found or you do not have permission to update it');
        }
        const updated = await prisma_1.prisma.whiteboard.update({
            where: { id },
            data: {
                ...(data.title && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.backgroundColor && { backgroundColor: data.backgroundColor }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
                ...(data.isPublic !== undefined && { isPublic: data.isPublic }),
            },
            include: {
                creator: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                _count: {
                    select: {
                        actions: true,
                    },
                },
            },
        });
        return this.mapToResponseDto(updated);
    }
    /**
     * Delete whiteboard
     */
    async deleteWhiteboard(id, userId) {
        const whiteboard = await prisma_1.prisma.whiteboard.findFirst({
            where: { id, createdBy: userId },
        });
        if (!whiteboard) {
            throw new Error('Whiteboard not found or you do not have permission to delete it');
        }
        await prisma_1.prisma.whiteboard.delete({
            where: { id },
        });
    }
    /**
     * Add action to whiteboard
     */
    async addAction(data, userId) {
        // Verify whiteboard exists and is active
        const whiteboard = await prisma_1.prisma.whiteboard.findUnique({
            where: { id: data.whiteboardId },
        });
        if (!whiteboard) {
            throw new Error('Whiteboard not found');
        }
        if (!whiteboard.isActive) {
            throw new Error('Whiteboard is not active');
        }
        // Check permissions (public or user is creator)
        if (!whiteboard.isPublic && whiteboard.createdBy !== userId) {
            throw new Error('You do not have permission to draw on this whiteboard');
        }
        const action = await prisma_1.prisma.whiteboardAction.create({
            data: {
                whiteboardId: data.whiteboardId,
                userId,
                actionType: data.actionType,
                data: data.data,
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
        return this.mapActionToResponseDto(action);
    }
    /**
     * Get whiteboard actions
     */
    async getWhiteboardActions(whiteboardId, limit = 1000) {
        const actions = await prisma_1.prisma.whiteboardAction.findMany({
            where: { whiteboardId },
            take: limit,
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
            orderBy: { timestamp: 'asc' },
        });
        return actions.map(this.mapActionToResponseDto);
    }
    /**
     * Clear whiteboard (delete all actions)
     */
    async clearWhiteboard(whiteboardId, userId) {
        const whiteboard = await prisma_1.prisma.whiteboard.findFirst({
            where: { id: whiteboardId, createdBy: userId },
        });
        if (!whiteboard) {
            throw new Error('Whiteboard not found or you do not have permission to clear it');
        }
        await prisma_1.prisma.whiteboardAction.deleteMany({
            where: { whiteboardId },
        });
    }
    /**
     * Map Prisma model to DTO
     */
    mapToResponseDto(whiteboard) {
        return {
            id: whiteboard.id,
            courseId: whiteboard.courseId,
            liveStreamId: whiteboard.liveStreamId,
            title: whiteboard.title,
            description: whiteboard.description,
            createdBy: whiteboard.createdBy,
            creator: whiteboard.creator,
            isActive: whiteboard.isActive,
            isPublic: whiteboard.isPublic,
            backgroundColor: whiteboard.backgroundColor,
            width: whiteboard.width,
            height: whiteboard.height,
            actionCount: whiteboard._count?.actions || 0,
            createdAt: whiteboard.createdAt,
            updatedAt: whiteboard.updatedAt,
        };
    }
    /**
     * Map action to DTO
     */
    mapActionToResponseDto(action) {
        return {
            id: action.id,
            whiteboardId: action.whiteboardId,
            userId: action.userId,
            user: action.user,
            actionType: action.actionType,
            data: action.data,
            timestamp: action.timestamp,
            createdAt: action.createdAt,
        };
    }
}
exports.WhiteboardService = WhiteboardService;
