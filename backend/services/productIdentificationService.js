const Logger = require('../utils/logger');
const { getRedisClient } = require('../config/redis');

class ProductIdentificationService {
  constructor() {
    this.cache = getRedisClient();
    this.cachePrefix = 'product:';
    this.cacheTTL = 24 * 60 * 60; // 24 hours
  }

  // Main barcode lookup function
  async identifyByBarcode(barcode) {
    try {
      // Validate barcode format
      if (!this.isValidBarcode(barcode)) {
        throw new Error('Invalid barcode format');
      }

      // Check cache first
      const cacheKey = `${this.cachePrefix}barcode:${barcode}`;
      const cachedResult = await this.getCachedResult(cacheKey);
      
      if (cachedResult) {
        Logger.info('Product identification cache hit', { barcode });
        return cachedResult;
      }

      // Try multiple data sources
      const sources = [
        () => this.lookupUPCDatabase(barcode),
        () => this.lookupOpenFoodFacts(barcode),
        () => this.lookupBarcodeSpider(barcode),
        () => this.lookupMockDatabase(barcode) // Fallback mock for testing
      ];

      let productData = null;
      let lastError = null;

      for (const source of sources) {
        try {
          productData = await source();
          if (productData) {
            break;
          }
        } catch (error) {
          lastError = error;
          Logger.warn('Product lookup source failed', { 
            barcode, 
            error: error.message 
          });
        }
      }

      if (!productData) {
        throw new Error(lastError?.message || 'Product not found in any database');
      }

      // Normalize and enrich product data
      const normalizedProduct = this.normalizeProductData(productData);
      
      // Get price information from multiple sources
      const priceData = await this.getPriceInformation(normalizedProduct);
      
      const result = {
        ...normalizedProduct,
        pricing: priceData,
        identifiedAt: new Date().toISOString(),
        confidence: this.calculateConfidence(normalizedProduct)
      };

      // Cache the result
      await this.cacheResult(cacheKey, result);

      Logger.info('Product identified successfully', { 
        barcode, 
        productName: result.name,
        confidence: result.confidence 
      });

      return result;
    } catch (error) {
      Logger.error('Product identification failed', { 
        barcode, 
        error: error.message 
      });
      throw error;
    }
  }

  // Identify product by image (future enhancement)
  async identifyByImage(imageUrl) {
    try {
      // This would integrate with image recognition services like Google Vision API
      // For now, return a mock response
      Logger.info('Image identification requested', { imageUrl });
      
      throw new Error('Image identification not yet implemented');
    } catch (error) {
      Logger.error('Image identification failed', { 
        imageUrl, 
        error: error.message 
      });
      throw error;
    }
  }

  // Search products by name/description
  async searchProducts(query, options = {}) {
    try {
      const { limit = 10, category, minPrice, maxPrice } = options;
      
      // Check cache for search results
      const cacheKey = `${this.cachePrefix}search:${JSON.stringify({ query, options })}`;
      const cachedResults = await this.getCachedResult(cacheKey);
      
      if (cachedResults) {
        Logger.info('Product search cache hit', { query });
        return cachedResults;
      }

      // Search multiple sources
      const searchResults = await Promise.allSettled([
        this.searchUPCDatabase(query, options),
        this.searchOpenFoodFacts(query, options),
        this.searchMockDatabase(query, options)
      ]);

      // Combine and deduplicate results
      const allResults = [];
      searchResults.forEach(result => {
        if (result.status === 'fulfilled' && result.value) {
          allResults.push(...result.value);
        }
      });

      // Remove duplicates based on barcode or name similarity
      const uniqueResults = this.deduplicateProducts(allResults);
      
      // Sort by relevance and apply filters
      const filteredResults = this.filterAndSortResults(uniqueResults, query, options);
      
      // Limit results
      const limitedResults = filteredResults.slice(0, limit);

      // Get price information for each result
      const resultsWithPricing = await Promise.all(
        limitedResults.map(async (product) => {
          const priceData = await this.getPriceInformation(product);
          return {
            ...product,
            pricing: priceData,
            confidence: this.calculateConfidence(product)
          };
        })
      );

      const result = {
        query,
        results: resultsWithPricing,
        total: resultsWithPricing.length,
        searchedAt: new Date().toISOString()
      };

      // Cache search results for 1 hour
      await this.cacheResult(cacheKey, result, 3600);

      Logger.info('Product search completed', { 
        query, 
        resultCount: resultsWithPricing.length 
      });

      return result;
    } catch (error) {
      Logger.error('Product search failed', { 
        query, 
        error: error.message 
      });
      throw error;
    }
  }

