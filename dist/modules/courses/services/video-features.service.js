"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoFeaturesService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
class VideoFeaturesService {
    /**
     * Create video chapter
     */
    async createChapter(data) {
        const chapter = await prisma_1.prisma.videoChapter.create({
            data,
        });
        await (0, cache_1.deleteCache)(`video:${data.videoId}`);
        return this.mapChapterToDto(chapter);
    }
    /**
     * Get video chapters
     */
    async getVideoChapters(videoId) {
        const chapters = await prisma_1.prisma.videoChapter.findMany({
            where: { videoId },
            orderBy: { order: 'asc' },
        });
        return chapters.map(this.mapChapterToDto);
    }
    /**
     * Create video note
     */
    async createNote(data) {
        const note = await prisma_1.prisma.videoNote.create({
            data,
        });
        return this.mapNoteToDto(note);
    }
    /**
     * Get user's video notes
     */
    async getUserVideoNotes(videoId, userId) {
        const notes = await prisma_1.prisma.videoNote.findMany({
            where: { videoId, userId },
            orderBy: { timestamp: 'asc' },
        });
        return notes.map(this.mapNoteToDto);
    }
    /**
     * Create video bookmark
     */
    async createBookmark(data) {
        const bookmark = await prisma_1.prisma.videoBookmark.create({
            data,
        });
        return this.mapBookmarkToDto(bookmark);
    }
    /**
     * Get user's video bookmarks
     */
    async getUserVideoBookmarks(videoId, userId) {
        const bookmarks = await prisma_1.prisma.videoBookmark.findMany({
            where: { videoId, userId },
            orderBy: { timestamp: 'asc' },
        });
        return bookmarks.map(this.mapBookmarkToDto);
    }
    /**
     * Create or update video transcript
     */
    async upsertTranscript(data) {
        const transcript = await prisma_1.prisma.videoTranscript.upsert({
            where: { videoId: data.videoId },
            update: {
                language: data.language,
                segments: data.segments,
            },
            create: {
                videoId: data.videoId,
                language: data.language,
                segments: data.segments,
            },
        });
        return this.mapTranscriptToDto(transcript);
    }
    /**
     * Get video transcript
     */
    async getVideoTranscript(videoId, language = 'en') {
        const transcript = await prisma_1.prisma.videoTranscript.findFirst({
            where: { videoId, language },
        });
        return transcript ? this.mapTranscriptToDto(transcript) : null;
    }
    /**
     * Update video analytics
     */
    async updateAnalytics(data) {
        const analytics = await prisma_1.prisma.videoAnalytics.upsert({
            where: {
                videoId_userId: {
                    videoId: data.videoId,
                    userId: data.userId,
                },
            },
            update: {
                watchTime: data.watchTime,
                completionRate: data.completionRate,
                dropOffPoints: data.dropOffPoints,
                playbackSpeed: data.playbackSpeed || 1.0,
                lastWatchedAt: new Date(),
            },
            create: {
                videoId: data.videoId,
                userId: data.userId,
                watchTime: data.watchTime,
                completionRate: data.completionRate,
                dropOffPoints: data.dropOffPoints,
                playbackSpeed: data.playbackSpeed || 1.0,
                lastWatchedAt: new Date(),
            },
        });
        return this.mapAnalyticsToDto(analytics);
    }
    /**
     * Get video analytics for a video (aggregated)
     */
    async getVideoAnalytics(videoId) {
        const allAnalytics = await prisma_1.prisma.videoAnalytics.findMany({
            where: { videoId },
        });
        if (allAnalytics.length === 0) {
            return {
                totalViews: 0,
                averageWatchTime: 0,
                averageCompletionRate: 0,
                dropOffPoints: [],
                playbackSpeedDistribution: [],
            };
        }
        const totalViews = allAnalytics.length;
        const averageWatchTime = allAnalytics.reduce((sum, a) => sum + a.watchTime, 0) / totalViews;
        const averageCompletionRate = allAnalytics.reduce((sum, a) => sum + a.completionRate, 0) / totalViews;
        // Aggregate drop-off points
        const dropOffMap = new Map();
        allAnalytics.forEach((a) => {
            if (a.dropOffPoints) {
                const points = a.dropOffPoints;
                points.forEach((point) => {
                    const rounded = Math.round(point / 10) * 10; // Round to nearest 10 seconds
                    dropOffMap.set(rounded, (dropOffMap.get(rounded) || 0) + 1);
                });
            }
        });
        const dropOffPoints = Array.from(dropOffMap.entries())
            .map(([timestamp, count]) => ({ timestamp, count }))
            .sort((a, b) => a.timestamp - b.timestamp);
        // Playback speed distribution
        const speedMap = new Map();
        allAnalytics.forEach((a) => {
            const speed = Math.round(a.playbackSpeed * 2) / 2; // Round to nearest 0.5
            speedMap.set(speed, (speedMap.get(speed) || 0) + 1);
        });
        const playbackSpeedDistribution = Array.from(speedMap.entries())
            .map(([speed, count]) => ({ speed, count }))
            .sort((a, b) => a.speed - b.speed);
        return {
            totalViews,
            averageWatchTime: Math.round(averageWatchTime),
            averageCompletionRate: Math.round(averageCompletionRate * 10) / 10,
            dropOffPoints,
            playbackSpeedDistribution,
        };
    }
    /**
     * Map Prisma model to DTO
     */
    mapChapterToDto(chapter) {
        return {
            id: chapter.id,
            videoId: chapter.videoId,
            title: chapter.title,
            startTime: chapter.startTime,
            endTime: chapter.endTime || undefined,
            order: chapter.order,
            createdAt: chapter.createdAt,
            updatedAt: chapter.updatedAt,
        };
    }
    mapNoteToDto(note) {
        return {
            id: note.id,
            videoId: note.videoId,
            userId: note.userId,
            timestamp: note.timestamp,
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
        };
    }
    mapBookmarkToDto(bookmark) {
        return {
            id: bookmark.id,
            videoId: bookmark.videoId,
            userId: bookmark.userId,
            timestamp: bookmark.timestamp,
            title: bookmark.title || undefined,
            notes: bookmark.notes || undefined,
            createdAt: bookmark.createdAt,
            updatedAt: bookmark.updatedAt,
        };
    }
    mapTranscriptToDto(transcript) {
        return {
            id: transcript.id,
            videoId: transcript.videoId,
            language: transcript.language,
            segments: transcript.segments,
            createdAt: transcript.createdAt,
            updatedAt: transcript.updatedAt,
        };
    }
    mapAnalyticsToDto(analytics) {
        return {
            id: analytics.id,
            videoId: analytics.videoId,
            userId: analytics.userId,
            watchTime: analytics.watchTime,
            completionRate: analytics.completionRate,
            dropOffPoints: analytics.dropOffPoints
                ? analytics.dropOffPoints
                : undefined,
            playbackSpeed: analytics.playbackSpeed,
            lastWatchedAt: analytics.lastWatchedAt,
            createdAt: analytics.createdAt,
            updatedAt: analytics.updatedAt,
        };
    }
}
exports.VideoFeaturesService = VideoFeaturesService;
