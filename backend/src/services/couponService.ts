import { PrismaClient } from '@prisma/client';
import redis from '../lib/redis';

const prisma = new PrismaClient();

export interface CouponValidationResult {
  isValid: boolean;
  discountAmount?: number;
  error?: string;
}

export interface AvailableCoupon {
  id: string;
  code: string;
  discountAmount: number | null;
  expiration: Date | null;
  storeId: string;
}

/**
 * Get available coupons for a store
 * Uses Redis cache for performance
 */
export async function getAvailableCoupons(
  storeId: string
): Promise<AvailableCoupon[]> {
  const cacheKey = `coupons:store:${storeId}`;

  // Try to get from cache first
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get from database
  const coupons = await prisma.coupon.findMany({
    where: {
      storeId,
      OR: [
        { expiration: null },
        { expiration: { gt: new Date() } },
      ],
      validationStatus: {
        not: 'invalid',
      },
    },
    select: {
      id: true,
      code: true,
      discountAmount: true,
      expiration: true,
      storeId: true,
    },
    orderBy: {
      discountAmount: 'desc',
    },
  });

  // Cache for 5 minutes
  await redis.set(cacheKey, JSON.stringify(coupons), 300);

  return coupons;
}

/**
 * Validate a coupon code
 * Checks if coupon exists and is valid
 */
export async function validateCoupon(
  code: string,
  storeId: string
): Promise<CouponValidationResult> {
  const coupon = await prisma.coupon.findFirst({
    where: {
      code: code.toUpperCase().trim(),
      storeId,
    },
  });

  if (!coupon) {
    return {
      isValid: false,
      error: 'Coupon code not found',
    };
  }

  // Check expiration
  if (coupon.expiration && coupon.expiration < new Date()) {
    // Update status
    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { validationStatus: 'expired' },
    });

    return {
      isValid: false,
      error: 'Coupon has expired',
    };
  }

  // Check validation status
  if (coupon.validationStatus === 'invalid') {
    return {
      isValid: false,
      error: 'Coupon is invalid',
    };
  }

  return {
    isValid: true,
    discountAmount: coupon.discountAmount || undefined,
  };
}

/**
 * Get the best available coupon for a store
 * Returns coupon with highest discount
 */
export async function getBestCoupon(storeId: string): Promise<AvailableCoupon | null> {
  const coupons = await getAvailableCoupons(storeId);

  if (coupons.length === 0) {
    return null;
  }

  // Sort by discount amount (highest first)
  const sorted = coupons.sort((a, b) => {
    const amountA = a.discountAmount || 0;
    const amountB = b.discountAmount || 0;
    return amountB - amountA;
  });

  return sorted[0];
}

/**
 * Mark coupon as applied
 * Updates coupon status and creates savings record
 */
export async function markCouponApplied(
  couponId: string,
  userId: string,
  amountSaved: number
): Promise<void> {
  // Update coupon
  await prisma.coupon.update({
    where: { id: couponId },
    data: {
      autoApplied: true,
      validationStatus: 'valid',
    },
  });

  // Create savings record
  await prisma.savingsRecord.create({
    data: {
      userId,
      couponId,
      amountSaved,
      source: 'coupon',
    },
  });

  // Invalidate cache
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { storeId: true },
  });

  if (coupon) {
    await redis.del(`coupons:store:${coupon.storeId}`);
  }
}

/**
 * Update coupon validation status
 */
export async function updateCouponStatus(
  couponId: string,
  status: 'valid' | 'invalid' | 'expired'
): Promise<void> {
  await prisma.coupon.update({
    where: { id: couponId },
    data: { validationStatus: status },
  });

  // Invalidate cache
  const coupon = await prisma.coupon.findUnique({
    where: { id: couponId },
    select: { storeId: true },
  });

  if (coupon) {
    await redis.del(`coupons:store:${coupon.storeId}`);
  }
}

