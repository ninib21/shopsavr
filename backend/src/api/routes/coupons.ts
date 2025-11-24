import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  getAvailableCoupons,
  getBestCoupon,
  validateCoupon,
  markCouponApplied,
  updateCouponStatus,
} from '../../services/couponService';
import { detectAvailableCoupons } from '../../services/couponDetector';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const router: Router = Router();

// Validation schemas
const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  storeId: z.string().min(1, 'Store ID is required'),
});

const applyCouponSchema = z.object({
  couponId: z.string().min(1, 'Coupon ID is required'),
  storeId: z.string().min(1, 'Store ID is required'),
  amountSaved: z.number().min(0, 'Amount saved must be positive'),
});

/**
 * GET /api/coupons/available
 * Get available coupons for a store
 */
router.get('/available', optionalAuth, async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;

    if (!storeId) {
      res.status(400).json({
        success: false,
        error: 'Store ID is required',
      });
      return;
    }

    const coupons = await getAvailableCoupons(storeId);

    res.json({
      success: true,
      data: coupons,
      count: coupons.length,
    });
  } catch (error) {
    console.error('Get available coupons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get available coupons',
    });
  }
});

/**
 * GET /api/coupons/best
 * Get the best available coupon for a store
 */
router.get('/best', optionalAuth, async (req: Request, res: Response) => {
  try {
    const storeId = req.query.storeId as string;

    if (!storeId) {
      res.status(400).json({
        success: false,
        error: 'Store ID is required',
      });
      return;
    }

    const bestCoupon = await getBestCoupon(storeId);

    if (!bestCoupon) {
      res.json({
        success: true,
        data: null,
        message: 'No coupons available for this store',
      });
      return;
    }

    res.json({
      success: true,
      data: bestCoupon,
    });
  } catch (error) {
    console.error('Get best coupon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get best coupon',
    });
  }
});

/**
 * POST /api/coupons/validate
 * Validate a coupon code
 */
router.post('/validate', optionalAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = validateCouponSchema.parse(req.body);
    const result = await validateCoupon(validatedData.code, validatedData.storeId);

    res.json({
      success: result.isValid,
      data: result,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Validate coupon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to validate coupon',
    });
  }
});

/**
 * POST /api/coupons/apply
 * Apply a coupon (mark as used and create savings record)
 */
router.post('/apply', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const validatedData = applyCouponSchema.parse(req.body);

    // Validate coupon first
    const coupon = await prisma.coupon.findUnique({
      where: { id: validatedData.couponId },
    });

    if (!coupon) {
      res.status(404).json({
        success: false,
        error: 'Coupon not found',
      });
      return;
    }

    const validation = await validateCoupon(coupon.code, validatedData.storeId);

    if (!validation.isValid) {
      res.status(400).json({
        success: false,
        error: validation.error || 'Coupon is not valid',
      });
      return;
    }

    // Mark as applied
    await markCouponApplied(
      validatedData.couponId,
      req.userId,
      validatedData.amountSaved
    );

    res.json({
      success: true,
      message: 'Coupon applied successfully',
      data: {
        couponId: validatedData.couponId,
        amountSaved: validatedData.amountSaved,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
      return;
    }

    console.error('Apply coupon error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply coupon',
    });
  }
});

/**
 * POST /api/coupons/detect
 * Detect available coupons for a URL
 */
router.post('/detect', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({
        success: false,
        error: 'URL is required',
      });
      return;
    }

    const result = await detectAvailableCoupons(url);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Detect coupons error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to detect coupons',
    });
  }
});

/**
 * PUT /api/coupons/:id/status
 * Update coupon validation status
 */
router.put('/:id/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['valid', 'invalid', 'expired'].includes(status)) {
      res.status(400).json({
        success: false,
        error: 'Invalid status. Must be: valid, invalid, or expired',
      });
      return;
    }

    await updateCouponStatus(id, status as 'valid' | 'invalid' | 'expired');

    res.json({
      success: true,
      message: 'Coupon status updated',
    });
  } catch (error) {
    console.error('Update coupon status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update coupon status',
    });
  }
});

export default router;

