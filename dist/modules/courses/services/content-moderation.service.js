"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentModerationService = void 0;
const prisma_1 = require("../../../utils/prisma");
class ContentModerationService {
    /**
     * Flag content for review
     */
    async flagContent(data) {
        // Check if already flagged
        const existing = await prisma_1.prisma.contentFlag.findFirst({
            where: {
                contentId: data.contentId,
                contentType: data.contentType,
                status: { in: ['pending', 'under_review'] },
            },
        });
        if (existing) {
            throw new Error('Content already flagged and pending review');
        }
        const flag = await prisma_1.prisma.contentFlag.create({
            data: {
                contentId: data.contentId,
                contentType: data.contentType,
                reason: data.reason,
                reportedBy: data.reportedBy,
                description: data.description || null,
                status: 'pending',
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapToDto(flag);
    }
    /**
     * Get flagged content (Admin/Moderator only)
     */
    async getFlaggedContent(status, page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        const take = Math.min(limit, 100);
        const where = {};
        if (status) {
            where.status = status;
        }
        const [flags, total] = await Promise.all([
            prisma_1.prisma.contentFlag.findMany({
                where,
                skip,
                take,
                include: {
                    reporter: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                    reviewer: {
                        select: {
                            id: true,
                            username: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma_1.prisma.contentFlag.count({ where }),
        ]);
        return {
            data: flags.map(this.mapToDto),
            pagination: {
                page,
                limit: take,
                total,
                totalPages: Math.ceil(total / take),
            },
        };
    }
    /**
     * Review flagged content (Admin/Moderator only)
     */
    async reviewFlag(flagId, reviewerId, action, notes) {
        const flag = await prisma_1.prisma.contentFlag.findUnique({
            where: { id: flagId },
        });
        if (!flag) {
            throw new Error('Flag not found');
        }
        if (flag.status !== 'pending' && flag.status !== 'under_review') {
            throw new Error('Flag already reviewed');
        }
        // Update flag status
        const updated = await prisma_1.prisma.contentFlag.update({
            where: { id: flagId },
            data: {
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'removed',
                reviewedBy: reviewerId,
                reviewedAt: new Date(),
                action: notes || action,
            },
            include: {
                reporter: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
                reviewer: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
        });
        // If action is remove, delete/hide the content
        if (action === 'remove') {
            await this.removeContent(flag.contentType, flag.contentId);
        }
        return this.mapToDto(updated);
    }
    /**
     * Remove content based on type
     */
    async removeContent(contentType, contentId) {
        switch (contentType) {
            case 'course':
                // Course doesn't have isPublished field, could add a status field or delete
                // For now, we'll just mark it in the flag
                break;
            case 'lesson':
                // Lesson doesn't have isPublished, skip for now or delete
                // await prisma.lesson.delete({ where: { id: contentId } });
                break;
            case 'quiz':
                await prisma_1.prisma.quiz.update({
                    where: { id: contentId },
                    data: { isPublished: false },
                });
                break;
            case 'assignment':
                await prisma_1.prisma.assignment.update({
                    where: { id: contentId },
                    data: { isPublished: false },
                });
                break;
            case 'message':
                await prisma_1.prisma.message.delete({
                    where: { id: contentId },
                });
                break;
            // Add more content types as needed
        }
    }
    /**
     * Get flag statistics (Admin only)
     */
    async getFlagStatistics() {
        const [total, pending, approved, rejected, removed, allFlags] = await Promise.all([
            prisma_1.prisma.contentFlag.count(),
            prisma_1.prisma.contentFlag.count({ where: { status: 'pending' } }),
            prisma_1.prisma.contentFlag.count({ where: { status: 'approved' } }),
            prisma_1.prisma.contentFlag.count({ where: { status: 'rejected' } }),
            prisma_1.prisma.contentFlag.count({ where: { status: 'removed' } }),
            prisma_1.prisma.contentFlag.findMany({
                select: {
                    contentType: true,
                    reason: true,
                },
            }),
        ]);
        // Group by type
        const byTypeMap = new Map();
        allFlags.forEach((flag) => {
            const count = byTypeMap.get(flag.contentType) || 0;
            byTypeMap.set(flag.contentType, count + 1);
        });
        // Group by reason
        const byReasonMap = new Map();
        allFlags.forEach((flag) => {
            const count = byReasonMap.get(flag.reason) || 0;
            byReasonMap.set(flag.reason, count + 1);
        });
        return {
            total,
            pending,
            approved,
            rejected,
            removed,
            byType: Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count })),
            byReason: Array.from(byReasonMap.entries()).map(([reason, count]) => ({ reason, count })),
        };
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(flag) {
        return {
            id: flag.id,
            contentId: flag.contentId,
            contentType: flag.contentType,
            reason: flag.reason,
            reportedBy: flag.reportedBy,
            reporter: flag.reporter,
            description: flag.description || undefined,
            status: flag.status,
            reviewedBy: flag.reviewedBy || undefined,
            reviewedAt: flag.reviewedAt || undefined,
            action: flag.action || undefined,
            createdAt: flag.createdAt,
            updatedAt: flag.updatedAt,
        };
    }
}
exports.ContentModerationService = ContentModerationService;
