import { prisma } from '../../../utils/prisma';

export interface ShareProgramDto {
  programId: string;
  userId: string;
  platform: string;
}

export class ShareService {
  /**
   * Track program share
   */
  async shareProgram(data: ShareProgramDto): Promise<void> {
    await prisma.programShare.create({
      data: {
        programId: data.programId,
        userId: data.userId,
        platform: data.platform.toLowerCase(),
      },
    });
  }

  /**
   * Get share statistics for a program
   */
  async getProgramShareStats(programId: string): Promise<{
    totalShares: number;
    byPlatform: Record<string, number>;
  }> {
    const shares = await prisma.programShare.findMany({
      where: { programId },
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
   * Get shareable link for program
   */
  getShareableLink(programId: string, platform: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const programUrl = `${baseUrl}/programs/${programId}`;

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

    return platforms[platform.toLowerCase()]?.(programUrl, 'Check out this program!') || programUrl;
  }
}
