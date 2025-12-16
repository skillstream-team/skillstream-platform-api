"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WaitlistService = void 0;
const prisma_1 = require("../../../utils/prisma");
class WaitlistService {
    /**
     * Join waitlist for a course or event
     */
    async joinWaitlist(data) {
        if (!data.courseId && !data.eventId) {
            throw new Error('Either courseId or eventId must be provided');
        }
        // Check if already on waitlist
        const existing = await prisma_1.prisma.waitlistEntry.findFirst({
            where: {
                ...(data.courseId ? { courseId: data.courseId } : { eventId: data.eventId }),
                userId: data.userId,
            },
        });
        if (existing) {
            throw new Error('Already on waitlist');
        }
        // Get current position
        const count = await prisma_1.prisma.waitlistEntry.count({
            where: data.courseId ? { courseId: data.courseId } : { eventId: data.eventId },
        });
        const entry = await prisma_1.prisma.waitlistEntry.create({
            data: {
                courseId: data.courseId,
                eventId: data.eventId,
                userId: data.userId,
                position: count + 1,
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
        return this.mapToDto(entry);
    }
    /**
     * Get waitlist for a course or event
     */
    async getWaitlist(courseId, eventId) {
        if (!courseId && !eventId) {
            throw new Error('Either courseId or eventId must be provided');
        }
        const entries = await prisma_1.prisma.waitlistEntry.findMany({
            where: courseId ? { courseId } : { eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        username: true,
                        email: true,
                    },
                },
            },
            orderBy: { position: 'asc' },
        });
        return entries.map(this.mapToDto);
    }
    /**
     * Remove from waitlist
     */
    async leaveWaitlist(courseId, eventId, userId) {
        const where = { userId };
        if (courseId)
            where.courseId = courseId;
        if (eventId)
            where.eventId = eventId;
        await prisma_1.prisma.waitlistEntry.deleteMany({ where });
        // Recalculate positions
        await this.recalculatePositions(courseId, eventId);
    }
    /**
     * Process waitlist when space becomes available
     */
    async processWaitlist(courseId, eventId, availableSpots = 1) {
        const waitlist = await this.getWaitlist(courseId, eventId);
        const toNotify = waitlist.slice(0, availableSpots);
        for (const entry of toNotify) {
            await prisma_1.prisma.waitlistEntry.update({
                where: { id: entry.id },
                data: {
                    notifiedAt: new Date(),
                },
            });
        }
        return toNotify;
    }
    /**
     * Recalculate waitlist positions
     */
    async recalculatePositions(courseId, eventId) {
        const where = {};
        if (courseId)
            where.courseId = courseId;
        if (eventId)
            where.eventId = eventId;
        const entries = await prisma_1.prisma.waitlistEntry.findMany({
            where,
            orderBy: { createdAt: 'asc' },
        });
        for (let i = 0; i < entries.length; i++) {
            await prisma_1.prisma.waitlistEntry.update({
                where: { id: entries[i].id },
                data: { position: i + 1 },
            });
        }
    }
    /**
     * Map Prisma model to DTO
     */
    mapToDto(entry) {
        return {
            id: entry.id,
            courseId: entry.courseId || undefined,
            eventId: entry.eventId || undefined,
            userId: entry.userId,
            user: entry.user,
            position: entry.position,
            notifiedAt: entry.notifiedAt || undefined,
            enrolledAt: entry.enrolledAt || undefined,
            createdAt: entry.createdAt,
        };
    }
}
exports.WaitlistService = WaitlistService;
