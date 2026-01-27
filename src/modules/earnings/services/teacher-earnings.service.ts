import { prisma } from '../../../utils/prisma';

export class TeacherEarningsService {
  private readonly DEFAULT_PLATFORM_FEE = 0.30; // 30%

  /**
   * Record premium program sale
   */
  async recordPremiumSale(programId: string, paymentId: string) {
    const program = await prisma.program.findUnique({
      where: { id: programId },
      select: {
        instructorId: true,
        price: true,
      },
    });

    if (!program) {
      throw new Error('Program not found');
    }

    const platformFeeAmount = program.price * this.DEFAULT_PLATFORM_FEE;
    const netAmount = program.price - platformFeeAmount;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const earnings = await prisma.teacherEarnings.create({
      data: {
        teacherId: program.instructorId,
        programId,
        periodStart,
        periodEnd,
        period,
        revenueSource: 'PROGRAM',
        sourceId: programId,
        sourceType: 'PROGRAM',
        amount: program.price,
        platformFeePercent: this.DEFAULT_PLATFORM_FEE,
        platformFeeAmount,
        netAmount,
        currency: 'USD',
        status: 'AVAILABLE',
      },
    });

    return earnings;
  }

  // Backward compatibility alias
  async recordCollectionSale(collectionId: string, paymentId: string) {
    return this.recordPremiumSale(collectionId, paymentId);
  }

  /**
   * Record standalone module sale
   */
  async recordModuleSale(moduleId: string, paymentId: string) {
    const module = await prisma.module.findUnique({
      where: { id: moduleId },
      select: {
        teacherId: true,
        price: true,
      },
    });

    if (!module || !module.teacherId) {
      throw new Error('Module not found or has no teacher');
    }

    const platformFeeAmount = module.price * this.DEFAULT_PLATFORM_FEE;
    const netAmount = module.price - platformFeeAmount;

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const earnings = await prisma.teacherEarnings.create({
      data: {
        teacherId: module.teacherId,
        periodStart,
        periodEnd,
        period,
        revenueSource: 'MODULE',
        sourceId: moduleId,
        sourceType: 'MODULE',
        amount: module.price,
        platformFeePercent: this.DEFAULT_PLATFORM_FEE,
        platformFeeAmount,
        netAmount,
        currency: 'USD',
        status: 'AVAILABLE',
      },
    });

    return earnings;
  }

  // Backward compatibility alias
  async recordLessonSale(lessonId: string, paymentId: string) {
    return this.recordModuleSale(lessonId, paymentId);
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
      modules: 0,
      total: 0,
    };

    for (const earning of earnings) {
      switch (earning.revenueSource) {
        case 'PROGRAM':
        case 'COLLECTION': // Backward compatibility
          breakdown.premium += earning.netAmount;
          break;
        case 'SUBSCRIPTION':
          breakdown.subscription += earning.netAmount;
          break;
        case 'LIVE_WORKSHOP':
          breakdown.workshops += earning.netAmount;
          break;
        case 'MODULE':
        case 'LESSON': // Backward compatibility
          breakdown.modules += earning.netAmount;
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
        program: {
          select: {
            id: true,
            title: true,
          },
        },
        collection: { // Backward compatibility
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
        program: {
          select: {
            id: true,
            title: true,
          },
        },
        collection: { // Backward compatibility
          select: {
            id: true,
            title: true,
          },
        },
      },
    });
  }
}
