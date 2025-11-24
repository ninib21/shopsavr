import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticateToken, optionalAuth } from '../middleware/auth';
import {
  getPersonalizedRecommendations,
  getDealSuggestions,
  getTrendingDeals,
} from '../../services/recommendationService';

const router: Router = Router();

// Validation schemas
const shoppingListSchema = z.object({
  items: z.array(z.string().min(1)).min(1, 'At least one item is required'),
});

/**
 * GET /api/recommendations/personalized
 * Get personalized product recommendations
 */
router.get('/personalized', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    const recommendations = await getPersonalizedRecommendations(req.userId);

    res.json({
      success: true,
      data: recommendations,
      count: recommendations.length,
    });
  } catch (error) {
    console.error('Get personalized recommendations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get recommendations',
    });
  }
});

/**
 * POST /api/recommendations/suggestions
 * Get deal suggestions for a shopping list
 */
router.post('/suggestions', optionalAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = shoppingListSchema.parse(req.body);

    const suggestions = await getDealSuggestions(validatedData.items);

    res.json({
      success: true,
      data: suggestions,
      count: suggestions.length,
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

    console.error('Get deal suggestions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions',
    });
  }
});

/**
 * GET /api/recommendations/trending
 * Get trending deals
 */
router.get('/trending', optionalAuth, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    const trending = await getTrendingDeals(limit);

    res.json({
      success: true,
      data: trending,
      count: trending.length,
    });
  } catch (error) {
    console.error('Get trending deals error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending deals',
    });
  }
});

export default router;