  // UPC Database lookup
  async lookupUPCDatabase(barcode) {
    try {
      // Mock implementation - replace with actual UPC database API
      // Example: UPCitemdb.com, UPC Database API, etc.
      
      const mockResponse = {
        barcode,
        name: `Product for ${barcode}`,
        brand: 'Sample Brand',
        category: 'Electronics',
        description: 'Sample product description',
        images: [`https://via.placeholder.com/300x300?text=${barcode}`],
        specifications: {
          weight: '1.5 lbs',
          dimensions: '10x8x2 inches'
        }
      };

      // Simulate API delay
      await this.delay(100 + Math.random() * 200);
      
      // Simulate 70% success rate
      if (Math.random() > 0.3) {
        return mockResponse;
      }
      
      return null;
    } catch (error) {
      Logger.warn('UPC Database lookup failed', { barcode, error: error.message });
      return null;
    }
  }

  // Open Food Facts lookup (for food products)
  async lookupOpenFoodFacts(barcode) {
    try {
      // Mock implementation - replace with actual Open Food Facts API
      // https://world.openfoodfacts.org/api/v0/product/{barcode}.json
      
      if (!barcode.startsWith('0') && !barcode.startsWith('3')) {
        return null; // Not a food product barcode pattern
      }

      const mockResponse = {
        barcode,
        name: `Food Product ${barcode}`,
        brand: 'Food Brand',
        category: 'Food & Beverages',
        description: 'Nutritious food product',
        images: [`https://via.placeholder.com/300x300?text=Food-${barcode}`],
        specifications: {
          nutrition: 'Per 100g: 250 kcal',
          ingredients: 'Sample ingredients list'
        }
      };

      await this.delay(150 + Math.random() * 100);
      
      if (Math.random() > 0.4) {
        return mockResponse;
      }
      
      return null;
    } catch (error) {
      Logger.warn('Open Food Facts lookup failed', { barcode, error: error.message });
      return null;
    }
  }

  // Barcode Spider lookup
  async lookupBarcodeSpider(barcode) {
    try {
      // Mock implementation - replace with actual Barcode Spider API
      
      const mockResponse = {
        barcode,
        name: `Spider Product ${barcode}`,
        brand: 'Spider Brand',
        category: 'General',
        description: 'Product from barcode spider database',
        images: [`https://via.placeholder.com/300x300?text=Spider-${barcode}`]
      };

      await this.delay(200 + Math.random() * 150);
      
      if (Math.random() > 0.5) {
        return mockResponse;
      }
      
      return null;
    } catch (error) {
      Logger.warn('Barcode Spider lookup failed', { barcode, error: error.message });
      return null;
    }
  }

  // Mock database lookup (for testing)
  async lookupMockDatabase(barcode) {
    const mockProducts = {
      '123456789012': {
        barcode: '123456789012',
        name: 'iPhone 15 Pro',
        brand: 'Apple',
        category: 'Electronics',
        subcategory: 'Smartphones',
        description: 'Latest iPhone with advanced features',
        images: ['https://via.placeholder.com/300x300?text=iPhone-15-Pro'],
        specifications: {
          storage: '128GB',
          color: 'Natural Titanium',
          display: '6.1-inch Super Retina XDR'
        }
      },
      '987654321098': {
        barcode: '987654321098',
        name: 'MacBook Pro 14"',
        brand: 'Apple',
        category: 'Electronics',
        subcategory: 'Laptops',
        description: 'Professional laptop with M3 chip',
        images: ['https://via.placeholder.com/300x300?text=MacBook-Pro'],
        specifications: {
          processor: 'Apple M3',
          memory: '16GB',
          storage: '512GB SSD'
        }
      }
    };

    await this.delay(50);
    return mockProducts[barcode] || null;
  }

