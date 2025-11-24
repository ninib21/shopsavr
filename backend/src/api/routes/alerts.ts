import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  createPriceAlert,
  getUserPriceAlerts,
  deletePriceAlert,
  getPriceHistory,
} from '../../services/priceAlertService';
import { monitorProductPrice } from '../../services/priceMonitor';

const router: Router = Router();

// Validation schemas
const createAlertSchema = z.object({
  productIdentifier: z.string().min(1, 'Product identifier is required'),
  thresholdPrice: z.number().positive('Threshold price must be positive'),
  productName: z.string().optional(),
  productUrl: z.string().url().optional(),
});

/**
 * POST /api/alerts
 * Create a new price alert
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const validatedData = createAlertSchema.parse(req.body);

    const alert = await createPriceAlert({
      userId: req.userId,
      ...validatedData,
    });

    res.status(201).json({
      success: true,
      data: alert,
      message: 'Price alert created successfully',
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

    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create price alert',
    });
  }
});

/**
 * GET /api/alerts
 * Get user's price alerts
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const alerts = await getUserPriceAlerts(req.userId);

    res.json({
      success: true,
      data: alerts,
      count: alerts.length,
    });
  } catch (error) {
    console.error('Get alerts error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price alerts',
    });
  }
});

/**
 * DELETE /api/alerts/:id
 * Delete a price alert
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    await deletePriceAlert(req.params.id, req.userId);

    res.json({
      success: true,
      message: 'Price alert deleted successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Price alert not found') {
      res.status(404).json({
        success: false,
        error: error.message,
      });
      return;
    }

    console.error('Delete alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete price alert',
    });
  }
});

/**
 * GET /api/alerts/:productIdentifier/price
 * Get current price for a product
 */
router.get('/:productIdentifier/price', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { productIdentifier } = req.params;

    const currentPrice = await monitorProductPrice(productIdentifier);

    if (currentPrice === null) {
      res.json({
        success: true,
        data: null,
        message: 'Price not available for this product',
      });
      return;
    }

    res.json({
      success: true,
      data: {
        productIdentifier,
        currentPrice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get price error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get product price',
    });
  }
});

/**
 * GET /api/alerts/:productIdentifier/history
 * Get price history for a product
 */
router.get('/:productIdentifier/history', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { productIdentifier } = req.params;

    const history = await getPriceHistory(productIdentifier);

    res.json({
      success: true,
      data: history,
      count: history.length,
    });
  } catch (error) {
    console.error('Get price history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get price history',
    });
  }
});

export default router;

