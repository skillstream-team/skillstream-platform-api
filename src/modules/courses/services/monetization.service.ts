import { prisma } from '../../../utils/prisma';

/** Platform markup: students see teacher price + 10% */
export const PLATFORM_PRICE_MARKUP = 0.10;

export function getStudentPrice(teacherPrice: number): number {
  return Math.round((teacherPrice * (1 + PLATFORM_PRICE_MARKUP)) * 100) / 100;
}

export interface AccessRequirements {
  type: 'FREE' | 'SUBSCRIPTION' | 'PREMIUM';
  price?: number;
  /** Price shown to students (teacher price + platform markup) */
  studentPrice?: number;
}

export class MonetizationService {
  /**
   * Get content access requirements (studentPrice = teacher price + 10% for students)
   */
  async getAccessRequirements(
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE'
  ): Promise<AccessRequirements> {
    // Support both new and old content types for backward compatibility
    if (contentType === 'PROGRAM') {
      const program = await prisma.program.findUnique({
        where: { id: contentId },
        select: {
          monetizationType: true,
          price: true,
        },
      });

      if (!program) {
        throw new Error('Program not found');
      }

      return {
        type: program.monetizationType as 'FREE' | 'SUBSCRIPTION' | 'PREMIUM',
        price: program.monetizationType === 'PREMIUM' ? program.price : undefined,
        studentPrice: program.monetizationType === 'PREMIUM' ? getStudentPrice(program.price) : undefined,
      };
    } else if (contentType === 'MODULE') {
      const module = await prisma.module.findUnique({
        where: { id: contentId },
        select: {
          monetizationType: true,
          price: true,
        },
      });

      if (!module) {
        throw new Error('Module not found');
      }

      return {
        type: module.monetizationType as 'FREE' | 'SUBSCRIPTION' | 'PREMIUM',
        price: module.monetizationType === 'PREMIUM' ? module.price : undefined,
        studentPrice: module.monetizationType === 'PREMIUM' ? getStudentPrice(module.price) : undefined,
      };
    }

    throw new Error('Invalid content type');
  }

  /**
   * Check if student can access content.
   * Access is granted if:
   * 1. User has an active subscription (access to everything), or
   * 2. For programs: user is enrolled (bought the program), or
   * 3. For modules: user is enrolled in a program that contains this module, or bought the module directly
   */
  async canAccess(
    studentId: string,
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE'
  ): Promise<boolean> {
    // 1. Active subscription = access to everything on the platform
    const subscription = await prisma.subscription.findUnique({
      where: { userId: studentId },
    });
    if (subscription?.status === 'COMPLETED' && (!subscription.expiresAt || subscription.expiresAt > new Date())) {
      return true;
    }

    // Get access requirements
    const requirements = await this.getAccessRequirements(contentId, contentType);

    // FREE content is always accessible
    if (requirements.type === 'FREE') {
      return true;
    }

    // SUBSCRIPTION content - check subscription access (already checked above for "all access")
    if (requirements.type === 'SUBSCRIPTION') {
      const { SubscriptionAccessService } = await import(
        '../../subscriptions/services/subscription-access.service'
      );
      const accessService = new SubscriptionAccessService();
      return accessService.hasAccess(studentId, contentId, contentType);
    }

    // PREMIUM content
    if (requirements.type === 'PREMIUM') {
      if (contentType === 'PROGRAM') {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            programId_studentId: {
              programId: contentId,
              studentId,
            },
          },
        });
        return !!enrollment;
      }
      if (contentType === 'MODULE') {
        // Module: access if (a) enrolled in a program that contains this module, or (b) direct module payment
        const programLinks = await prisma.programModule.findMany({
          where: { moduleId: contentId },
          select: { programId: true },
        });
        for (const { programId } of programLinks) {
          const enrollment = await prisma.enrollment.findUnique({
            where: {
              programId_studentId: { programId, studentId },
            },
          });
          if (enrollment) return true;
        }
        const payment = await prisma.payment.findFirst({
          where: {
            studentId,
            moduleId: contentId,
            status: 'COMPLETED',
          },
        });
        return !!payment;
      }
    }

    return false;
  }
}
