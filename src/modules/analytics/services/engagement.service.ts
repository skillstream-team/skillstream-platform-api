import { prisma } from '../../../utils/prisma';

export class EngagementService {
  /**
   * Track lesson watch time
   */
  async trackWatchTime(
    studentId: string,
    contentId: string,
    contentType: 'COLLECTION' | 'LESSON',
    minutes: number
  ) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const engagementData: any = {
      studentId,
      watchTimeMinutes: minutes,
      lastWatchedAt: now,
      period,
    };

    if (contentType === 'COLLECTION') {
      engagementData.collectionId = contentId;
    } else {
      engagementData.lessonId = contentId;
    }

    // Find existing engagement record
    const existing = await prisma.studentEngagement.findFirst({
      where: {
        studentId,
        period,
        ...(contentType === 'COLLECTION' 
          ? { collectionId: contentId, lessonId: null }
          : { lessonId: contentId, collectionId: null }
        ),
      },
    });

    // Update or create engagement record
    const engagement = existing
      ? await prisma.studentEngagement.update({
          where: { id: existing.id },
          data: {
            watchTimeMinutes: {
              increment: minutes,
            },
            lastWatchedAt: now,
          },
        })
      : await prisma.studentEngagement.create({
          data: engagementData,
        });

    return engagement;
  }

  /**
   * Mark content as completed
   */
  async markCompleted(
    studentId: string,
    contentId: string,
    contentType: 'COLLECTION' | 'LESSON'
  ) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const engagementData: any = {
      studentId,
      isCompleted: true,
      completionPercent: 100,
      completedAt: now,
      period,
    };

    if (contentType === 'COLLECTION') {
      engagementData.collectionId = contentId;
    } else {
      engagementData.lessonId = contentId;
    }

    // Find existing engagement record
    const existing = await prisma.studentEngagement.findFirst({
      where: {
        studentId,
        period,
        ...(contentType === 'COLLECTION' 
          ? { collectionId: contentId, lessonId: null }
          : { lessonId: contentId, collectionId: null }
        ),
      },
    });

    const engagement = existing
      ? await prisma.studentEngagement.update({
          where: { id: existing.id },
          data: {
            isCompleted: true,
            completionPercent: 100,
            completedAt: now,
          },
        })
      : await prisma.studentEngagement.create({
          data: engagementData,
        });

    return engagement;
  }

  /**
   * Update completion percentage
   */
  async updateCompletionPercent(
    studentId: string,
    contentId: string,
    contentType: 'COLLECTION' | 'LESSON',
    percent: number
  ) {
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const engagementData: any = {
      studentId,
      completionPercent: Math.min(100, Math.max(0, percent)),
      isCompleted: percent >= 100,
      period,
      ...(percent >= 100 && { completedAt: now }),
    };

    if (contentType === 'COLLECTION') {
      engagementData.collectionId = contentId;
    } else {
      engagementData.lessonId = contentId;
    }

    // Find existing engagement record
    const existing = await prisma.studentEngagement.findFirst({
      where: {
        studentId,
        period,
        ...(contentType === 'COLLECTION' 
          ? { collectionId: contentId, lessonId: null }
          : { lessonId: contentId, collectionId: null }
        ),
      },
    });

    const engagement = existing
      ? await prisma.studentEngagement.update({
          where: { id: existing.id },
          data: {
            completionPercent: Math.min(100, Math.max(0, percent)),
            isCompleted: percent >= 100,
            ...(percent >= 100 && { completedAt: now }),
          },
        })
      : await prisma.studentEngagement.create({
          data: engagementData,
        });

    return engagement;
  }

  /**
   * Get engagement for revenue calculation
   */
  async getEngagementForPeriod(period: string) {
    return prisma.studentEngagement.findMany({
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
  async getStudentEngagement(studentId: string, period?: string) {
    const where: any = { studentId };
    if (period) {
      where.period = period;
    }

    return prisma.studentEngagement.findMany({
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
