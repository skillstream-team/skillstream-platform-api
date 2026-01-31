import { prisma } from '../../../utils/prisma';
import { deleteCache, cacheKeys } from '../../../utils/cache';

export class SubscriptionAccessService {
  /**
   * Grant subscription access to content
   */
  async grantAccess(
    userId: string,
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE',
    accessType: 'SUBSCRIPTION' | 'TRIAL' | 'PROMOTIONAL' = 'SUBSCRIPTION',
    expiresAt?: Date
  ) {
    // Check if user has active subscription
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'COMPLETED') {
      throw new Error('User does not have an active subscription');
    }

    // Use subscription expiry if not provided
    const accessExpiresAt = expiresAt || subscription.expiresAt;

    // Create or update access record
    const accessData: any = {
      userId,
      grantedAt: new Date(),
      expiresAt: accessExpiresAt,
      accessType,
    };

    if (contentType === 'PROGRAM') {
      accessData.programId = contentId;
    } else {
      accessData.moduleId = contentId;
    }

    // Use findFirst and create/update since unique constraint might not work with nulls
    const existing = await prisma.subscriptionAccess.findFirst({
      where: {
        userId,
        ...(contentType === 'PROGRAM' 
          ? { programId: contentId, moduleId: null }
          : { moduleId: contentId, programId: null }
        ),
      },
    });

    const access = existing
      ? await prisma.subscriptionAccess.update({
          where: { id: existing.id },
          data: {
            expiresAt: accessExpiresAt,
            accessType,
          },
        })
      : await prisma.subscriptionAccess.create({
          data: accessData,
        });

    // Invalidate cache
    await deleteCache(cacheKeys.user(userId));

    return access;
  }

  /**
   * Check if user has access to content
   */
  async hasAccess(
    userId: string,
    contentId: string,
    contentType: 'PROGRAM' | 'MODULE'
  ): Promise<boolean> {
    // Check if content is FREE (always accessible)
    if (contentType === 'PROGRAM') {
      const program = await prisma.program.findUnique({
        where: { id: contentId },
        select: { monetizationType: true },
      });

      if (program?.monetizationType === 'FREE') {
        return true;
      }
    } else {
      const module = await prisma.module.findUnique({
        where: { id: contentId },
        select: { monetizationType: true },
      });

      if (module?.monetizationType === 'FREE') {
        return true;
      }
    }

    // Check subscription status
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.status !== 'COMPLETED') {
      return false;
    }

    // Check if subscription is expired
    if (subscription.expiresAt && subscription.expiresAt < new Date()) {
      return false;
    }

    // Check SubscriptionAccess record
    const access = await prisma.subscriptionAccess.findFirst({
      where: {
        userId,
        ...(contentType === 'PROGRAM' 
          ? { programId: contentId, moduleId: null }
          : { moduleId: contentId, programId: null }
        ),
      },
    });

    if (!access) {
      return false;
    }

    // Check if access is expired
    if (access.expiresAt && access.expiresAt < new Date()) {
      return false;
    }

    return true;
  }

  /**
   * Revoke access when subscription expires
   */
  async revokeExpiredAccess() {
    const now = new Date();

    // Find expired subscriptions
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

    const userIds = expiredSubscriptions.map((s) => s.userId);

    // Delete expired access records
    const result = await prisma.subscriptionAccess.deleteMany({
      where: {
        userId: { in: userIds },
        OR: [
          { expiresAt: { lte: now } },
          { expiresAt: null }, // Also revoke if subscription expired
        ],
      },
    });

    return result.count;
  }

  /**
   * Get all accessible content for a user
   */
  async getAccessibleContent(userId: string) {
    const accesses = await prisma.subscriptionAccess.findMany({
      where: {
        userId,
        OR: [
          { expiresAt: { gte: new Date() } },
          { expiresAt: null },
        ],
      },
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

    return {
      collections: accesses
        .filter((a) => a.programId)
        .map((a) => a.program),
      lessons: accesses.filter((a) => a.moduleId).map((a) => a.module),
    };
  }
}
