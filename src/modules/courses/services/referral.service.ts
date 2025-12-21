import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateReferralDto {
  referrerId: string;
  rewardType?: 'DISCOUNT' | 'CREDIT' | 'SUBSCRIPTION';
  rewardValue?: number;
}

export interface ReferralResponseDto {
  id: string;
  referrerId: string;
  referrer: {
    id: string;
    username: string;
    email: string;
  };
  referredId: string;
  referred: {
    id: string;
    username: string;
    email: string;
  };
  code: string;
  status: string;
  rewardType?: string;
  rewardValue?: number;
  createdAt: Date;
  completedAt?: Date;
}

export class ReferralService {
  /**
   * Generate referral code for user
   */
  async generateReferralCode(userId: string): Promise<string> {
    // Check if user already has a referral code as referrer
    const existing = await prisma.referral.findFirst({
      where: {
        referrerId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      return existing.code;
    }

    // Generate unique code
    const code = this.generateCode(userId);
    
    // Note: We can't create a referral without referredId since it's required
    // The referral will be created when someone applies the code
    // For now, we just return the code - it will be created in applyReferralCode

    return code;
  }

  /**
   * Apply referral code (when new user signs up)
   */
  async applyReferralCode(code: string, newUserId: string): Promise<ReferralResponseDto> {
    const referral = await prisma.referral.findUnique({
      where: { code },
      include: {
        referrer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!referral) {
      throw new Error('Invalid referral code');
    }

    if (referral.referrerId === newUserId) {
      throw new Error('Cannot refer yourself');
    }

    if (referral.status !== 'PENDING') {
      throw new Error('Referral code already used');
    }

    // Check if user was already referred
    const existing = await prisma.referral.findUnique({
      where: { referredId: newUserId },
    });

    if (existing) {
      throw new Error('User already has a referral');
    }

    // Update referral
    const updated = await prisma.referral.update({
      where: { id: referral.id },
      data: {
        referredId: newUserId,
        status: 'ACTIVE',
      },
      include: {
        referrer: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        referred: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Create referral earning for signup
    if (referral.rewardType && referral.rewardValue) {
      await prisma.referralEarning.create({
        data: {
          referralId: updated.id,
          userId: referral.referrerId,
          amount: referral.rewardValue,
          type: 'SIGNUP',
          status: 'AVAILABLE',
        },
      });
    }

    return this.mapToDto(updated);
  }

  /**
   * Track referral activity (enrollment, subscription)
   */
  async trackReferralActivity(
    referredUserId: string,
    type: 'ENROLLMENT' | 'SUBSCRIPTION',
    amount?: number
  ): Promise<void> {
    const referral = await prisma.referral.findUnique({
      where: { referredId: referredUserId },
    });

    if (!referral || referral.status !== 'ACTIVE') {
      return; // No active referral
    }

    // Calculate reward based on activity
    let rewardAmount = 0;
    if (type === 'ENROLLMENT' && amount) {
      rewardAmount = amount * 0.1; // 10% commission
    } else if (type === 'SUBSCRIPTION') {
      rewardAmount = 1.0; // $1 per subscription
    }

    if (rewardAmount > 0) {
      await prisma.referralEarning.create({
        data: {
          referralId: referral.id,
          userId: referral.referrerId,
          amount: rewardAmount,
          type,
          status: 'AVAILABLE',
        },
      });
    }
  }

  /**
   * Get user's referral code
   */
  async getUserReferralCode(userId: string): Promise<string | null> {
    const referral = await prisma.referral.findFirst({
      where: {
        referrerId: userId,
      },
      orderBy: { createdAt: 'desc' },
    });

    return referral?.code || null;
  }

  /**
   * Get user's referral statistics
   */
  async getReferralStats(userId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    availableEarnings: number;
    paidEarnings: number;
  }> {
    const [referrals, earnings] = await Promise.all([
      prisma.referral.findMany({
        where: { referrerId: userId },
        select: {
          status: true,
        },
      }),
      prisma.referralEarning.findMany({
        where: { userId },
        select: {
          amount: true,
          status: true,
        },
      }),
    ]);

    const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0);
    const availableEarnings = earnings
      .filter((e) => e.status === 'AVAILABLE')
      .reduce((sum, e) => sum + e.amount, 0);
    const paidEarnings = earnings
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      totalReferrals: referrals.length,
      activeReferrals: referrals.filter((r) => r.status === 'ACTIVE').length,
      totalEarnings: Math.round(totalEarnings * 100) / 100,
      availableEarnings: Math.round(availableEarnings * 100) / 100,
      paidEarnings: Math.round(paidEarnings * 100) / 100,
    };
  }

  private generateCode(userId: string): string {
    // Generate code: REF-{first 6 chars of userId}-{random 4 digits}
    const prefix = userId.substring(0, 6).toUpperCase();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `REF-${prefix}-${random}`;
  }

  private mapToDto(referral: any): ReferralResponseDto {
    return {
      id: referral.id,
      referrerId: referral.referrerId,
      referrer: {
        id: referral.referrer.id,
        username: referral.referrer.username,
        email: referral.referrer.email,
      },
      referredId: referral.referredId,
      referred: {
        id: referral.referred.id,
        username: referral.referred.username,
        email: referral.referred.email,
      },
      code: referral.code,
      status: referral.status,
      rewardType: referral.rewardType || undefined,
      rewardValue: referral.rewardValue || undefined,
      createdAt: referral.createdAt,
      completedAt: referral.completedAt || undefined,
    };
  }
}
