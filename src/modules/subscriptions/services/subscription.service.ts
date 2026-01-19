import { prisma } from '../../../utils/prisma';
import { CreateSubscriptionDto, SubscriptionResponseDto, SubscriptionStatusDto, ActivateSubscriptionDto } from '../dtos/subscription.dto';
import { deleteCachePattern } from '../../../utils/cache';
import { ReferralService } from '../../courses/services/referral.service';

const SUBSCRIPTION_FEE = 6.0; // $6 subscription fee
const SUBSCRIPTION_DURATION_DAYS = 30; // 30 days subscription

export class SubscriptionService {
  /**
   * Create a new subscription payment record
   */
  async createSubscription(data: CreateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

    const subscription = await prisma.subscription.create({
      data: {
        userId: data.userId,
        amount: SUBSCRIPTION_FEE,
        currency: 'USD',
        status: 'PENDING',
        provider: data.provider,
        transactionId: data.transactionId,
        expiresAt,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return subscription as SubscriptionResponseDto;
  }

  /**
   * Activate a subscription after payment is confirmed
   */
  async activateSubscription(userId: string, data: ActivateSubscriptionDto): Promise<SubscriptionResponseDto> {
    const result = await prisma.$transaction(async (tx) => {
      // Find the subscription
      const subscription = await tx.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'COMPLETED') {
        throw new Error('Subscription is already active');
      }

      // Update subscription status
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'COMPLETED',
          transactionId: data.transactionId,
          provider: data.provider,
          startsAt: new Date(),
          expiresAt,
        },
      });

      // Update user subscription status
      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'ACTIVE',
          subscriptionExpiresAt: expiresAt,
        },
      });

      return updatedSubscription;
    });

    // Track referral activity for subscription
    try {
      const referralService = new ReferralService();
      await referralService.trackReferralActivity(userId, 'SUBSCRIPTION');
    } catch (referralError) {
      console.warn('Failed to track referral activity:', referralError);
      // Don't fail subscription activation if referral tracking fails
    }

    // Grant access to all subscription-marked content
    try {
      const { SubscriptionAccessService } = await import('./subscription-access.service');
      const accessService = new SubscriptionAccessService();

      // Get all subscription-marked collections
      const subscriptionCollections = await prisma.collection.findMany({
        where: {
          monetizationType: 'SUBSCRIPTION',
          isPublished: true,
        },
        select: { id: true },
      });

      // Get all subscription-marked lessons
      const subscriptionLessons = await prisma.lesson.findMany({
        where: {
          monetizationType: 'SUBSCRIPTION',
        },
        select: { id: true },
      });

      // Grant access to collections
      for (const collection of subscriptionCollections) {
        try {
          await accessService.grantAccess(userId, collection.id, 'COLLECTION', 'SUBSCRIPTION', result.expiresAt || undefined);
        } catch (error) {
          console.warn(`Failed to grant access to collection ${collection.id}:`, error);
        }
      }

      // Grant access to lessons
      for (const lesson of subscriptionLessons) {
        try {
          await accessService.grantAccess(userId, lesson.id, 'LESSON', 'SUBSCRIPTION', result.expiresAt || undefined);
        } catch (error) {
          console.warn(`Failed to grant access to lesson ${lesson.id}:`, error);
        }
      }
    } catch (accessError) {
      console.warn('Failed to grant subscription access to content:', accessError);
      // Don't fail subscription activation if access granting fails
    }

    // Invalidate cache
    await deleteCachePattern(`subscription:*:${userId}*`);

    return result as SubscriptionResponseDto;
  }

  /**
   * Get subscription status for a user
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusDto> {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
      },
    });

    if (!subscription || !user) {
      return {
        isActive: false,
        status: 'INACTIVE',
      };
    }

    // Check if subscription is active and not expired
    const now = new Date();
    const isActive = Boolean(
      subscription.status === 'COMPLETED' &&
      subscription.expiresAt &&
      subscription.expiresAt > now &&
      user.subscriptionStatus === 'ACTIVE'
    );

    return {
      isActive,
      status: isActive ? 'ACTIVE' : subscription.status,
      expiresAt: subscription.expiresAt || undefined,
      subscription: subscription as SubscriptionResponseDto,
    };
  }

  /**
   * Check if user has active subscription
   */
  async hasActiveSubscription(userId: string): Promise<boolean> {
    const status = await this.getSubscriptionStatus(userId);
    return status.isActive;
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(userId: string): Promise<SubscriptionResponseDto> {
    const result = await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'CANCELLED') {
        throw new Error('Subscription is already cancelled');
      }

      const updatedSubscription = await tx.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });

      // Update user subscription status
      await tx.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'CANCELLED',
        },
      });

      return updatedSubscription;
    });

    // Invalidate cache
    await deleteCachePattern(`subscription:*:${userId}*`);

    return result as SubscriptionResponseDto;
  }

  /**
   * Get subscription fee (constant)
   */
  getSubscriptionFee(): number {
    return SUBSCRIPTION_FEE;
  }

  /**
   * Check and update expired subscriptions (should be called periodically)
   */
  async checkExpiredSubscriptions(): Promise<number> {
    const now = new Date();
    
    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'COMPLETED',
        expiresAt: {
          lte: now,
        },
      },
      select: {
        userId: true,
      },
    });

    if (expiredSubscriptions.length === 0) {
      return 0;
    }

    const userIds = expiredSubscriptions.map(s => s.userId);

    await prisma.$transaction(async (tx) => {
      // Update subscriptions - Note: Prisma doesn't support EXPIRED in enum, so we'll use CANCELLED or keep COMPLETED
      // For now, we'll update user status to EXPIRED and keep subscription as COMPLETED
      // You may want to add EXPIRED to your status enum if needed
      await tx.subscription.updateMany({
        where: {
          userId: { in: userIds },
          status: 'COMPLETED',
          expiresAt: { lte: now },
        },
        data: {
          // Keep status as COMPLETED but user status will be EXPIRED
        },
      });

      // Update users
      await tx.user.updateMany({
        where: {
          id: { in: userIds },
        },
        data: {
          subscriptionStatus: 'EXPIRED',
        },
      });
    });

    return expiredSubscriptions.length;
  }
}
