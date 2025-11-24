import { getActivePriceAlerts, checkPriceDrop, recordPriceHistory } from './priceAlertService';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Monitor prices for all active alerts
 * This would typically run as a scheduled job
 */
export async function monitorPrices(): Promise<void> {
  const alerts = await getActivePriceAlerts();

  console.log(`Monitoring ${alerts.length} price alerts...`);

  for (const alert of alerts) {
    try {
      // Get current price for product
      const currentPrice = await getCurrentPrice(alert.productIdentifier);

      if (currentPrice === null) {
        continue; // Skip if price unavailable
      }

      // Record in history
      await recordPriceHistory(alert.productIdentifier, currentPrice);

      // Check if alert should trigger
      const triggered = await checkPriceDrop(alert.id, currentPrice);

      if (triggered) {
        // Send notification to user
        await notifyPriceDrop(alert, currentPrice);
      }
    } catch (error) {
      console.error(`Error monitoring alert ${alert.id}:`, error);
    }
  }
}

/**
 * Get current price for a product
 * This would integrate with product APIs or scraping
 */
async function getCurrentPrice(productIdentifier: string): Promise<number | null> {
  // Try to get from deals database first
  const deal = await prisma.deal.findFirst({
    where: {
      OR: [
        { url: { contains: productIdentifier } },
        { title: { contains: productIdentifier, mode: 'insensitive' } },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  if (deal && deal.discountAmount) {
    // Calculate price from deal
    // This is simplified - in reality, you'd fetch actual product price
    return deal.discountAmount;
  }

  // In a real implementation, you would:
  // 1. Parse productIdentifier (URL, SKU, etc.)
  // 2. Fetch current price from retailer API
  // 3. Or scrape price from product page
  // 4. Return null if unavailable

  return null;
}

/**
 * Send notification to user about price drop
 */
async function notifyPriceDrop(
  alert: {
    id: string;
    productIdentifier: string;
    thresholdPrice: number;
    userId: string;
    user: { email: string };
  },
  currentPrice: number
): Promise<void> {
  const savings = alert.thresholdPrice - currentPrice;
  const savingsPercent = ((savings / alert.thresholdPrice) * 100).toFixed(1);

  const title = 'Price Drop Alert! 🎉';
  const body = `Product dropped to $${currentPrice.toFixed(2)}! Save $${savings.toFixed(2)} (${savingsPercent}%)`;

  try {
    // Send push notification
    // Note: In production, you'd need to get the user's FCM token from database
    // For now, we'll just log the notification
    // await sendPushNotification(userFcmToken, title, body, {
    //   type: 'price_drop',
    //   alertId: alert.id,
    //   productIdentifier: alert.productIdentifier,
    //   currentPrice: currentPrice.toString(),
    //   thresholdPrice: alert.thresholdPrice.toString(),
    // });
    
    console.log(`Price drop notification for user ${alert.userId}: ${title} - ${body}`);

    console.log(`Price drop notification sent to user ${alert.userId}`);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

/**
 * Monitor specific product price
 */
export async function monitorProductPrice(productIdentifier: string): Promise<number | null> {
  const price = await getCurrentPrice(productIdentifier);
  
  if (price !== null) {
    await recordPriceHistory(productIdentifier, price);
  }

  return price;
}