  // Search implementations for each source
  async searchUPCDatabase(query, options) {
    // Mock search implementation
    const mockResults = [
      {
        barcode: '111111111111',
        name: `Search Result 1 for "${query}"`,
        brand: 'Search Brand 1',
        category: 'Electronics',
        description: `Product matching ${query}`,
        images: ['https://via.placeholder.com/300x300?text=Search-1']
      },
      {
        barcode: '222222222222',
        name: `Search Result 2 for "${query}"`,
        brand: 'Search Brand 2',
        category: 'Electronics',
        description: `Another product matching ${query}`,
        images: ['https://via.placeholder.com/300x300?text=Search-2']
      }
    ];

    await this.delay(100);
    return mockResults;
  }

  async searchOpenFoodFacts(query, options) {
    // Mock food search
    if (options.category && !options.category.toLowerCase().includes('food')) {
      return [];
    }

    const mockResults = [
      {
        barcode: '333333333333',
        name: `Food "${query}"`,
        brand: 'Food Brand',
        category: 'Food & Beverages',
        description: `Food product containing ${query}`,
        images: ['https://via.placeholder.com/300x300?text=Food-Search']
      }
    ];

    await this.delay(150);
    return mockResults;
  }

  async searchMockDatabase(query, options) {
    const mockResults = [
      {
        barcode: '444444444444',
        name: `Mock "${query}" Product`,
        brand: 'Mock Brand',
        category: 'General',
        description: `Mock product for ${query}`,
        images: ['https://via.placeholder.com/300x300?text=Mock-Search']
      }
    ];

    await this.delay(75);
    return mockResults;
  }

  // Get price information from multiple sources
  async getPriceInformation(product) {
    try {
      // Mock price lookup from multiple retailers
      const sources = [
        { name: 'Amazon', domain: 'amazon.com' },
        { name: 'Walmart', domain: 'walmart.com' },
        { name: 'Best Buy', domain: 'bestbuy.com' },
        { name: 'Target', domain: 'target.com' }
      ];

      const pricePromises = sources.map(async (source) => {
        try {
          // Mock price fetching
          await this.delay(50 + Math.random() * 100);
          
          // Generate realistic price based on product category
          const basePrice = this.generateBasePrice(product.category);
          const variation = (Math.random() - 0.5) * 0.3; // ±15% variation
          const price = Math.max(1, basePrice * (1 + variation));
          
          return {
            source: source.name,
            domain: source.domain,
            price: Math.round(price * 100) / 100,
            currency: 'USD',
            availability: Math.random() > 0.1 ? 'in_stock' : 'out_of_stock',
            url: `https://${source.domain}/product/${product.barcode}`,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          return null;
        }
      });

      const priceResults = await Promise.allSettled(pricePromises);
      const validPrices = priceResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value);

      if (validPrices.length === 0) {
        return {
          sources: [],
          lowestPrice: null,
          highestPrice: null,
          averagePrice: null,
          currency: 'USD'
        };
      }

      const prices = validPrices.map(p => p.price);
      
      return {
        sources: validPrices,
        lowestPrice: Math.min(...prices),
        highestPrice: Math.max(...prices),
        averagePrice: prices.reduce((sum, price) => sum + price, 0) / prices.length,
        currency: 'USD',
        checkedAt: new Date().toISOString()
      };
    } catch (error) {
      Logger.warn('Price information lookup failed', { 
        productName: product.name,
        error: error.message 
      });
      
      return {
        sources: [],
        lowestPrice: null,
        highestPrice: null,
        averagePrice: null,
        currency: 'USD',
        error: error.message
      };
    }
  }

