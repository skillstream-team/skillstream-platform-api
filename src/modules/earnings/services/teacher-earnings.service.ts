import { prisma } from '../../../utils/prisma';

export class TeacherEarningsService {
  private readonly DEFAULT_PLATFORM_FEE = 0.30; // 30%

  /**
   * Record premium collection sale
   */
  async recordPremiumSale(collectionId: string, paymentId: string) {
    const collection = await prisma.collection.findUnique({
      where: { id: collectionId },
      select: {
        instructorId: true,
        price: true,
      },
    });

    if (!collection) {
      throw new Error('Collection not found');
    }

    const platformFeeAmount = collection.price * this.DEFAULT_PLATFORM_FEE;
    const netAmount = collection.price - platformFeeAmount;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const earnings = await prisma.teacherEarnings.create({
      data: {
        teacherId: collection.instructorId,
        collectionId,
        periodStart,
        periodEnd,
        period,
        revenueSource: 'COLLECTION',
        sourceId: collectionId,
        sourceType: 'COLLECTION',
        amount: collection.price,
        platformFeePercent: this.DEFAULT_PLATFORM_FEE,
        platformFeeAmount,
        netAmount,
        currency: 'USD',
        status: 'AVAILABLE',
      },
    });

    return earnings;
  }

  /**
   * Record standalone lesson sale
   */
  async recordLessonSale(lessonId: string, paymentId: string) {
    const lesson = await prisma.lesson.findUnique({
      where: { id: lessonId },
      select: {
        teacherId: true,
        price: true,
      },
    });

    if (!lesson || !lesson.teacherId) {
      throw new Error('Lesson not found or has no teacher');
    }

    const platformFeeAmount = lesson.price * this.DEFAULT_PLATFORM_FEE;
    const netAmount = lesson.price - platformFeeAmount;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const earnings = await prisma.teacherEarnings.create({
      data: {
        teacherId: lesson.teacherId,
        periodStart,
        periodEnd,
        period,
        revenueSource: 'LESSON',
        sourceId: lessonId,
        sourceType: 'LESSON',
        amount: lesson.price,
        platformFeePercent: this.DEFAULT_PLATFORM_FEE,
        platformFeeAmount,
        netAmount,
        currency: 'USD',
        status: 'AVAILABLE',
      },
    });

    return earnings;
  }

  /**
   * Get teacher earnings breakdown
   */
  async getEarningsBreakdown(teacherId: string, period?: string) {
    const where: any = { teacherId };
    if (period) {
      where.period = period;
    }

    const earnings = await prisma.teacherEarnings.findMany({
      where,
      orderBy: {
        period: 'desc',
      },
    });

    const breakdown = {
      premium: 0,
      subscription: 0,
      workshops: 0,
      lessons: 0,
      total: 0,
    };

    for (const earning of earnings) {
      switch (earning.revenueSource) {
        case 'COLLECTION':
          breakdown.premium += earning.netAmount;
          break;
        case 'SUBSCRIPTION':
          breakdown.subscription += earning.netAmount;
          break;
        case 'LIVE_WORKSHOP':
          breakdown.workshops += earning.netAmount;
          break;
        case 'LESSON':
          breakdown.lessons += earning.netAmount;
          break;
      }
      breakdown.total += earning.netAmount;
    }

    return {
      breakdown,
      earnings,
      period: period || 'all',
    };
  }

  /**
   * Get upcoming payout
   */
  async getUpcomingPayout(teacherId: string) {
    const availableEarnings = await prisma.teacherEarnings.findMany({
      where: {
        teacherId,
        status: 'AVAILABLE',
      },
    });

    const totalAmount = availableEarnings.reduce((sum, e) => sum + e.netAmount, 0);

    // Calculate next payout date (typically end of month)
    const now = new Date();
    const nextPayoutDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    return {
      amount: totalAmount,
      currency: 'USD',
      estimatedPayoutDate: nextPayoutDate,
      earningsCount: availableEarnings.length,
    };
  }

  /**
   * Get earnings by source
   */
  async getEarningsBySource(teacherId: string, source: string, period?: string) {
    const where: any = {
      teacherId,
      revenueSource: source,
    };
    if (period) {
      where.period = period;
    }

    return prisma.teacherEarnings.findMany({
      where,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }

  /**
   * Get earnings history
   */
  async getEarningsHistory(teacherId: string, limit: number = 50) {
    return prisma.teacherEarnings.findMany({
      where: { teacherId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      include: {
        collection: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}
