const WishlistItem = require('../models/WishlistItem');
const PriceAlert = require('../models/PriceAlert');
const Logger = require('../utils/logger');
const NotificationService = require('./notificationService');

class PriceTrackingService {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.batchSize = 50;
    this.concurrentLimit = 10;
  }

  // Start the price tracking service
  start() {
    if (this.isRunning) {
      Logger.warn('Price tracking service is already running');
      return;
    }

    this.isRunning = true;
    Logger.info('Starting price tracking service');

    // Run immediately, then every 30 minutes
    this.runPriceCheck();
    this.intervalId = setInterval(() => {
      this.runPriceCheck();
    }, 30 * 60 * 1000); // 30 minutes
  }

  // Stop the price tracking service
  stop() {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    Logger.info('Price tracking service stopped');
  }

  // Main price checking routine
  async runPriceCheck() {
    if (!this.isRunning) return;

    try {
      Logger.info('Starting price check cycle');

      // Get items that need price updates
      const itemsToCheck = await this.getItemsForPriceCheck();
      
      if (itemsToCheck.length === 0) {
        Logger.info('No items need price checking at this time');
        return;
      }

      Logger.info(`Found ${itemsToCheck.length} items to check`);

      // Process items in batches
      const batches = this.createBatches(itemsToCheck, this.batchSize);
      
      for (const batch of batches) {
        if (!this.isRunning) break;
        
        await this.processBatch(batch);
        
        // Small delay between batches to avoid overwhelming external APIs
        await this.delay(2000);
      }

      Logger.info('Price check cycle completed');
    } catch (error) {
      Logger.error('Price check cycle failed', { error: error.message });
    }
  }

  // Get items that need price checking
  async getItemsForPriceCheck() {
    const now = new Date();
    
    // Get items based on their check frequency
    const hourlyItems = await WishlistItem.getItemsForPriceUpdate({
      frequency: 'hourly',
      limit: 100
    });

    const dailyItems = await WishlistItem.getItemsForPriceUpdate({
      frequency: 'daily',
      limit: 500
    });

    const weeklyItems = await WishlistItem.getItemsForPriceUpdate({
      frequency: 'weekly',
      limit: 200
    });

    return [...hourlyItems, ...dailyItems, ...weeklyItems];
  }

  // Process a batch of items
  async processBatch(items) {
    const promises = items.map(item => 
      this.checkItemPrice(item).catch(error => {
        Logger.error('Failed to check price for item', {
          itemId: item._id,
          productName: item.product.name,
          error: error.message
        });
        return null;
      })
    );

    // Process with concurrency limit
    const results = await this.processConcurrently(promises, this.concurrentLimit);
    
    const successful = results.filter(result => result !== null).length;
    Logger.info(`Processed batch: ${successful}/${items.length} successful`);
  }

  // Check price for a single item
  async checkItemPrice(item) {
    try {
      const priceUpdates = [];

      // Check each source for the item
      for (const source of item.sources.filter(s => s.isActive)) {
        const priceData = await this.fetchPriceFromSource(source, item);
        
        if (priceData) {
          priceUpdates.push({
            source: source.name,
            domain: source.domain,
            price: priceData.price,
            availability: priceData.availability,
            url: source.url
          });

          // Update source with new price
          await item.addSource({
            name: source.name,
            url: source.url,
            domain: source.domain,
            price: priceData.price,
            availability: priceData.availability
          });
        }
      }

      if (priceUpdates.length === 0) {
        // No price updates found, just update last checked
        item.tracking.lastChecked = new Date();
        await item.save();
        return { itemId: item._id, status: 'no_updates' };
      }

      // Find the best (lowest) price
      const bestPrice = Math.min(...priceUpdates.map(update => update.price));
      const bestSource = priceUpdates.find(update => update.price === bestPrice);

      // Update item price if it's different
      const oldPrice = item.tracking.currentPrice;
      if (bestPrice !== oldPrice) {
        const updateResult = await item.updatePrice(bestPrice, bestSource.source, {
          url: bestSource.url,
          availability: bestSource.availability
        });

        // Check if alert should be triggered
        if (updateResult.shouldAlert) {
          await this.createPriceAlert(item, oldPrice, bestPrice, bestSource);
        }

        Logger.info('Price updated for item', {
          itemId: item._id,
          productName: item.product.name,
          oldPrice,
          newPrice: bestPrice,
          source: bestSource.source,
          shouldAlert: updateResult.shouldAlert
        });

        return {
          itemId: item._id,
          status: 'updated',
          oldPrice,
          newPrice: bestPrice,
          source: bestSource.source
        };
      }

      return { itemId: item._id, status: 'no_change' };
    } catch (error) {
      Logger.error('Price check failed for item', {
        itemId: item._id,
        error: error.message
      });
      throw error;
    }
  }

  // Fetch price from a specific source
  async fetchPriceFromSource(source, item) {
    try {
      // This is a mock implementation - in reality, you would integrate with
      // actual price scraping services or APIs for each domain
      
      // Simulate different response scenarios
      const scenarios = [
        { probability: 0.7, type: 'success' },
        { probability: 0.2, type: 'no_change' },
        { probability: 0.1, type: 'error' }
      ];

      const random = Math.random();
      let cumulative = 0;
      let scenario = 'error';

      for (const s of scenarios) {
        cumulative += s.probability;
        if (random <= cumulative) {
          scenario = s.type;
          break;
        }
      }

      switch (scenario) {
        case 'success':
          // Simulate price change (±20% of current price)
          const currentPrice = source.price || item.tracking.currentPrice;
          const changePercent = (Math.random() - 0.5) * 0.4; // -20% to +20%
          const newPrice = Math.max(1, currentPrice * (1 + changePercent));
          
          return {
            price: Math.round(newPrice * 100) / 100, // Round to 2 decimal places
            availability: Math.random() > 0.1 ? 'in_stock' : 'out_of_stock',
            lastChecked: new Date()
          };

        case 'no_change':
          return {
            price: source.price || item.tracking.currentPrice,
            availability: 'in_stock',
            lastChecked: new Date()
          };

        case 'error':
        default:
          throw new Error(`Failed to fetch price from ${source.domain}`);
      }
    } catch (error) {
      Logger.warn('Price fetch failed', {
        domain: source.domain,
        itemId: item._id,
        error: error.message
      });
      return null;
    }
  }

  // Create price alert when conditions are met
  async createPriceAlert(item, oldPrice, newPrice, source) {
    try {
      const alertData = {
        userId: item.userId,
        wishlistItemId: item._id,
        product: {
          name: item.product.name,
          brand: item.product.brand,
          image: item.product.image,
          category: item.product.category
        },
        source: {
          name: source.source,
          domain: source.domain,
          url: source.url
        },
        previousPrice: oldPrice,
        currentPrice: newPrice,
        metadata: {
          platform: 'system',
          triggeredBy: 'price_tracking_service'
        }
      };

      let alert;

      // Check if target price is met
      if (item.alerts.targetPrice && newPrice <= item.alerts.targetPrice) {
        alert = await PriceAlert.createTargetPriceAlert(alertData);
        Logger.info('Target price alert created', {
          alertId: alert._id,
          itemId: item._id,
          targetPrice: item.alerts.targetPrice,
          currentPrice: newPrice
        });
      }
      // Check if price drop threshold is met
      else if (oldPrice > newPrice) {
        const dropPercentage = ((oldPrice - newPrice) / oldPrice) * 100;
        
        if (dropPercentage >= item.alerts.priceDropThreshold) {
          alert = await PriceAlert.createPriceDropAlert(alertData);
          Logger.info('Price drop alert created', {
            alertId: alert._id,
            itemId: item._id,
            dropPercentage: dropPercentage.toFixed(2),
            threshold: item.alerts.priceDropThreshold
          });
        }
      }

      // Send notification if alert was created
      if (alert) {
        await NotificationService.sendPriceAlert(alert);
        
        // Update last alert sent timestamp
        item.alerts.lastAlertSent = new Date();
        await item.save();
      }

      return alert;
    } catch (error) {
      Logger.error('Failed to create price alert', {
        itemId: item._id,
        error: error.message
      });
      throw error;
    }
  }

  // Manual price check for specific item
  async checkSingleItem(itemId) {
    try {
      const item = await WishlistItem.findById(itemId);
      
      if (!item || item.status !== 'active' || !item.tracking.isTracking) {
        throw new Error('Item not found or not trackable');
      }

      const result = await this.checkItemPrice(item);
      
      Logger.info('Manual price check completed', {
        itemId,
        result
      });

      return result;
    } catch (error) {
      Logger.error('Manual price check failed', {
        itemId,
        error: error.message
      });
      throw error;
    }
  }

  // Bulk price check for user's wishlist
  async checkUserWishlist(userId) {
    try {
      const items = await WishlistItem.find({
        userId,
        status: 'active',
        'tracking.isTracking': true
      }).limit(100);

      if (items.length === 0) {
        return { message: 'No trackable items found', results: [] };
      }

      const results = [];
      
      for (const item of items) {
        try {
          const result = await this.checkItemPrice(item);
          results.push(result);
        } catch (error) {
          results.push({
            itemId: item._id,
            status: 'error',
            error: error.message
          });
        }
      }

      Logger.info('Bulk price check completed', {
        userId,
        totalItems: items.length,
        successful: results.filter(r => r.status !== 'error').length
      });

      return {
        message: 'Bulk price check completed',
        results,
        summary: {
          total: items.length,
          successful: results.filter(r => r.status !== 'error').length,
          updated: results.filter(r => r.status === 'updated').length,
          errors: results.filter(r => r.status === 'error').length
        }
      };
    } catch (error) {
      Logger.error('Bulk price check failed', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  // Utility methods
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  async processConcurrently(promises, limit) {
    const results = [];
    
    for (let i = 0; i < promises.length; i += limit) {
      const batch = promises.slice(i, i + limit);
      const batchResults = await Promise.all(batch);
      results.push(...batchResults);
    }
    
    return results;
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service status
  getStatus() {
    return {
      isRunning: this.isRunning,
      startedAt: this.startedAt,
      lastCheck: this.lastCheck,
      batchSize: this.batchSize,
      concurrentLimit: this.concurrentLimit
    };
  }
}

// Export singleton instance
module.exports = new PriceTrackingService();