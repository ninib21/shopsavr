import {
  getAvailableCoupons,
  validateCoupon,
  getBestCoupon,
  markCouponApplied,
} from '../../src/services/couponService';
import { PrismaClient } from '@prisma/client';
import redis from '../../src/lib/redis';

// Mock dependencies
jest.mock('../../src/lib/redis');
jest.mock('@prisma/client');

describe('CouponService', () => {
  let mockPrisma: jest.Mocked<PrismaClient>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
  });

  describe('getAvailableCoupons', () => {
    it('should return cached coupons if available', async () => {
      const mockCoupons = [
        {
          id: '1',
          code: 'SAVE20',
          discountAmount: 20,
          expiration: null,
          storeId: 'amazon',
        },
      ];

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockCoupons));

      const result = await getAvailableCoupons('amazon');

      expect(result).toEqual(mockCoupons);
      expect(redis.get).toHaveBeenCalledWith('coupons:store:amazon');
    });

    it('should fetch from database and cache if not in cache', async () => {
      const mockCoupons = [
        {
          id: '1',
          code: 'SAVE20',
          discountAmount: 20,
          expiration: null,
          storeId: 'amazon',
          createdAt: new Date(),
          updatedAt: new Date(),
          dealId: null,
          autoApplied: false,
          validationStatus: 'valid',
        },
      ];

      (redis.get as jest.Mock).mockResolvedValue(null);
      (mockPrisma.coupon.findMany as jest.Mock).mockResolvedValue(mockCoupons);
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      const result = await getAvailableCoupons('amazon');

      expect(result.length).toBeGreaterThan(0);
      expect(redis.set).toHaveBeenCalled();
    });
  });

  describe('validateCoupon', () => {
    it('should return invalid if coupon not found', async () => {
      (mockPrisma.coupon.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await validateCoupon('INVALID', 'amazon');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Coupon code not found');
    });

    it('should return invalid if coupon expired', async () => {
      const expiredCoupon = {
        id: '1',
        code: 'EXPIRED',
        expiration: new Date('2020-01-01'),
        validationStatus: 'valid',
      };

      (mockPrisma.coupon.findFirst as jest.Mock).mockResolvedValue(expiredCoupon);
      (mockPrisma.coupon.update as jest.Mock).mockResolvedValue(expiredCoupon);

      const result = await validateCoupon('EXPIRED', 'amazon');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Coupon has expired');
    });

    it('should return valid for valid coupon', async () => {
      const validCoupon = {
        id: '1',
        code: 'VALID20',
        expiration: null,
        validationStatus: 'valid',
        discountAmount: 20,
      };

      (mockPrisma.coupon.findFirst as jest.Mock).mockResolvedValue(validCoupon);

      const result = await validateCoupon('VALID20', 'amazon');

      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(20);
    });
  });

  describe('getBestCoupon', () => {
    it('should return null if no coupons available', async () => {
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify([]));

      const result = await getBestCoupon('amazon');

      expect(result).toBeNull();
    });

    it('should return coupon with highest discount', async () => {
      const coupons = [
        { id: '1', code: 'SAVE10', discountAmount: 10, expiration: null, storeId: 'amazon' },
        { id: '2', code: 'SAVE20', discountAmount: 20, expiration: null, storeId: 'amazon' },
        { id: '3', code: 'SAVE15', discountAmount: 15, expiration: null, storeId: 'amazon' },
      ];

      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(coupons));

      const result = await getBestCoupon('amazon');

      expect(result).not.toBeNull();
      expect(result?.code).toBe('SAVE20');
      expect(result?.discountAmount).toBe(20);
    });
  });
});

