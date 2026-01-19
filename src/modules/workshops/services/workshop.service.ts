import { prisma } from '../../../utils/prisma';

export interface CreateWorkshopDto {
  title: string;
  description?: string;
  scheduledAt: Date;
  duration: number;
  maxSeats: number;
  pricePerSeat: number;
  platformFeePercent?: number;
}

export class WorkshopService {
  private readonly DEFAULT_PLATFORM_FEE = 0.30; // 30%

  /**
   * Create a live workshop
   */
  async createWorkshop(teacherId: string, data: CreateWorkshopDto) {
    const platformFeePercent = data.platformFeePercent || this.DEFAULT_PLATFORM_FEE;
    const platformFeeAmount = data.pricePerSeat * platformFeePercent;
    const teacherEarnings = data.pricePerSeat - platformFeeAmount;

    const workshop = await prisma.liveWorkshop.create({
      data: {
        teacherId,
        title: data.title,
        description: data.description,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        maxSeats: data.maxSeats,
        pricePerSeat: data.pricePerSeat,
        platformFeePercent,
        platformFeeAmount,
        teacherEarnings,
        status: 'SCHEDULED',
      },
    });

    return workshop;
  }

  /**
   * Enroll student in workshop
   */
  async enrollStudent(workshopId: string, studentId: string, paymentId?: string) {
    // Check seat availability
    const workshop = await prisma.liveWorkshop.findUnique({
      where: { id: workshopId },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    if (workshop.currentSeats >= workshop.maxSeats) {
      throw new Error('Workshop is full');
    }

    if (workshop.status !== 'SCHEDULED') {
      throw new Error('Workshop is not available for enrollment');
    }

    // Create enrollment
    const enrollment = await prisma.liveWorkshopEnrollment.create({
      data: {
        workshopId,
        studentId,
        paymentId,
      },
    });

    // Update seat count
    await prisma.liveWorkshop.update({
      where: { id: workshopId },
      data: {
        currentSeats: {
          increment: 1,
        },
      },
    });

    return enrollment;
  }

  /**
   * Process workshop completion
   */
  async completeWorkshop(workshopId: string) {
    const workshop = await prisma.liveWorkshop.findUnique({
      where: { id: workshopId },
      include: {
        enrollments: {
          where: {
            attended: true,
          },
        },
      },
    });

    if (!workshop) {
      throw new Error('Workshop not found');
    }

    // Calculate total earnings
    const totalEarnings = workshop.enrollments.length * workshop.teacherEarnings;

    // Create teacher earnings record
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    await prisma.teacherEarnings.create({
      data: {
        teacherId: workshop.teacherId,
        periodStart,
        periodEnd,
        period,
        revenueSource: 'LIVE_WORKSHOP',
        sourceId: workshop.id,
        sourceType: 'WORKSHOP',
        amount: totalEarnings,
        platformFeePercent: workshop.platformFeePercent,
        platformFeeAmount: workshop.enrollments.length * workshop.platformFeeAmount,
        netAmount: totalEarnings,
        currency: 'USD',
        status: 'AVAILABLE',
      },
    });

    // Update workshop status
    await prisma.liveWorkshop.update({
      where: { id: workshopId },
      data: {
        status: 'COMPLETED',
      },
    });

    return { earnings: totalEarnings };
  }

  /**
   * Get workshops for teacher
   */
  async getTeacherWorkshops(teacherId: string, status?: string) {
    return prisma.liveWorkshop.findMany({
      where: {
        teacherId,
        ...(status && { status }),
      },
      orderBy: {
        scheduledAt: 'asc',
      },
      include: {
        enrollments: {
          include: {
            student: {
              select: {
                id: true,
                username: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get available workshops for students
   */
  async getAvailableWorkshops() {
    return prisma.liveWorkshop.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(),
        },
        currentSeats: {
          lt: prisma.liveWorkshop.fields.maxSeats,
        },
      },
      include: {
        teacher: {
          select: {
            id: true,
            username: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'asc',
      },
    });
  }
}
