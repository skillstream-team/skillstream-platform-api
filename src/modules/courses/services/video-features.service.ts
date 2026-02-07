import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateVideoChapterDto {
  videoId: string;
  title: string;
  startTime: number; // seconds
  endTime?: number;
  order: number;
}

export interface VideoChapterDto {
  id: string;
  videoId: string;
  title: string;
  startTime: number;
  endTime?: number;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoNoteDto {
  videoId: string;
  userId: string;
  timestamp: number; // seconds
  content: string;
}

export interface VideoNoteDto {
  id: string;
  videoId: string;
  userId: string;
  timestamp: number;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoBookmarkDto {
  videoId: string;
  userId: string;
  timestamp: number; // seconds
  title?: string;
  notes?: string;
}

export interface VideoBookmarkDto {
  id: string;
  videoId: string;
  userId: string;
  timestamp: number;
  title?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateVideoTranscriptDto {
  videoId: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
}

export interface VideoTranscriptDto {
  id: string;
  videoId: string;
  language: string;
  segments: Array<{ start: number; end: number; text: string }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateVideoAnalyticsDto {
  videoId: string;
  userId: string;
  watchTime: number; // seconds
  completionRate: number; // percentage
  dropOffPoints?: number[]; // timestamps
  playbackSpeed?: number;
}

export interface VideoAnalyticsDto {
  id: string;
  videoId: string;
  userId: string;
  watchTime: number;
  completionRate: number;
  dropOffPoints?: number[];
  playbackSpeed: number;
  lastWatchedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class VideoFeaturesService {
  /**
   * Create video chapter
   */
  async createChapter(data: CreateVideoChapterDto): Promise<VideoChapterDto> {
    const chapter = await prisma.videoChapter.create({
      data,
    });

    await deleteCache(`video:${data.videoId}`);

    return this.mapChapterToDto(chapter);
  }

  /**
   * Get video chapters
   */
  async getVideoChapters(videoId: string): Promise<VideoChapterDto[]> {
    const chapters = await prisma.videoChapter.findMany({
      where: { videoId },
      orderBy: { order: 'asc' },
    });

    return chapters.map(this.mapChapterToDto);
  }

  /**
   * Create video note
   */
  async createNote(data: CreateVideoNoteDto): Promise<VideoNoteDto> {
    const note = await prisma.videoNote.create({
      data,
    });

    return this.mapNoteToDto(note);
  }

  /**
   * Get user's video notes
   */
  async getUserVideoNotes(
    videoId: string,
    userId: string
  ): Promise<VideoNoteDto[]> {
    const notes = await prisma.videoNote.findMany({
      where: { videoId, userId },
      orderBy: { timestamp: 'asc' },
    });

    return notes.map(this.mapNoteToDto);
  }

  /**
   * Delete a video note (only if owned by user)
   */
  async deleteNote(videoId: string, noteId: string, userId: string): Promise<void> {
    await prisma.videoNote.deleteMany({
      where: { id: noteId, videoId, userId },
    });
  }

  /**
   * Create video bookmark
   */
  async createBookmark(data: CreateVideoBookmarkDto): Promise<VideoBookmarkDto> {
    const bookmark = await prisma.videoBookmark.create({
      data,
    });

    return this.mapBookmarkToDto(bookmark);
  }

  /**
   * Get user's video bookmarks
   */
  async getUserVideoBookmarks(
    videoId: string,
    userId: string
  ): Promise<VideoBookmarkDto[]> {
    const bookmarks = await prisma.videoBookmark.findMany({
      where: { videoId, userId },
      orderBy: { timestamp: 'asc' },
    });

    return bookmarks.map(this.mapBookmarkToDto);
  }

  /**
   * Delete a video bookmark (only if owned by user)
   */
  async deleteBookmark(videoId: string, bookmarkId: string, userId: string): Promise<void> {
    await prisma.videoBookmark.deleteMany({
      where: { id: bookmarkId, videoId, userId },
    });
  }

  /**
   * Create or update video transcript
   */
  async upsertTranscript(data: CreateVideoTranscriptDto): Promise<VideoTranscriptDto> {
    const transcript = await prisma.videoTranscript.upsert({
      where: { videoId: data.videoId },
      update: {
        language: data.language,
        segments: data.segments as any,
      },
      create: {
        videoId: data.videoId,
        language: data.language,
        segments: data.segments as any,
      },
    });

    return this.mapTranscriptToDto(transcript);
  }

  /**
   * Get video transcript
   */
  async getVideoTranscript(
    videoId: string,
    language: string = 'en'
  ): Promise<VideoTranscriptDto | null> {
    const transcript = await prisma.videoTranscript.findFirst({
      where: { videoId, language },
    });

    return transcript ? this.mapTranscriptToDto(transcript) : null;
  }

  /**
   * Update video analytics
   */
  async updateAnalytics(data: UpdateVideoAnalyticsDto): Promise<VideoAnalyticsDto> {
    const analytics = await prisma.videoAnalytics.upsert({
      where: {
        videoId_userId: {
          videoId: data.videoId,
          userId: data.userId,
        },
      },
      update: {
        watchTime: data.watchTime,
        completionRate: data.completionRate,
        dropOffPoints: data.dropOffPoints as any,
        playbackSpeed: data.playbackSpeed || 1.0,
        lastWatchedAt: new Date(),
      },
      create: {
        videoId: data.videoId,
        userId: data.userId,
        watchTime: data.watchTime,
        completionRate: data.completionRate,
        dropOffPoints: data.dropOffPoints as any,
        playbackSpeed: data.playbackSpeed || 1.0,
        lastWatchedAt: new Date(),
      },
    });

    return this.mapAnalyticsToDto(analytics);
  }

  /**
   * Get video analytics for a video (aggregated)
   */
  async getVideoAnalytics(videoId: string): Promise<{
    totalViews: number;
    averageWatchTime: number;
    averageCompletionRate: number;
    dropOffPoints: { timestamp: number; count: number }[];
    playbackSpeedDistribution: { speed: number; count: number }[];
  }> {
    const allAnalytics = await prisma.videoAnalytics.findMany({
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
    const averageWatchTime =
      allAnalytics.reduce((sum, a) => sum + a.watchTime, 0) / totalViews;
    const averageCompletionRate =
      allAnalytics.reduce((sum, a) => sum + a.completionRate, 0) / totalViews;

    // Aggregate drop-off points
    const dropOffMap = new Map<number, number>();
    allAnalytics.forEach((a) => {
      if (a.dropOffPoints) {
        const points = a.dropOffPoints as number[];
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
    const speedMap = new Map<number, number>();
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
  private mapChapterToDto(chapter: any): VideoChapterDto {
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

  private mapNoteToDto(note: any): VideoNoteDto {
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

  private mapBookmarkToDto(bookmark: any): VideoBookmarkDto {
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

  private mapTranscriptToDto(transcript: any): VideoTranscriptDto {
    return {
      id: transcript.id,
      videoId: transcript.videoId,
      language: transcript.language,
      segments: transcript.segments as Array<{ start: number; end: number; text: string }>,
      createdAt: transcript.createdAt,
      updatedAt: transcript.updatedAt,
    };
  }

  private mapAnalyticsToDto(analytics: any): VideoAnalyticsDto {
    return {
      id: analytics.id,
      videoId: analytics.videoId,
      userId: analytics.userId,
      watchTime: analytics.watchTime,
      completionRate: analytics.completionRate,
      dropOffPoints: analytics.dropOffPoints
        ? (analytics.dropOffPoints as number[])
        : undefined,
      playbackSpeed: analytics.playbackSpeed,
      lastWatchedAt: analytics.lastWatchedAt,
      createdAt: analytics.createdAt,
      updatedAt: analytics.updatedAt,
    };
  }
}
