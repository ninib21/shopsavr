import { PrismaClient } from '@prisma/client';
import redis from '../lib/redis';

const prisma = new PrismaClient();

export interface CreatePriceAlertData {
  userId: string;
  productIdentifier: string;
  thresholdPrice: number;
  productName?: string;
  productUrl?: string;
}

export interface PriceAlert {
  id: string;
  productIdentifier: string;
  productName?: string;
  thresholdPrice: number;
  currentPrice?: number;
  triggered: boolean;
  createdAt: Date;
}

/**
 * Create a new price alert
 */
export async function createPriceAlert(
  data: CreatePriceAlertData
): Promise<PriceAlert> {
  // Check if alert already exists
  const existing = await prisma.priceAlert.findFirst({
    where: {
      userId: data.userId,
      productIdentifier: data.productIdentifier,
      triggered: false,
    },
  });

  if (existing) {
    // Update threshold if lower
    if (data.thresholdPrice < existing.thresholdPrice) {
      return prisma.priceAlert.update({
        where: { id: existing.id },
        data: {
          thresholdPrice: data.thresholdPrice,
          productName: data.productName,
          productUrl: data.productUrl,
        },
      });
    }
    return existing;
  }

  // Create new alert
  const alert = await prisma.priceAlert.create({
    data: {
      userId: data.userId,
      productIdentifier: data.productIdentifier,
      thresholdPrice: data.thresholdPrice,
      productName: data.productName,
      productUrl: data.productUrl,
      triggered: false,
    },
  });

  return alert;
}

/**
 * Get user's price alerts
 */
export async function getUserPriceAlerts(userId: string) {
  return prisma.priceAlert.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      productIdentifier: true,
      productName: true,
      thresholdPrice: true,
      currentPrice: true,
      triggered: true,
      createdAt: true,
      productUrl: true,
    },
  });
}

/**
 * Get active (non-triggered) price alerts
 */
export async function getActivePriceAlerts() {
  return prisma.priceAlert.findMany({
    where: { triggered: false },
    include: {
      user: {
        select: {
          id: true,
          email: true,
        },
      },
    },
  });
}

/**
 * Update alert with current price
 */
export async function updateAlertPrice(
  alertId: string,
  currentPrice: number
): Promise<void> {
  await prisma.priceAlert.update({
    where: { id: alertId },
    data: { currentPrice },
  });
}

/**
 * Mark alert as triggered
 */
export async function triggerAlert(alertId: string): Promise<void> {
  await prisma.priceAlert.update({
    where: { id: alertId },
      data: {
        triggered: true,
      },
  });
}

/**
 * Delete price alert
 */
export async function deletePriceAlert(
  alertId: string,
  userId: string
): Promise<void> {
  const alert = await prisma.priceAlert.findFirst({
    where: {
      id: alertId,
      userId,
    },
  });

  if (!alert) {
    throw new Error('Price alert not found');
  }

  await prisma.priceAlert.delete({
    where: { id: alertId },
  });
}

/**
 * Check if price drop triggers alert
 */
export async function checkPriceDrop(alertId: string, currentPrice: number): Promise<boolean> {
  const alert = await prisma.priceAlert.findUnique({
    where: { id: alertId },
  });

  if (!alert || alert.triggered) {
    return false;
  }

  // Update current price
  await updateAlertPrice(alertId, currentPrice);

  // Check if price dropped below threshold
  if (currentPrice <= alert.thresholdPrice) {
    await triggerAlert(alertId);
    return true;
  }

  return false;
}

/**
 * Get price history for a product
 */
export async function getPriceHistory(productIdentifier: string) {
  // Check cache first
  const cacheKey = `price:history:${productIdentifier}`;
  const cached = await redis.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

  // Get from database (if we had a PriceHistory table)
  // For now, return empty array
  const history: Array<{ date: Date; price: number }> = [];

  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(history), 3600);

  return history;
}

/**
 * Record price point in history
 */
export async function recordPriceHistory(
  productIdentifier: string,
  price: number
): Promise<void> {
  const cacheKey = `price:history:${productIdentifier}`;
  
  // Get existing history
  const cached = await redis.get(cacheKey);
  const history: Array<{ date: Date; price: number }> = cached
    ? JSON.parse(cached)
    : [];

  // Add new price point
  history.push({
    date: new Date(),
    price,
  });

  // Keep only last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const filtered = history.filter((h) => new Date(h.date) >= thirtyDaysAgo);

  // Cache for 1 hour
  await redis.set(cacheKey, JSON.stringify(filtered), 3600);
}

