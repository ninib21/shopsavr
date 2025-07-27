const WishlistItem = require('../../backend/models/WishlistItem');
const User = require('../../backend/models/User');

describe('WishlistItem Model', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      email: 'wishlist@example.com',
      password: 'Password123',
      profile: { name: 'Wishlist User' }
    });
  });

  describe('WishlistItem Creation', () => {
    test('should create a wishlist item with valid data', async () => {
      const itemData = {
        userId: testUser._id,
        product: {
          name: 'iPhone 15 Pro',
          brand: 'Apple',
          category: 'electronics',
          image: 'https://example.com/iphone.jpg'
        },
        tracking: {
          originalPrice: 999,
          currentPrice: 999,
          currency: 'USD'
        },
        sources: [{
          name: 'Apple Store',
          url: 'https://apple.com/iphone',
          domain: 'apple.com',
          price: 999
        }]
      };

      const item = new WishlistItem(itemData);
      const savedItem = await item.save();

      expect(savedItem.product.name).toBe('iPhone 15 Pro');
      expect(savedItem.product.brand).toBe('Apple');
      expect(savedItem.tracking.originalPrice).toBe(999);
      expect(savedItem.tracking.currentPrice).toBe(999);
      expect(savedItem.status).toBe('active');
      expect(savedItem.alerts.enabled).toBe(true);
      expect(savedItem.sources).toHaveLength(1);
    });

    test('should fail to create item without required fields', async () => {
      const item = new WishlistItem({});
      await expect(item.save()).rejects.toThrow();
    });

    test('should set default values correctly', async () => {
      const itemData = {
        userId: testUser._id,
        product: {
          name: 'Test Product'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 100
        }
      };

      const item = await WishlistItem.create(itemData);

      expect(item.status).toBe('active');
      expect(item.tracking.currency).toBe('USD');
      expect(item.tracking.checkFrequency).toBe('daily');
      expect(item.tracking.isTracking).toBe(true);
      expect(item.alerts.enabled).toBe(true);
      expect(item.alerts.priceDropThreshold).toBe(10);
      expect(item.metadata.addedFrom).toBe('manual');
      expect(item.metadata.platform).toBe('web');
      expect(item.metadata.priority).toBe('medium');
    });

    test('should validate image URLs', async () => {
      const itemData = {
        userId: testUser._id,
        product: {
          name: 'Test Product',
          image: 'invalid-url'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 100
        }
      };

      const item = new WishlistItem(itemData);
      await expect(item.save()).rejects.toThrow();
    });
  });

  describe('Virtual Properties', () => {
    let item;

    beforeEach(async () => {
      item = await WishlistItem.create({
        userId: testUser._id,
        product: {
          name: 'Test Product'
        },
        tracking: {
          originalPrice: 100,
          currentPrice: 80
        }
      });
    });

    test('should calculate price change percentage correctly', () => {
      expect(item.priceChangePercentage).toBe(-20); // 20% decrease
    });

    test('should calculate savings amount correctly', () => {
      expect(item.savingsAmount).toBe(20);
    });

    test('should check if price has dropped', () => {
      expect(item.hasPriceDropped).toBe(true);
    });

    test('should check if target price is met', async () => {
      item.alerts.targetPrice = 85;
      await item.save();
      
      expect(item.isTargetPriceMet).toBe(true);
      
      item.alerts.targetPrice = 75;
      await item.save();
      
      expect(item.isTargetPriceMet).toBe(false);
    });

    test('should check if price drop threshold is met', async () => {
      item.alerts.priceDropThreshold = 15;
      await item.save();
      
      expect(item.isPriceDropThresholdMet).toBe(true); // 20% > 15%
      
      item.alerts.priceDropThreshold = 25;
      await item.save();
      
      expect(item.isPriceDropThresholdMet).toBe(false); // 20% < 25%
    });
  });

  describe('Pre-save Middleware', () => {
    test('should update lowest and highest prices', async () => {
      const item = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Test Product' },
        tracking: {
          originalPrice: 100,
          currentPrice: 100
        }
      });

      expect(item.tracking.lowestPrice).toBe(100);
      expect(item.tracking.highestPrice).toBe(100);

      // Update to lower price
      item.tracking.currentPrice = 80;
      await item.save();

      expect(item.tracking.lowestPrice).toBe(80);
      expect(item.tracking.highestPrice).toBe(100);

      // Update to higher price
      item.tracking.currentPrice = 120;
      await item.save();

      expect(item.tracking.lowestPrice).toBe(80);
      expect(item.tracking.highestPrice).toBe(120);
    });

    test('should limit price history to 100 entries', async () => {
      const item = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Test Product' },
        tracking: {
          originalPrice: 100,
          currentPrice: 100,
          priceHistory: Array(105).fill().map((_, i) => ({
            price: 100 + i,
            source: 'test',
            recordedAt: new Date()
          }))
        }
      });

      expect(item.tracking.priceHistory).toHaveLength(100);
    });
  });

  describe('Instance Methods', () => {
    let item;

    beforeEach(async () => {
      item = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Test Product' },
        tracking: {
          originalPrice: 100,
          currentPrice: 100
        }
      });
    });

    test('should add price history entry', async () => {
      await item.addPriceHistory({
        price: 90,
        source: 'Amazon',
        url: 'https://amazon.com/product',
        availability: 'in_stock'
      });

      expect(item.tracking.priceHistory).toHaveLength(1);
      expect(item.tracking.priceHistory[0].price).toBe(90);
      expect(item.tracking.priceHistory[0].source).toBe('Amazon');
      expect(item.tracking.currentPrice).toBe(90);
    });

    test('should update price and return alert info', async () => {
      const result = await item.updatePrice(80, 'Amazon');

      expect(result.oldPrice).toBe(100);
      expect(result.newPrice).toBe(80);
      expect(result.shouldAlert).toBe(true); // 20% drop > 10% threshold
      expect(item.tracking.currentPrice).toBe(80);
    });

    test('should check if alert should be triggered', () => {
      // Test price drop threshold
      item.alerts.priceDropThreshold = 15;
      expect(item.shouldTriggerAlert(100, 80)).toBe(true); // 20% drop

      item.alerts.priceDropThreshold = 25;
      expect(item.shouldTriggerAlert(100, 80)).toBe(false); // 20% drop < 25%

      // Test target price
      item.alerts.targetPrice = 85;
      expect(item.shouldTriggerAlert(100, 80)).toBe(true); // 80 <= 85

      item.alerts.targetPrice = 75;
      expect(item.shouldTriggerAlert(100, 80)).toBe(false); // 80 > 75
    });

    test('should mark as purchased', async () => {
      await item.markAsPurchased(95);

      expect(item.status).toBe('purchased');
      expect(item.purchasePrice).toBe(95);
      expect(item.purchasedAt).toBeDefined();
      expect(item.tracking.isTracking).toBe(false);
    });

    test('should add source', async () => {
      await item.addSource({
        name: 'Best Buy',
        url: 'https://bestbuy.com/product',
        domain: 'bestbuy.com',
        price: 95,
        availability: 'in_stock'
      });

      expect(item.sources).toHaveLength(1);
      expect(item.sources[0].name).toBe('Best Buy');
      expect(item.sources[0].domain).toBe('bestbuy.com');
      expect(item.sources[0].price).toBe(95);
    });

    test('should update existing source', async () => {
      await item.addSource({
        name: 'Amazon',
        url: 'https://amazon.com/product',
        domain: 'amazon.com',
        price: 100
      });

      await item.addSource({
        name: 'Amazon',
        url: 'https://amazon.com/product',
        domain: 'amazon.com',
        price: 90
      });

      expect(item.sources).toHaveLength(1);
      expect(item.sources[0].price).toBe(90);
    });

    test('should remove source', async () => {
      await item.addSource({
        name: 'Amazon',
        url: 'https://amazon.com/product',
        domain: 'amazon.com',
        price: 100
      });

      await item.removeSource('amazon.com');

      expect(item.sources).toHaveLength(0);
    });
  });

  describe('Static Methods', () => {
    beforeEach(async () => {
      await WishlistItem.create([
        {
          userId: testUser._id,
          product: { name: 'Product 1', category: 'electronics' },
          tracking: { originalPrice: 100, currentPrice: 90 },
          metadata: { priority: 'high', tags: ['smartphone'] },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 2', category: 'clothing' },
          tracking: { originalPrice: 50, currentPrice: 45 },
          metadata: { priority: 'medium' },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 3', category: 'electronics' },
          tracking: { originalPrice: 200, currentPrice: 180 },
          status: 'purchased'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 4' },
          tracking: { originalPrice: 75, currentPrice: 75 },
          status: 'active'
        },
        {
          userId: testUser._id,
          product: { name: 'Product 5' },
          tracking: { originalPrice: 60, currentPrice: 55 },
          status: 'removed'
        }
      ]);
    });

    test('should get user wishlist with default filters', async () => {
      const items = await WishlistItem.getUserWishlist(testUser._id);
      
      expect(items).toHaveLength(4); // Excludes removed items
      expect(items[0].product.name).toBe('Product 1'); // Most recent first
    });

    test('should filter by status', async () => {
      const activeItems = await WishlistItem.getUserWishlist(testUser._id, { status: 'active' });
      expect(activeItems).toHaveLength(3);

      const purchasedItems = await WishlistItem.getUserWishlist(testUser._id, { status: 'purchased' });
      expect(purchasedItems).toHaveLength(1);
    });

    test('should filter by category', async () => {
      const electronicsItems = await WishlistItem.getUserWishlist(testUser._id, { category: 'electronics' });
      expect(electronicsItems).toHaveLength(2);
    });

    test('should filter by tags', async () => {
      const taggedItems = await WishlistItem.getUserWishlist(testUser._id, { tags: ['smartphone'] });
      expect(taggedItems).toHaveLength(1);
    });

    test('should filter by priority', async () => {
      const highPriorityItems = await WishlistItem.getUserWishlist(testUser._id, { priority: 'high' });
      expect(highPriorityItems).toHaveLength(1);
    });

    test('should filter by price range', async () => {
      const priceRangeItems = await WishlistItem.getUserWishlist(testUser._id, { 
        priceRange: { min: 50, max: 100 } 
      });
      expect(priceRangeItems).toHaveLength(2); // Products with prices 90 and 75
    });

    test('should sort by different criteria', async () => {
      const priceLowItems = await WishlistItem.getUserWishlist(testUser._id, { sortBy: 'price_low' });
      expect(priceLowItems[0].tracking.currentPrice).toBe(45); // Lowest price first

      const priceHighItems = await WishlistItem.getUserWishlist(testUser._id, { sortBy: 'price_high' });
      expect(priceHighItems[0].tracking.currentPrice).toBe(180); // Highest price first
    });

    test('should get items needing price updates', async () => {
      // Create items with different check frequencies and last checked times
      const hourlyItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Hourly Product' },
        tracking: {
          originalPrice: 100,
          currentPrice: 100,
          checkFrequency: 'hourly',
          lastChecked: new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
        }
      });

      const dailyItem = await WishlistItem.create({
        userId: testUser._id,
        product: { name: 'Daily Product' },
        tracking: {
          originalPrice: 100,
          currentPrice: 100,
          checkFrequency: 'daily',
          lastChecked: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
        }
      });

      const itemsToUpdate = await WishlistItem.getItemsForPriceUpdate();
      const itemNames = itemsToUpdate.map(item => item.product.name);
      
      expect(itemNames).toContain('Hourly Product');
      expect(itemNames).toContain('Daily Product');
    });

    test('should get wishlist statistics', async () => {
      const stats = await WishlistItem.getUserWishlistStats(testUser._id);
      
      expect(stats).toHaveLength(1);
      expect(stats[0].totalItems).toBe(5);
      expect(stats[0].stats).toHaveLength(3); // active, purchased, removed
    });
  });
});