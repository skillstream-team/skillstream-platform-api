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

    // Update or create engagement record
    const engagement = await prisma.studentEngagement.upsert({
      where: {
        studentId_collectionId_lessonId_period: {
          studentId,
          collectionId: contentType === 'COLLECTION' ? contentId : null,
          lessonId: contentType === 'LESSON' ? contentId : null,
          period,
        },
      },
      update: {
        watchTimeMinutes: {
          increment: minutes,
        },
        lastWatchedAt: now,
      },
      create: engagementData,
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

    const engagement = await prisma.studentEngagement.upsert({
      where: {
        studentId_collectionId_lessonId_period: {
          studentId,
          collectionId: contentType === 'COLLECTION' ? contentId : null,
          lessonId: contentType === 'LESSON' ? contentId : null,
          period,
        },
      },
      update: {
        isCompleted: true,
        completionPercent: 100,
        completedAt: now,
      },
      create: engagementData,
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

    const engagement = await prisma.studentEngagement.upsert({
      where: {
        studentId_collectionId_lessonId_period: {
          studentId,
          collectionId: contentType === 'COLLECTION' ? contentId : null,
          lessonId: contentType === 'LESSON' ? contentId : null,
          period,
        },
      },
      update: {
        completionPercent: Math.min(100, Math.max(0, percent)),
        isCompleted: percent >= 100,
        ...(percent >= 100 && { completedAt: now }),
      },
      create: engagementData,
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
        collection: {
          select: {
            instructorId: true,
          },
        },
        lesson: {
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
        collection: {
          select: {
            id: true,
            title: true,
            thumbnailUrl: true,
          },
        },
        lesson: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}
