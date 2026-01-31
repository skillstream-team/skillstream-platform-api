import { prisma } from '../../../utils/prisma';

export interface ShareCourseDto {
  courseId: string;
  userId: string;
  platform: string;
}

export class ShareService {
  /**
   * Track course share
   */
  async shareCourse(data: ShareCourseDto): Promise<void> {
    await prisma.programShare.create({
      data: {
        programId: data.courseId,
        userId: data.userId,
        platform: data.platform.toLowerCase(),
      },
    });
  }

  /**
   * Get share statistics for a course
   */
  async getCourseShareStats(courseId: string): Promise<{
    totalShares: number;
    byPlatform: Record<string, number>;
  }> {
    const shares = await prisma.programShare.findMany({
      where: { programId: courseId },
      select: {
        platform: true,
      },
    });

    const byPlatform: Record<string, number> = {};
    for (const share of shares) {
      byPlatform[share.platform] = (byPlatform[share.platform] || 0) + 1;
    }

    return {
      totalShares: shares.length,
      byPlatform,
    };
  }

  /**
   * Get shareable link for course
   */
  getShareableLink(courseId: string, platform: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const courseUrl = `${baseUrl}/courses/${courseId}`;

    const platforms: Record<string, (url: string, title: string) => string> = {
      facebook: (url, title) =>
        `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: (url, title) =>
        `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: (url, title) =>
        `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      whatsapp: (url, title) =>
        `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`,
    };

    return platforms[platform.toLowerCase()]?.(courseUrl, 'Check out this course!') || courseUrl;
  }
}
