import { PrismaClient } from '@prisma/client';
import redis from '../lib/redis';

const prisma = new PrismaClient();

export interface ProductRecommendation {
  productId: string;
  productName: string;
  dealUrl: string;
  discountAmount: number;
  discountType: string;
  storeName: string;
  reason: string;
  confidence: number;
}

export interface ShoppingRecommendation {
  category: string;
  products: ProductRecommendation[];
  totalSavings: number;
}

/**
 * Get personalized product recommendations for user
 * Based on purchase history, price alerts, and browsing behavior
 */
export async function getPersonalizedRecommendations(
  userId: string
): Promise<ProductRecommendation[]> {
  // Check cache first
  const cacheKey = `recommendations:user:${userId}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const recommendations: ProductRecommendation[] = [];

  // Get user's receipt history to understand preferences
  const receipts = await prisma.receipt.findMany({
    where: { userId },
    take: 10,
    orderBy: { scannedAt: 'desc' },
  });

  // Extract product categories from receipts
  const categories = new Set<string>();
  receipts.forEach((receipt) => {
    if (receipt.extractedData) {
      const data = receipt.extractedData as { items?: Array<{ name: string }> };
      data.items?.forEach((item) => {
        // Simple category extraction (in production, use ML/NLP)
        const category = extractCategory(item.name);
        if (category) {
          categories.add(category);
        }
      });
    }
  });

  // Get user's price alerts to understand interests
  const alerts = await prisma.priceAlert.findMany({
    where: { userId, triggered: false },
    take: 10,
  });

  // Search for deals matching user interests
  for (const category of categories) {
    const deals = await prisma.deal.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: category, mode: 'insensitive' } },
              { tags: { has: category } },
            ],
          },
          {
            OR: [
              { expiry: { gt: new Date() } },
              { expiry: null },
            ],
          },
        ],
      },
      include: {
        coupons: {
          where: {
            OR: [
              { expiration: null },
              { expiration: { gt: new Date() } },
            ],
            validationStatus: {
              not: 'invalid',
            },
          },
          take: 1,
        },
      },
      orderBy: {
        discountAmount: 'desc',
      },
      take: 5,
    });

    deals.forEach((deal) => {
      const coupon = deal.coupons[0];
      const discount = coupon?.discountAmount || deal.discountAmount || 0;

      recommendations.push({
        productId: deal.id,
        productName: deal.title,
        dealUrl: deal.url,
        discountAmount: discount,
        discountType: deal.discountType || 'percentage',
        storeName: deal.source,
        reason: `Based on your purchase history`,
        confidence: 0.7,
      });
    });
  }

  // Add recommendations based on price alerts
  for (const alert of alerts) {
    const deals = await prisma.deal.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: alert.productIdentifier, mode: 'insensitive' } },
              { url: { contains: alert.productIdentifier } },
            ],
          },
          {
            OR: [
              { expiry: { gt: new Date() } },
              { expiry: null },
            ],
          },
        ],
      },
      include: {
        coupons: {
          where: {
            OR: [
              { expiration: null },
              { expiration: { gt: new Date() } },
            ],
            validationStatus: {
              not: 'invalid',
            },
          },
          take: 1,
        },
      },
      orderBy: {
        discountAmount: 'desc',
      },
      take: 3,
    });

    deals.forEach((deal) => {
      const coupon = deal.coupons[0];
      const discount = coupon?.discountAmount || deal.discountAmount || 0;

      if (discount > 0) {
        recommendations.push({
          productId: deal.id,
          productName: deal.title,
          dealUrl: deal.url,
          discountAmount: discount,
          discountType: deal.discountType || 'percentage',
          storeName: deal.source,
          reason: `Matches your price alert`,
          confidence: 0.9,
        });
      }
    });
  }

  // Remove duplicates and sort by confidence
  const unique = Array.from(
    new Map(recommendations.map((r) => [r.productId, r])).values()
  );
  unique.sort((a, b) => b.confidence - a.confidence);

  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(unique.slice(0, 20)), 3600);

  return unique.slice(0, 20);
}

/**
 * Get deal suggestions for a shopping list
 */
export async function getDealSuggestions(
  items: string[]
): Promise<ProductRecommendation[]> {
  const suggestions: ProductRecommendation[] = [];

  for (const item of items) {
    const deals = await prisma.deal.findMany({
      where: {
        AND: [
          {
            OR: [
              { title: { contains: item, mode: 'insensitive' } },
              { tags: { has: item.toLowerCase() } },
            ],
          },
          {
            OR: [
              { expiry: { gt: new Date() } },
              { expiry: null },
            ],
          },
        ],
      },
      include: {
        coupons: {
          where: {
            OR: [
              { expiration: null },
              { expiration: { gt: new Date() } },
            ],
            validationStatus: {
              not: 'invalid',
            },
          },
          take: 1,
        },
      },
      orderBy: {
        discountAmount: 'desc',
      },
      take: 3,
    });

    deals.forEach((deal) => {
      const coupon = deal.coupons[0];
      const discount = coupon?.discountAmount || deal.discountAmount || 0;

      suggestions.push({
        productId: deal.id,
        productName: deal.title,
        dealUrl: deal.url,
        discountAmount: discount,
        discountType: deal.discountType || 'percentage',
        storeName: deal.source,
        reason: `Matches "${item}"`,
        confidence: 0.8,
      });
    });
  }

  // Remove duplicates
  return Array.from(
    new Map(suggestions.map((s) => [s.productId, s])).values()
  );
}

/**
 * Extract category from product name
 * Simple keyword-based extraction (in production, use ML/NLP)
 */
function extractCategory(productName: string): string | null {
  const name = productName.toLowerCase();

  const categoryKeywords: Record<string, string[]> = {
    electronics: ['phone', 'laptop', 'tablet', 'tv', 'headphones', 'speaker', 'camera'],
    clothing: ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'sweater'],
    groceries: ['milk', 'bread', 'eggs', 'cheese', 'fruit', 'vegetable'],
    home: ['furniture', 'bed', 'chair', 'table', 'lamp', 'couch'],
    beauty: ['shampoo', 'soap', 'makeup', 'perfume', 'lotion', 'cream'],
    sports: ['bike', 'ball', 'gym', 'running', 'fitness', 'exercise'],
  };

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => name.includes(keyword))) {
      return category;
    }
  }

  return null;
}

/**
 * Get trending deals
 */
export async function getTrendingDeals(limit: number = 10): Promise<ProductRecommendation[]> {
  const cacheKey = `trending:deals:${limit}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  const deals = await prisma.deal.findMany({
      where: {
        OR: [
          { expiry: { gt: new Date() } },
          { expiry: null },
        ],
      },
    include: {
      coupons: {
        where: {
          OR: [
            { expiration: null },
            { expiration: { gt: new Date() } },
          ],
          validationStatus: {
            not: 'invalid',
          },
        },
        take: 1,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  const recommendations: ProductRecommendation[] = deals.map((deal) => {
    const dealWithCoupons = deal as typeof deal & { coupons: Array<{ discountAmount: number | null }> };
    const coupon = dealWithCoupons.coupons?.[0];
    const discount = coupon?.discountAmount || deal.discountAmount || 0;

    return {
      productId: deal.id,
      productName: deal.title,
      dealUrl: deal.url,
      discountAmount: discount,
      discountType: deal.discountType || 'percentage',
      storeName: deal.source,
      reason: 'Trending deal',
      confidence: 0.6,
    };
  });

  // Cache for 30 minutes
  await redis.set(cacheKey, JSON.stringify(recommendations), 1800);

  return recommendations;
}

