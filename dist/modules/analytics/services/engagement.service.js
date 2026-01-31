"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EngagementService = void 0;
const prisma_1 = require("../../../utils/prisma");
class EngagementService {
    /**
     * Track lesson watch time
     */
    async trackWatchTime(studentId, contentId, contentType, minutes) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const engagementData = {
            studentId,
            watchTimeMinutes: minutes,
            lastWatchedAt: now,
            period,
        };
        if (contentType === 'COLLECTION') {
            engagementData.collectionId = contentId;
        }
        else {
            engagementData.lessonId = contentId;
        }
        // Find existing engagement record
        const existing = await prisma_1.prisma.studentEngagement.findFirst({
            where: {
                studentId,
                period,
                ...(contentType === 'COLLECTION'
                    ? { collectionId: contentId, lessonId: null }
                    : { lessonId: contentId, collectionId: null }),
            },
        });
        // Update or create engagement record
        const engagement = existing
            ? await prisma_1.prisma.studentEngagement.update({
                where: { id: existing.id },
                data: {
                    watchTimeMinutes: {
                        increment: minutes,
                    },
                    lastWatchedAt: now,
                },
            })
            : await prisma_1.prisma.studentEngagement.create({
                data: engagementData,
            });
        return engagement;
    }
    /**
     * Mark content as completed
     */
    async markCompleted(studentId, contentId, contentType) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const engagementData = {
            studentId,
            isCompleted: true,
            completionPercent: 100,
            completedAt: now,
            period,
        };
        if (contentType === 'COLLECTION') {
            engagementData.collectionId = contentId;
        }
        else {
            engagementData.lessonId = contentId;
        }
        // Find existing engagement record
        const existing = await prisma_1.prisma.studentEngagement.findFirst({
            where: {
                studentId,
                period,
                ...(contentType === 'COLLECTION'
                    ? { collectionId: contentId, lessonId: null }
                    : { lessonId: contentId, collectionId: null }),
            },
        });
        const engagement = existing
            ? await prisma_1.prisma.studentEngagement.update({
                where: { id: existing.id },
                data: {
                    isCompleted: true,
                    completionPercent: 100,
                    completedAt: now,
                },
            })
            : await prisma_1.prisma.studentEngagement.create({
                data: engagementData,
            });
        return engagement;
    }
    /**
     * Update completion percentage
     */
    async updateCompletionPercent(studentId, contentId, contentType, percent) {
        const now = new Date();
        const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        const engagementData = {
            studentId,
            completionPercent: Math.min(100, Math.max(0, percent)),
            isCompleted: percent >= 100,
            period,
            ...(percent >= 100 && { completedAt: now }),
        };
        if (contentType === 'COLLECTION') {
            engagementData.collectionId = contentId;
        }
        else {
            engagementData.lessonId = contentId;
        }
        // Find existing engagement record
        const existing = await prisma_1.prisma.studentEngagement.findFirst({
            where: {
                studentId,
                period,
                ...(contentType === 'COLLECTION'
                    ? { collectionId: contentId, lessonId: null }
                    : { lessonId: contentId, collectionId: null }),
            },
        });
        const engagement = existing
            ? await prisma_1.prisma.studentEngagement.update({
                where: { id: existing.id },
                data: {
                    completionPercent: Math.min(100, Math.max(0, percent)),
                    isCompleted: percent >= 100,
                    ...(percent >= 100 && { completedAt: now }),
                },
            })
            : await prisma_1.prisma.studentEngagement.create({
                data: engagementData,
            });
        return engagement;
    }
    /**
     * Get engagement for revenue calculation
     */
    async getEngagementForPeriod(period) {
        return prisma_1.prisma.studentEngagement.findMany({
            where: { period },
            include: {
                program: {
                    select: {
                        instructorId: true,
                    },
                },
                module: {
                    select: {
                        teacherId: true,
                    },
                },
            },
        });
    }
    /**
     * Get student engagement summary
     */
    async getStudentEngagement(studentId, period) {
        const where = { studentId };
        if (period) {
            where.period = period;
        }
        return prisma_1.prisma.studentEngagement.findMany({
            where,
            include: {
                program: {
                    select: {
                        id: true,
                        title: true,
                        thumbnailUrl: true,
                    },
                },
                module: {
                    select: {
                        id: true,
                        title: true,
                    },
                },
            },
        });
    }
}
exports.EngagementService = EngagementService;
