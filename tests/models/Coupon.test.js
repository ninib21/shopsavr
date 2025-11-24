const Coupon = require('../../backend/models/Coupon');

describe('Coupon Model', () => {
  describe('Coupon Creation', () => {
    test('should create a coupon with valid data', async () => {
      const couponData = {
        code: 'SAVE20',
        domain: 'example.com',
        title: '20% Off Everything',
        description: 'Save 20% on all items',
        discountType: 'percentage',
        discountValue: 20,
        minimumOrder: 50,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        source: {
          provider: 'test-provider'
        }
      };

      const coupon = new Coupon(couponData);
      const savedCoupon = await coupon.save();

      expect(savedCoupon.code).toBe('SAVE20');
      expect(savedCoupon.domain).toBe('example.com');
      expect(savedCoupon.discountType).toBe('percentage');
      expect(savedCoupon.discountValue).toBe(20);
      expect(savedCoupon.isActive).toBe(true);
      expect(savedCoupon.usageStats.totalAttempts).toBe(0);
    });

    test('should fail to create coupon without required fields', async () => {
      const coupon = new Coupon({});
      await expect(coupon.save()).rejects.toThrow();
    });

    test('should fail to create coupon with invalid discount type', async () => {
      const couponData = {
        code: 'INVALID',
        domain: 'example.com',
        title: 'Invalid Coupon',
        discountType: 'invalid-type',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' }
      };

      const coupon = new Coupon(couponData);
      await expect(coupon.save()).rejects.toThrow();
    });

    test('should fail to create percentage coupon with value > 100', async () => {
      const couponData = {
        code: 'INVALID',
        domain: 'example.com',
        title: 'Invalid Percentage',
        discountType: 'percentage',
        discountValue: 150,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' }
      };

      const coupon = new Coupon(couponData);
      await expect(coupon.save()).rejects.toThrow();
    });
  });

  describe('Virtual Properties', () => {
    let coupon;

    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'TEST20',
        domain: 'test.com',
        title: 'Test Coupon',
        discountType: 'percentage',
        discountValue: 20,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' },
        usageStats: {
          totalAttempts: 10,
          successfulUses: 8
        }
      });
    });

    test('should calculate success rate correctly', () => {
      expect(coupon.successRate).toBe(0.8);
    });

    test('should return 0 success rate for no attempts', async () => {
      coupon.usageStats.totalAttempts = 0;
      coupon.usageStats.successfulUses = 0;
      await coupon.save();
      
      expect(coupon.successRate).toBe(0);
    });

    test('should check if coupon is expired', async () => {
      expect(coupon.isExpired).toBe(false);
      
      coupon.expiresAt = new Date(Date.now() - 1000);
      await coupon.save();
      
      expect(coupon.isExpired).toBe(true);
    });

    test('should check if coupon is valid', async () => {
      expect(coupon.isValid).toBe(true);
      
      coupon.isActive = false;
      await coupon.save();
      
      expect(coupon.isValid).toBe(false);
    });
  });

  describe('Instance Methods', () => {
    let coupon;

    beforeEach(async () => {
      coupon = await Coupon.create({
        code: 'METHOD20',
        domain: 'method.com',
        title: 'Method Test Coupon',
        discountType: 'percentage',
        discountValue: 20,
        minimumOrder: 50,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        source: { provider: 'test' },
        categories: ['electronics', 'clothing']
      });
    });

    test('should record usage attempt', async () => {
      await coupon.recordAttempt(true);
      
      expect(coupon.usageStats.totalAttempts).toBe(1);
      expect(coupon.usageStats.successfulUses).toBe(1);
      expect(coupon.usageStats.lastUsed).toBeDefined();
    });

    test('should record failed attempt', async () => {
      await coupon.recordAttempt(false);
      
      expect(coupon.usageStats.totalAttempts).toBe(1);
      expect(coupon.usageStats.successfulUses).toBe(0);
      expect(coupon.usageStats.lastUsed).toBeNull();
    });

    test('should check if coupon applies to order', () => {
      const orderData = {
        amount: 100,
        categories: ['electronics'],
        isNewUser: false
      };

      const result = coupon.appliesTo(orderData);
      expect(result.applies).toBe(true);
    });

    test('should reject order below minimum', () => {
      const orderData = {
        amount: 30,
        categories: ['electronics']
      };

      const result = coupon.appliesTo(orderData);
      expect(result.applies).toBe(false);
      expect(result.reason).toContain('Minimum order amount');
    });

    test('should reject order with wrong categories', () => {
      const orderData = {
        amount: 100,
        categories: ['books']
      };

      const result = coupon.appliesTo(orderData);
      expect(result.applies).toBe(false);
      expect(result.reason).toContain('does not apply to these categories');
    });

    test('should calculate percentage discount correctly', () => {
      const discount = coupon.calculateDiscount(100, { categories: ['electronics'] });
      expect(discount).toBe(20);
    });

    test('should calculate fixed discount correctly', async () => {
      coupon.discountType = 'fixed';
      coupon.discountValue = 15;
      await coupon.save();

      const discount = coupon.calculateDiscount(100, { categories: ['electronics'] });
      expect(discount).toBe(15);
    });

    test('should apply maximum discount limit', async () => {
      coupon.maximumDiscount = 10;
      await coupon.save();

      const discount = coupon.calculateDiscount(100, { categories: ['electronics'] });
      expect(discount).toBe(10);
    });

    test('should not exceed order amount', () => {
      const discount = coupon.calculateDiscount(10, { categories: ['electronics'] });
      expect(discount).toBe(0); // Below minimum order, should return 0
    });

    test('should calculate discount for small order above minimum', () => {
      const discount = coupon.calculateDiscount(60, { categories: ['electronics'] });
      expect(discount).toBe(12); // 20% of 60
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await Coupon.create([
        {
          code: 'ACTIVE1',
          domain: 'static.com',
          title: 'Active Coupon 1',
          discountType: 'percentage',
          discountValue: 20,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          source: { provider: 'test' },
          usageStats: { successfulUses: 10 }
        },
        {
          code: 'ACTIVE2',
          domain: 'static.com',
          title: 'Active Coupon 2',
          discountType: 'fixed',
          discountValue: 15,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          source: { provider: 'test' },
          usageStats: { successfulUses: 5 }
        },
        {
          code: 'EXPIRED',
          domain: 'static.com',
          title: 'Expired Coupon',
          discountType: 'percentage',
          discountValue: 30,
          expiresAt: new Date(Date.now() - 1000),
          isActive: false,
          source: { provider: 'test' }
        },
        {
          code: 'INACTIVE',
          domain: 'static.com',
          title: 'Inactive Coupon',
          discountType: 'percentage',
          discountValue: 25,
          isActive: false,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          source: { provider: 'test' }
        }
      ]);
    });

    test('should find active coupons for domain', async () => {
      const coupons = await Coupon.findActiveCoupons('static.com');
      
      expect(coupons).toHaveLength(2);
      expect(coupons[0].code).toBe('ACTIVE1'); // Should be sorted by successful uses
      expect(coupons[1].code).toBe('ACTIVE2');
    });

    test('should find best coupon for order', async () => {
      const orderData = {
        amount: 100,
        categories: []
      };

      const result = await Coupon.findBestCoupon('static.com', orderData);
      
      expect(result.coupon).toBeDefined();
      expect(result.discount).toBe(20); // 20% of 100
      expect(result.coupon.code).toBe('ACTIVE1');
    });

    test('should cleanup expired coupons', async () => {
      const deletedCount = await Coupon.cleanupExpired();
      expect(deletedCount.deletedCount).toBeGreaterThan(0);
    });

    test('should get domain statistics', async () => {
      const stats = await Coupon.getDomainStats('static.com');
      
      expect(stats).toHaveLength(1);
      expect(stats[0].totalCoupons).toBe(4);
      expect(stats[0].activeCoupons).toBe(2);
    });
  });
});