  // Utility methods
  isValidBarcode(barcode) {
    // Support UPC-A (12 digits), EAN-13 (13 digits), and EAN-8 (8 digits)
    return /^[0-9]{8}$|^[0-9]{12}$|^[0-9]{13}$/.test(barcode);
  }

  normalizeProductData(rawData) {
    return {
      barcode: rawData.barcode,
      name: rawData.name?.trim(),
      brand: rawData.brand?.trim(),
      category: rawData.category?.toLowerCase().trim(),
      subcategory: rawData.subcategory?.toLowerCase().trim(),
      description: rawData.description?.trim(),
      images: Array.isArray(rawData.images) ? rawData.images : [rawData.images].filter(Boolean),
      specifications: rawData.specifications || {},
      source: rawData.source || 'unknown'
    };
  }

  calculateConfidence(product) {
    let confidence = 0.5; // Base confidence
    
    if (product.name) confidence += 0.2;
    if (product.brand) confidence += 0.1;
    if (product.description) confidence += 0.1;
    if (product.images && product.images.length > 0) confidence += 0.1;
    if (product.specifications && Object.keys(product.specifications).length > 0) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  deduplicateProducts(products) {
    const seen = new Set();
    const unique = [];
    
    for (const product of products) {
      const key = product.barcode || product.name?.toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        unique.push(product);
      }
    }
    
    return unique;
  }

  filterAndSortResults(products, query, options) {
    let filtered = products;
    
    // Filter by category
    if (options.category) {
      filtered = filtered.filter(p => 
        p.category?.toLowerCase().includes(options.category.toLowerCase())
      );
    }
    
    // Sort by relevance (name match score)
    filtered.sort((a, b) => {
      const scoreA = this.calculateRelevanceScore(a, query);
      const scoreB = this.calculateRelevanceScore(b, query);
      return scoreB - scoreA;
    });
    
    return filtered;
  }

  calculateRelevanceScore(product, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    if (product.name?.toLowerCase().includes(queryLower)) score += 10;
    if (product.brand?.toLowerCase().includes(queryLower)) score += 5;
    if (product.description?.toLowerCase().includes(queryLower)) score += 3;
    
    return score;
  }

  generateBasePrice(category) {
    const categoryPrices = {
      'electronics': 299,
      'food & beverages': 15,
      'clothing': 49,
      'books': 19,
      'home & garden': 79,
      'toys': 29,
      'sports': 89,
      'automotive': 149,
      'health': 39,
      'beauty': 25
    };
    
    return categoryPrices[category?.toLowerCase()] || 50;
  }

  async getCachedResult(key) {
    try {
      const cached = await this.cache.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      Logger.warn('Cache read failed', { key, error: error.message });
      return null;
    }
  }

  async cacheResult(key, data, ttl = this.cacheTTL) {
    try {
      await this.cache.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      Logger.warn('Cache write failed', { key, error: error.message });
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get service statistics
  async getStats() {
    try {
      const keys = await this.cache.keys(`${this.cachePrefix}*`);
      
      return {
        cachedProducts: keys.filter(k => k.includes('barcode:')).length,
        cachedSearches: keys.filter(k => k.includes('search:')).length,
        totalCacheEntries: keys.length,
        cachePrefix: this.cachePrefix,
        cacheTTL: this.cacheTTL
      };
    } catch (error) {
      Logger.error('Failed to get service stats', { error: error.message });
      return {
        cachedProducts: 0,
        cachedSearches: 0,
        totalCacheEntries: 0,
        error: error.message
      };
    }
  }

  // Clear cache
  async clearCache() {
    try {
      const keys = await this.cache.keys(`${this.cachePrefix}*`);
      if (keys.length > 0) {
        await this.cache.del(...keys);
      }
      
      Logger.info('Product identification cache cleared', { keysCleared: keys.length });
      return { keysCleared: keys.length };
    } catch (error) {
      Logger.error('Failed to clear cache', { error: error.message });
      throw error;
    }
  }
}

// Export singleton instance
module.exports = new ProductIdentificationService();