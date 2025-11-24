import { PrismaClient } from '@prisma/client';
import redis from '../lib/redis';

const prisma = new PrismaClient();

export interface PriceMatch {
  itemName: string;
  originalPrice: number;
  betterPrice?: number;
  storeName?: string;
  savings?: number;
  savingsPercentage?: number;
  dealUrl?: string;
}

export interface PriceMatchResult {
  receiptId: string;
  matches: PriceMatch[];
  totalSavings: number;
  itemsMatched: number;
}

/**
 * Find better prices for receipt items
 * Searches deals and coupons for matching products
 */
export async function findBetterPrices(
  receiptId: string,
  items: Array<{ name: string; price: number }>
): Promise<PriceMatchResult> {
  const matches: PriceMatch[] = [];
  let totalSavings = 0;
  let itemsMatched = 0;

  for (const item of items) {
    const match = await findBetterPriceForItem(item.name, item.price);
    if (match && match.betterPrice && match.betterPrice < item.price) {
      matches.push(match);
      const savings = item.price - match.betterPrice;
      totalSavings += savings;
      itemsMatched++;
    } else {
      // No better price found, but include original
      matches.push({
        itemName: item.name,
        originalPrice: item.price,
      });
    }
  }

  return {
    receiptId,
    matches,
    totalSavings,
    itemsMatched,
  };
}

/**
 * Find better price for a single item
 */
async function findBetterPriceForItem(
  itemName: string,
  currentPrice: number
): Promise<PriceMatch | null> {
  // Normalize item name for searching
  const searchTerms = extractSearchTerms(itemName);

  // Check cache first
  const cacheKey = `price:match:${searchTerms.join(':')}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    const match = JSON.parse(cached);
    if (match.betterPrice && match.betterPrice < currentPrice) {
      return match;
    }
  }

  // Search deals for matching products
  const deals = await prisma.deal.findMany({
    where: {
      OR: searchTerms.map((term) => ({
        title: {
          contains: term,
          mode: 'insensitive',
        },
      })),
      OR: [
        { expiry: { gt: new Date() } },
        { expiry: null },
      ],
    },
    // Note: Deal-Coupon relation exists in schema
    // For now, we'll search coupons separately
    orderBy: {
      discountAmount: 'desc',
    },
    take: 5,
  });

  // Find best match
  let bestMatch: PriceMatch | null = null;
  let bestPrice = currentPrice;

  for (const deal of deals) {
    // Calculate price with discount
    let discountedPrice = currentPrice;

    if (deal.discountAmount) {
      if (deal.discountType === 'percentage') {
        discountedPrice = currentPrice * (1 - deal.discountAmount / 100);
      } else {
        discountedPrice = currentPrice - deal.discountAmount;
      }
    }

    // Search for coupons for this deal
    const coupons = await prisma.coupon.findMany({
      where: {
        dealId: deal.id,
        OR: [
          { expiration: null },
          { expiration: { gt: new Date() } },
        ],
        validationStatus: {
          not: 'invalid',
        },
      },
      orderBy: {
        discountAmount: 'desc',
      },
      take: 1,
    });

    // Check if coupon provides better discount
    if (coupons.length > 0) {
      const coupon = coupons[0];
      if (coupon.discountAmount) {
        // Assume percentage if amount <= 100
        if (coupon.discountAmount <= 100) {
          discountedPrice = currentPrice * (1 - coupon.discountAmount / 100);
        } else {
          discountedPrice = currentPrice - coupon.discountAmount;
        }
      }
    }

    if (discountedPrice < bestPrice) {
      bestPrice = discountedPrice;
      bestMatch = {
        itemName,
        originalPrice: currentPrice,
        betterPrice: discountedPrice,
        storeName: deal.source,
        savings: currentPrice - discountedPrice,
        savingsPercentage: ((currentPrice - discountedPrice) / currentPrice) * 100,
        dealUrl: deal.url,
      };
    }
  }

  // Cache result for 1 hour
  if (bestMatch) {
    await redis.set(cacheKey, JSON.stringify(bestMatch), 3600);
  }

  return bestMatch;
}

/**
 * Extract search terms from item name
 * Removes common words and extracts keywords
 */
function extractSearchTerms(itemName: string): string[] {
  // Remove common words
  const stopWords = [
    'the',
    'a',
    'an',
    'and',
    'or',
    'but',
    'in',
    'on',
    'at',
    'to',
    'for',
    'of',
    'with',
    'by',
    'from',
    'as',
    'is',
    'was',
    'are',
    'were',
    'been',
    'be',
    'have',
    'has',
    'had',
    'do',
    'does',
    'did',
    'will',
    'would',
    'should',
    'could',
    'may',
    'might',
    'must',
    'can',
  ];

  // Split into words and filter
  const words = itemName
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.includes(word));

  // Return unique words, prioritizing longer words
  return [...new Set(words)].sort((a, b) => b.length - a.length).slice(0, 5);
}

/**
 * Get price match results for a receipt
 */
export async function getPriceMatchResults(receiptId: string) {
  const receipt = await prisma.receipt.findUnique({
    where: { id: receiptId },
  });

  if (!receipt || !receipt.extractedData) {
    throw new Error('Receipt not found or not processed');
  }

  const parsedData = receipt.extractedData as {
    items?: Array<{ name: string; price: number }>;
  };

  if (!parsedData.items || parsedData.items.length === 0) {
    return {
      receiptId,
      matches: [],
      totalSavings: 0,
      itemsMatched: 0,
    };
  }

  return findBetterPrices(receiptId, parsedData.items);
}

