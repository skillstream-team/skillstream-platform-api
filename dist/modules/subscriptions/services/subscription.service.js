"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubscriptionService = void 0;
const prisma_1 = require("../../../utils/prisma");
const cache_1 = require("../../../utils/cache");
const referral_service_1 = require("../../courses/services/referral.service");
const SUBSCRIPTION_FEE = 6.0; // $6 subscription fee
const SUBSCRIPTION_DURATION_DAYS = 30; // 30 days subscription
class SubscriptionService {
    /**
     * Create a new subscription payment record
     */
    async createSubscription(data) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + SUBSCRIPTION_DURATION_DAYS);
        const subscription = await prisma_1.prisma.subscription.create({
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
        return subscription;
    }
    /**
     * Activate a subscription after payment is confirmed
     */
    async activateSubscription(userId, data) {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
            const referralService = new referral_service_1.ReferralService();
            await referralService.trackReferralActivity(userId, 'SUBSCRIPTION');
        }
        catch (referralError) {
            console.warn('Failed to track referral activity:', referralError);
            // Don't fail subscription activation if referral tracking fails
        }
        // Invalidate cache
        await (0, cache_1.deleteCachePattern)(`subscription:*:${userId}*`);
        return result;
    }
    /**
     * Get subscription status for a user
     */
    async getSubscriptionStatus(userId) {
        const subscription = await prisma_1.prisma.subscription.findUnique({
            where: { userId },
        });
        const user = await prisma_1.prisma.user.findUnique({
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
        const isActive = Boolean(subscription.status === 'COMPLETED' &&
            subscription.expiresAt &&
            subscription.expiresAt > now &&
            user.subscriptionStatus === 'ACTIVE');
        return {
            isActive,
            status: isActive ? 'ACTIVE' : subscription.status,
            expiresAt: subscription.expiresAt || undefined,
            subscription: subscription,
        };
    }
    /**
     * Check if user has active subscription
     */
    async hasActiveSubscription(userId) {
        const status = await this.getSubscriptionStatus(userId);
        return status.isActive;
    }
    /**
     * Cancel a subscription
     */
    async cancelSubscription(userId) {
        const result = await prisma_1.prisma.$transaction(async (tx) => {
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
        await (0, cache_1.deleteCachePattern)(`subscription:*:${userId}*`);
        return result;
    }
    /**
     * Get subscription fee (constant)
     */
    getSubscriptionFee() {
        return SUBSCRIPTION_FEE;
    }
    /**
     * Check and update expired subscriptions (should be called periodically)
     */
    async checkExpiredSubscriptions() {
        const now = new Date();
        const expiredSubscriptions = await prisma_1.prisma.subscription.findMany({
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
        await prisma_1.prisma.$transaction(async (tx) => {
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
exports.SubscriptionService = SubscriptionService;
