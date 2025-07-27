const ProductIdentificationService = require('../services/productIdentificationService');
const WishlistItem = require('../models/WishlistItem');
const Logger = require('../utils/logger');

class ProductController {
  // Scan barcode and identify product
  static async scanBarcode(req, res) {
    try {
      const { barcode } = req.body;

      if (!barcode) {
        return res.status(400).json({
          error: {
            code: 'BARCODE_REQUIRED',
            message: 'Barcode is required'
          }
        });
      }

      // Identify product by barcode
      const product = await ProductIdentificationService.identifyByBarcode(barcode);

      Logger.info('Barcode scan completed', {
        barcode,
        productName: product.name,
        confidence: product.confidence,
        userId: req.user?.userId
      });

      res.json({
        success: true,
        product: {
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          images: product.images,
          specifications: product.specifications
        },
        pricing: {
          sources: product.pricing.sources,
          lowestPrice: product.pricing.lowestPrice,
          highestPrice: product.pricing.highestPrice,
          averagePrice: product.pricing.averagePrice,
          currency: product.pricing.currency,
          checkedAt: product.pricing.checkedAt
        },
        metadata: {
          confidence: product.confidence,
          identifiedAt: product.identifiedAt,
          source: product.source
        }
      });
    } catch (error) {
      Logger.error('Barcode scan failed', {
        barcode: req.body.barcode,
        error: error.message,
        userId: req.user?.userId
      });

      if (error.message.includes('Invalid barcode format')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_BARCODE',
            message: 'Invalid barcode format. Please ensure the barcode is 8, 12, or 13 digits.'
          }
        });
      }

      if (error.message.includes('Product not found')) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found in our databases. You can still add it manually to your wishlist.'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'SCAN_FAILED',
          message: 'Failed to scan barcode'
        }
      });
    }
  }

  // Get price comparison for a product
  static async getPriceComparison(req, res) {
    try {
      const { productId } = req.params;

      // Find product in wishlist or identify by barcode
      let product;
      
      if (productId.match(/^[0-9a-fA-F]{24}$/)) {
        // MongoDB ObjectId - lookup in wishlist
        const wishlistItem = await WishlistItem.findById(productId);
        
        if (!wishlistItem) {
          return res.status(404).json({
            error: {
              code: 'PRODUCT_NOT_FOUND',
              message: 'Product not found'
            }
          });
        }

        // Get fresh price data
        const priceData = await ProductIdentificationService.getPriceInformation({
          barcode: wishlistItem.product.barcode,
          name: wishlistItem.product.name,
          category: wishlistItem.product.category
        });

        product = {
          id: wishlistItem._id,
          barcode: wishlistItem.product.barcode,
          name: wishlistItem.product.name,
          brand: wishlistItem.product.brand,
          category: wishlistItem.product.category,
          image: wishlistItem.product.image,
          pricing: priceData
        };
      } else {
        // Assume it's a barcode
        const identifiedProduct = await ProductIdentificationService.identifyByBarcode(productId);
        product = {
          barcode: identifiedProduct.barcode,
          name: identifiedProduct.name,
          brand: identifiedProduct.brand,
          category: identifiedProduct.category,
          image: identifiedProduct.images?.[0],
          pricing: identifiedProduct.pricing
        };
      }

      // Calculate savings opportunities
      const savings = this.calculateSavings(product.pricing);

      Logger.info('Price comparison retrieved', {
        productId,
        productName: product.name,
        sourceCount: product.pricing.sources.length,
        userId: req.user?.userId
      });

      res.json({
        product: {
          id: product.id,
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          category: product.category,
          image: product.image
        },
        pricing: {
          sources: product.pricing.sources.map(source => ({
            name: source.source,
            domain: source.domain,
            price: source.price,
            currency: source.currency,
            availability: source.availability,
            url: source.url,
            lastChecked: source.lastChecked
          })),
          summary: {
            lowestPrice: product.pricing.lowestPrice,
            highestPrice: product.pricing.highestPrice,
            averagePrice: Math.round(product.pricing.averagePrice * 100) / 100,
            currency: product.pricing.currency,
            sourceCount: product.pricing.sources.length
          },
          savings: savings,
          checkedAt: product.pricing.checkedAt
        }
      });
    } catch (error) {
      Logger.error('Price comparison failed', {
        productId: req.params.productId,
        error: error.message,
        userId: req.user?.userId
      });

      if (error.message.includes('Invalid barcode format')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_PRODUCT_ID',
            message: 'Invalid product ID or barcode format'
          }
        });
      }

      if (error.message.includes('Product not found')) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'PRICE_COMPARISON_FAILED',
          message: 'Failed to get price comparison'
        }
      });
    }
  }

  // Search products
  static async searchProducts(req, res) {
    try {
      const { 
        query, 
        category, 
        minPrice, 
        maxPrice, 
        limit = 10 
      } = req.query;

      if (!query || query.trim().length < 2) {
        return res.status(400).json({
          error: {
            code: 'INVALID_QUERY',
            message: 'Search query must be at least 2 characters long'
          }
        });
      }

      const searchOptions = {
        limit: Math.min(parseInt(limit) || 10, 50),
        category,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined
      };

      const searchResults = await ProductIdentificationService.searchProducts(
        query.trim(), 
        searchOptions
      );

      Logger.info('Product search completed', {
        query,
        resultCount: searchResults.results.length,
        userId: req.user?.userId
      });

      res.json({
        query: searchResults.query,
        results: searchResults.results.map(product => ({
          barcode: product.barcode,
          name: product.name,
          brand: product.brand,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          image: product.images?.[0],
          pricing: {
            lowestPrice: product.pricing.lowestPrice,
            highestPrice: product.pricing.highestPrice,
            averagePrice: Math.round(product.pricing.averagePrice * 100) / 100,
            currency: product.pricing.currency,
            sourceCount: product.pricing.sources.length
          },
          confidence: product.confidence
        })),
        pagination: {
          total: searchResults.total,
          limit: searchOptions.limit,
          hasMore: searchResults.total > searchOptions.limit
        },
        filters: {
          category,
          minPrice,
          maxPrice
        },
        searchedAt: searchResults.searchedAt
      });
    } catch (error) {
      Logger.error('Product search failed', {
        query: req.query.query,
        error: error.message,
        userId: req.user?.userId
      });

      res.status(500).json({
        error: {
          code: 'SEARCH_FAILED',
          message: 'Failed to search products'
        }
      });
    }
  }

  // Track price for a product (add to wishlist)
  static async trackPrice(req, res) {
    try {
      const { 
        barcode, 
        targetPrice, 
        priceDropThreshold = 10 
      } = req.body;
      const userId = req.user.userId;

      if (!barcode) {
        return res.status(400).json({
          error: {
            code: 'BARCODE_REQUIRED',
            message: 'Barcode is required to track price'
          }
        });
      }

      // Check if item already exists in user's wishlist
      const existingItem = await WishlistItem.findOne({
        userId,
        'product.barcode': barcode,
        status: { $ne: 'removed' }
      });

      if (existingItem) {
        return res.status(409).json({
          error: {
            code: 'ALREADY_TRACKING',
            message: 'Product is already being tracked in your wishlist',
            existingItemId: existingItem._id
          }
        });
      }

      // Identify the product
      const product = await ProductIdentificationService.identifyByBarcode(barcode);

      // Create wishlist item for price tracking
      const wishlistItem = await WishlistItem.create({
        userId,
        product: {
          name: product.name,
          brand: product.brand,
          barcode: product.barcode,
          category: product.category,
          subcategory: product.subcategory,
          description: product.description,
          image: product.images?.[0],
          images: product.images || []
        },
        tracking: {
          originalPrice: product.pricing.lowestPrice || product.pricing.averagePrice || 0,
          currentPrice: product.pricing.lowestPrice || product.pricing.averagePrice || 0,
          currency: product.pricing.currency,
          isTracking: true,
          checkFrequency: 'daily'
        },
        alerts: {
          enabled: true,
          priceDropThreshold,
          targetPrice,
          emailAlerts: true,
          pushAlerts: true
        },
        sources: product.pricing.sources.map(source => ({
          name: source.source,
          url: source.url,
          domain: source.domain,
          price: source.price,
          availability: source.availability
        })),
        metadata: {
          addedFrom: 'price_tracking',
          platform: 'web'
        }
      });

      Logger.info('Price tracking started', {
        itemId: wishlistItem._id,
        barcode,
        productName: product.name,
        targetPrice,
        userId
      });

      res.status(201).json({
        message: 'Price tracking started successfully',
        item: {
          id: wishlistItem._id,
          product: {
            name: wishlistItem.product.name,
            brand: wishlistItem.product.brand,
            barcode: wishlistItem.product.barcode,
            image: wishlistItem.product.image
          },
          pricing: {
            currentPrice: wishlistItem.tracking.currentPrice,
            currency: wishlistItem.tracking.currency
          },
          alerts: {
            targetPrice: wishlistItem.alerts.targetPrice,
            priceDropThreshold: wishlistItem.alerts.priceDropThreshold
          },
          tracking: {
            isTracking: wishlistItem.tracking.isTracking,
            checkFrequency: wishlistItem.tracking.checkFrequency
          }
        }
      });
    } catch (error) {
      Logger.error('Price tracking setup failed', {
        barcode: req.body.barcode,
        error: error.message,
        userId: req.user.userId
      });

      if (error.message.includes('Invalid barcode format')) {
        return res.status(400).json({
          error: {
            code: 'INVALID_BARCODE',
            message: 'Invalid barcode format'
          }
        });
      }

      if (error.message.includes('Product not found')) {
        return res.status(404).json({
          error: {
            code: 'PRODUCT_NOT_FOUND',
            message: 'Product not found. Cannot start price tracking.'
          }
        });
      }

      res.status(500).json({
        error: {
          code: 'TRACKING_SETUP_FAILED',
          message: 'Failed to set up price tracking'
        }
      });
    }
  }

  // Get product identification service statistics
  static async getServiceStats(req, res) {
    try {
      const stats = await ProductIdentificationService.getStats();

      res.json({
        service: 'Product Identification Service',
        statistics: stats,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Get service stats failed', { error: error.message });

      res.status(500).json({
        error: {
          code: 'STATS_FAILED',
          message: 'Failed to retrieve service statistics'
        }
      });
    }
  }

  // Clear product identification cache (admin)
  static async clearCache(req, res) {
    try {
      const result = await ProductIdentificationService.clearCache();

      Logger.info('Product identification cache cleared', {
        keysCleared: result.keysCleared,
        adminUserId: req.user.userId
      });

      res.json({
        message: 'Cache cleared successfully',
        keysCleared: result.keysCleared,
        clearedAt: new Date().toISOString()
      });
    } catch (error) {
      Logger.error('Clear cache failed', {
        error: error.message,
        adminUserId: req.user.userId
      });

      res.status(500).json({
        error: {
          code: 'CLEAR_CACHE_FAILED',
          message: 'Failed to clear cache'
        }
      });
    }
  }

  // Helper method to calculate savings opportunities
  static calculateSavings(pricing) {
    if (!pricing.sources || pricing.sources.length < 2) {
      return {
        maxSavings: 0,
        savingsPercentage: 0,
        bestSource: null,
        worstSource: null
      };
    }

    const availableSources = pricing.sources.filter(s => s.availability === 'in_stock');
    
    if (availableSources.length === 0) {
      return {
        maxSavings: 0,
        savingsPercentage: 0,
        bestSource: null,
        worstSource: null,
        note: 'No sources currently in stock'
      };
    }

    const prices = availableSources.map(s => s.price);
    const lowestPrice = Math.min(...prices);
    const highestPrice = Math.max(...prices);
    
    const bestSource = availableSources.find(s => s.price === lowestPrice);
    const worstSource = availableSources.find(s => s.price === highestPrice);
    
    const maxSavings = highestPrice - lowestPrice;
    const savingsPercentage = highestPrice > 0 ? (maxSavings / highestPrice) * 100 : 0;

    return {
      maxSavings: Math.round(maxSavings * 100) / 100,
      savingsPercentage: Math.round(savingsPercentage * 100) / 100,
      bestSource: {
        name: bestSource.source,
        domain: bestSource.domain,
        price: bestSource.price,
        url: bestSource.url
      },
      worstSource: {
        name: worstSource.source,
        domain: worstSource.domain,
        price: worstSource.price,
        url: worstSource.url
      }
    };
  }
}

module.exports = ProductController;