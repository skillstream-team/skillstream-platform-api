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
    contentType: 'COLLECTION' | 'LESSON'
  ): Promise<AccessRequirements> {
    if (contentType === 'COLLECTION') {
      const collection = await prisma.collection.findUnique({
        where: { id: contentId },
        select: {
          monetizationType: true,
          price: true,
        },
      });

      if (!collection) {
        throw new Error('Collection not found');
      }

      return {
        type: collection.monetizationType as 'FREE' | 'SUBSCRIPTION' | 'PREMIUM',
        price: collection.monetizationType === 'PREMIUM' ? collection.price : undefined,
      };
    } else {
      const lesson = await prisma.lesson.findUnique({
        where: { id: contentId },
        select: {
          monetizationType: true,
          price: true,
        },
      });

      if (!lesson) {
        throw new Error('Lesson not found');
      }

      return {
        type: lesson.monetizationType as 'FREE' | 'SUBSCRIPTION' | 'PREMIUM',
        price: lesson.monetizationType === 'PREMIUM' ? lesson.price : undefined,
      };
    }
  }

  /**
   * Check if student can access content
   */
  async canAccess(
    studentId: string,
    contentId: string,
    contentType: 'COLLECTION' | 'LESSON'
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
      if (contentType === 'COLLECTION') {
        const enrollment = await prisma.enrollment.findUnique({
          where: {
            collectionId_studentId: {
              collectionId: contentId,
              studentId,
            },
          },
        });
        return !!enrollment;
      } else {
        // For standalone lessons, check if there's a payment
        const payment = await prisma.payment.findFirst({
          where: {
            studentId,
            lessonId: contentId,
            status: 'COMPLETED',
          },
        });
        return !!payment;
      }
    }

    return false;
  }
}
