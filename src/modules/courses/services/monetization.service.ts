import { prisma } from '../../../utils/prisma';

export interface AccessRequirements {
  type: 'FREE' | 'SUBSCRIPTION' | 'PREMIUM';
  price?: number;
}

export class MonetizationService {
  /**
   * Get content access requirements
   */
  async getAccessRequirements(
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE' | 'COLLECTION' | 'LESSON'
  ): Promise<AccessRequirements> {
    // Support both new and old content types for backward compatibility
    const isProgram = contentType === 'PROGRAM' || contentType === 'COLLECTION';
    const isModule = contentType === 'MODULE' || contentType === 'LESSON';

    if (isProgram) {
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
      };
    } else if (isModule) {
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
      };
    }

    throw new Error('Invalid content type');
  }

  /**
   * Check if student can access content
   */
  async canAccess(
    studentId: string,
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE' | 'COLLECTION' | 'LESSON'
  ): Promise<boolean> {
    // Get access requirements
    const requirements = await this.getAccessRequirements(contentId, contentType);

    // FREE content is always accessible
    if (requirements.type === 'FREE') {
      return true;
    }

    // SUBSCRIPTION content - check subscription access
    if (requirements.type === 'SUBSCRIPTION') {
      const { SubscriptionAccessService } = await import(
        '../../subscriptions/services/subscription-access.service'
      );
      const accessService = new SubscriptionAccessService();
      return accessService.hasAccess(studentId, contentId, contentType);
    }

    // PREMIUM content - check enrollment or payment
    if (requirements.type === 'PREMIUM') {
      const isProgram = contentType === 'PROGRAM' || contentType === 'COLLECTION';
      const isModule = contentType === 'MODULE' || contentType === 'LESSON';

      if (isProgram) {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            programId_studentId: {
              programId: contentId,
              studentId,
            },
          },
        });
        return !!enrollment;
      } else if (isModule) {
        // For standalone modules, check if there's a payment
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
