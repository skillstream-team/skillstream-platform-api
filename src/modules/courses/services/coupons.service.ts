import { prisma } from '../../../utils/prisma';
import { deleteCache } from '../../../utils/cache';

export interface CreateCouponDto {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  expiresAt?: Date;
  applicableTo: 'ALL' | 'COURSE' | 'BUNDLE' | 'SUBSCRIPTION';
  collectionId?: string;
  bundleId?: string;
}

export interface CouponResponseDto {
  id: string;
  code: string;
  type: string;
  value: number;
  minPurchase?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  expiresAt?: Date;
  isActive: boolean;
  applicableTo: string;
  collectionId?: string;
  bundleId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApplyCouponResult {
  valid: boolean;
  discountAmount: number;
  finalAmount: number;
  coupon?: CouponResponseDto;
  error?: string;
}

export class CouponsService {
  /**
   * Create a coupon
   */
  async createCoupon(data: CreateCouponDto): Promise<CouponResponseDto> {
    // Validate code uniqueness
    const existing = await prisma.coupon.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new Error('Coupon code already exists');
    }

    // Validate value
    if (data.type === 'PERCENTAGE' && (data.value < 0 || data.value > 100)) {
      throw new Error('Percentage value must be between 0 and 100');
    }

    if (data.type === 'FIXED' && data.value < 0) {
      throw new Error('Fixed value must be positive');
    }

    // Validate applicable target
    if (data.applicableTo === 'COURSE' && !data.collectionId) {
      throw new Error('Collection ID required for collection-specific coupon');
    }

    if (data.applicableTo === 'BUNDLE' && !data.bundleId) {
      throw new Error('Bundle ID required for bundle-specific coupon');
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: data.value,
        minPurchase: data.minPurchase,
        maxDiscount: data.maxDiscount,
        usageLimit: data.usageLimit,
        expiresAt: data.expiresAt,
        applicableTo: data.applicableTo,
        collectionId: data.collectionId,
        bundleId: data.bundleId,
      },
    });

    return this.mapToDto(coupon);
  }

  /**
   * Apply coupon to a purchase
   */
  async applyCoupon(
    code: string,
    userId: string,
    amount: number,
    applicableTo: 'COURSE' | 'BUNDLE' | 'SUBSCRIPTION',
    courseId?: string,
    bundleId?: string
  ): Promise<ApplyCouponResult> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Invalid coupon code',
      };
    }

    if (!coupon.isActive) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon is not active',
      };
    }

    // Check expiration
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon has expired',
      };
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon usage limit reached',
      };
    }

    // Check if user already used this coupon
    const existingRedemption = await prisma.couponRedemption.findFirst({
      where: {
        couponId: coupon.id,
        userId,
      },
    });

    if (existingRedemption) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'You have already used this coupon',
      };
    }

    // Check applicable to
    if (coupon.applicableTo !== 'ALL' && coupon.applicableTo !== applicableTo) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon is not applicable to this purchase type',
      };
    }

    // Check specific collection/bundle match
    if (coupon.applicableTo === 'COURSE' && coupon.collectionId !== courseId) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon is not valid for this collection',
      };
    }

    if (coupon.applicableTo === 'BUNDLE' && coupon.bundleId !== bundleId) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: 'Coupon is not valid for this bundle',
      };
    }

    // Check minimum purchase
    if (coupon.minPurchase && amount < coupon.minPurchase) {
      return {
        valid: false,
        discountAmount: 0,
        finalAmount: amount,
        error: `Minimum purchase of $${coupon.minPurchase} required`,
      };
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (amount * coupon.value) / 100;
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscount);
      }
    } else {
      discountAmount = coupon.value;
    }

    // Ensure discount doesn't exceed amount
    discountAmount = Math.min(discountAmount, amount);
    const finalAmount = amount - discountAmount;

    return {
      valid: true,
      discountAmount: Math.round(discountAmount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
      coupon: this.mapToDto(coupon),
    };
  }

  /**
   * Redeem coupon (mark as used)
   */
  async redeemCoupon(
    couponId: string,
    userId: string,
    orderId: string,
    discountAmount: number
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      // Create redemption record
      await tx.couponRedemption.create({
        data: {
          couponId,
          userId,
          orderId,
          discountAmount,
        },
      });

      // Increment used count
      await tx.coupon.update({
        where: { id: couponId },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    });
  }

  /**
   * Get all coupons
   */
  async getAllCoupons(includeInactive: boolean = false): Promise<CouponResponseDto[]> {
    const coupons = await prisma.coupon.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return coupons.map(this.mapToDto);
  }

  /**
   * Get coupon by code
   */
  async getCouponByCode(code: string): Promise<CouponResponseDto | null> {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    return coupon ? this.mapToDto(coupon) : null;
  }

  private mapToDto(coupon: any): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      minPurchase: coupon.minPurchase || undefined,
      maxDiscount: coupon.maxDiscount || undefined,
      usageLimit: coupon.usageLimit || undefined,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt || undefined,
      isActive: coupon.isActive,
      applicableTo: coupon.applicableTo,
      collectionId: coupon.collectionId || undefined,
      bundleId: coupon.bundleId || undefined,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }
}
