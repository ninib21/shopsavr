// ShopSavr Site-Specific Detection and Automation
// Contains site-specific logic for major e-commerce platforms

class SiteDetectors {
  constructor() {
    this.detectors = {
      'amazon.com': new AmazonDetector(),
      'walmart.com': new WalmartDetector(),
      'target.com': new TargetDetector(),
      'bestbuy.com': new BestBuyDetector(),
      'ebay.com': new EbayDetector(),
      'etsy.com': new EtsyDetector(),
      'macys.com': new MacysDetector(),
      'nordstrom.com': new NordstromDetector(),
      'kohls.com': new KohlsDetector(),
      'jcpenney.com': new JCPenneyDetector()
    };
  }

  getDetector(domain) {
    // Find matching detector
    for (const [siteDomain, detector] of Object.entries(this.detectors)) {
      if (domain.includes(siteDomain)) {
        return detector;
      }
    }
    return new GenericDetector();
  }

  isCheckoutPage(url, domain) {
    const detector = this.getDetector(domain);
    return detector.isCheckoutPage(url);
  }

  isProductPage(domain) {
    const detector = this.getDetector(domain);
    return detector.isProductPage();
  }

  findCouponField(domain) {
    const detector = this.getDetector(domain);
    return detector.findCouponField();
  }

  findApplyButton(domain) {
    const detector = this.getDetector(domain);
    return detector.findApplyButton();
  }

  extractProductData(domain) {
    const detector = this.getDetector(domain);
    return detector.extractProductData();
  }

  extractOrderData(domain) {
    const detector = this.getDetector(domain);
    return detector.extractOrderData();
  }

  checkCouponSuccess(domain) {
    const detector = this.getDetector(domain);
    return detector.checkCouponSuccess();
  }
}

// Base detector class
class BaseDetector {
  isCheckoutPage(url) {
    const checkoutKeywords = [
      'checkout', 'cart', 'basket', 'bag', 'payment', 
      'billing', 'order', 'purchase'
    ];
    return checkoutKeywords.some(keyword => url.toLowerCase().includes(keyword));
  }

  isProductPage() {
    const productIndicators = [
      '.product-title', '.product-name', '#product-title',
      '[data-testid*="product"]', '.price', '.add-to-cart'
    ];
    return productIndicators.some(selector => document.querySelector(selector));
  }

  findCouponField() {
    const selectors = [
      'input[name*="coupon"]', 'input[name*="promo"]', 'input[name*="discount"]',
      'input[placeholder*="coupon"]', 'input[placeholder*="promo"]', 'input[placeholder*="discount"]',
      '#coupon-code', '#promo-code', '.coupon-input', '.promo-input'
    ];
    
    for (const selector of selectors) {
      const field = document.querySelector(selector);
      if (field && field.type === 'text') return field;
    }
    return null;
  }

  findApplyButton() {
    const selectors = [
      'button[type="submit"][class*="coupon"]',
      'button[type="submit"][class*="promo"]',
      'input[type="submit"][value*="apply"]',
      '.coupon-apply', '.promo-apply',
      '#apply-coupon', '#apply-promo'
    ];
    
    for (const selector of selectors) {
      const button = document.querySelector(selector);
      if (button) return button;
    }
    
    // Look for buttons near coupon field
    const couponField = this.findCouponField();
    if (couponField) {
      const parent = couponField.closest('form') || couponField.parentElement;
      const nearbyButton = parent.querySelector('button[type="submit"], input[type="submit"]');
      if (nearbyButton) return nearbyButton;
    }
    
    return null;
  }

  extractProductData() {
    const title = document.querySelector('.product-title, .product-name, h1')?.textContent?.trim();
    const price = this.extractPrice();
    const image = document.querySelector('.product-image img, .main-image img')?.src;
    
    return {
      name: title || document.title,
      price: price,
      image: image,
      url: window.location.href
    };
  }

  extractOrderData() {
    const price = this.extractPrice();
    return {
      amount: price || 0,
      currency: 'USD',
      url: window.location.href
    };
  }

  extractPrice() {
    const priceElements = document.querySelectorAll(
      '.price, .total, .subtotal, [class*="price"], [class*="total"]'
    );
    
    let maxPrice = 0;
    for (const element of priceElements) {
      const text = element.textContent.replace(/[^0-9.]/g, '');
      const price = parseFloat(text);
      if (price > maxPrice) {
        maxPrice = price;
      }
    }
    return maxPrice;
  }

  checkCouponSuccess() {
    const successIndicators = [
      '.coupon-success', '.discount-applied', '.promo-success',
      '[class*="success"]', '[class*="applied"]'
    ];
    
    return successIndicators.some(selector => {
      const element = document.querySelector(selector);
      return element && element.offsetParent !== null;
    });
  }
}

// Amazon-specific detector
class AmazonDetector extends BaseDetector {
  isCheckoutPage(url) {
    return url.includes('/gp/buy/') || 
           url.includes('/checkout/') || 
           url.includes('/gp/cart/');
  }

  isProductPage() {
    return document.querySelector('#productTitle') || 
           document.querySelector('[data-asin]') ||
           document.querySelector('#dp-container');
  }

  findCouponField() {
    return document.querySelector('#gc-redemption-input') ||
           document.querySelector('input[name="claimCode"]') ||
           document.querySelector('#couponCode') ||
           super.findCouponField();
  }

  findApplyButton() {
    return document.querySelector('#gc-redemption-apply') ||
           document.querySelector('input[name="redeem"]') ||
           document.querySelector('#couponApply') ||
           super.findApplyButton();
  }

  extractProductData() {
    const title = document.querySelector('#productTitle')?.textContent?.trim();
    const price = this.extractPrice();
    const image = document.querySelector('#landingImage, #imgTagWrapperId img')?.src;
    
    return {
      name: title || document.title,
      price: price,
      image: image,
      url: window.location.href,
      asin: document.querySelector('[data-asin]')?.getAttribute('data-asin')
    };
  }

  extractPrice() {
    const priceSelectors = [
      '.a-price-whole', '.a-offscreen', '.a-price .a-offscreen',
      '#priceblock_dealprice', '#priceblock_ourprice'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.replace(/[^0-9.]/g, '');
        const price = parseFloat(text);
        if (price > 0) return price;
      }
    }
    return super.extractPrice();
  }

  checkCouponSuccess() {
    return document.querySelector('.gc-redemption-success') ||
           document.querySelector('.coupon-success') ||
           super.checkCouponSuccess();
  }
}

// Walmart-specific detector
class WalmartDetector extends BaseDetector {
  isCheckoutPage(url) {
    return url.includes('/checkout') || 
           url.includes('/cart') ||
           url.includes('/co/checkout');
  }

  isProductPage() {
    return document.querySelector('[data-testid="product-title"]') ||
           document.querySelector('.prod-ProductTitle') ||
           document.querySelector('#main-title');
  }

  findCouponField() {
    return document.querySelector('input[data-testid="promo-code-input"]') ||
           document.querySelector('#PromoCode') ||
           super.findCouponField();
  }

  findApplyButton() {
    return document.querySelector('button[data-testid="promo-code-apply"]') ||
           document.querySelector('#applyPromoCode') ||
           super.findApplyButton();
  }

  extractProductData() {
    const title = document.querySelector('[data-testid="product-title"], .prod-ProductTitle')?.textContent?.trim();
    const price = this.extractPrice();
    const image = document.querySelector('[data-testid="hero-image-container"] img')?.src;
    
    return {
      name: title || document.title,
      price: price,
      image: image,
      url: window.location.href
    };
  }

  extractPrice() {
    const priceSelectors = [
      '[data-testid="price-current"]', '.price-current',
      '.price-group .visuallyhidden', '.price-characteristic'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.replace(/[^0-9.]/g, '');
        const price = parseFloat(text);
        if (price > 0) return price;
      }
    }
    return super.extractPrice();
  }
}

// Target-specific detector
class TargetDetector extends BaseDetector {
  isCheckoutPage(url) {
    return url.includes('/checkout') || 
           url.includes('/cart');
  }

  isProductPage() {
    return document.querySelector('[data-test="product-title"]') ||
           document.querySelector('.ProductTitle') ||
           document.querySelector('#pdp-product-title');
  }

  findCouponField() {
    return document.querySelector('input[data-test="giftCardRedemptionCodeInput"]') ||
           document.querySelector('#promoCode') ||
           super.findCouponField();
  }

  findApplyButton() {
    return document.querySelector('button[data-test="giftCardRedemptionApplyButton"]') ||
           document.querySelector('#applyPromoCode') ||
           super.findApplyButton();
  }

  extractProductData() {
    const title = document.querySelector('[data-test="product-title"], .ProductTitle')?.textContent?.trim();
    const price = this.extractPrice();
    const image = document.querySelector('[data-test="hero-image-zoom-trigger"] img')?.src;
    
    return {
      name: title || document.title,
      price: price,
      image: image,
      url: window.location.href
    };
  }

  extractPrice() {
    const priceSelectors = [
      '[data-test="product-price"]', '.Price-characteristic',
      '.sr-only', '.h-text-red'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes('$')) {
        const text = element.textContent.replace(/[^0-9.]/g, '');
        const price = parseFloat(text);
        if (price > 0) return price;
      }
    }
    return super.extractPrice();
  }
}

// Best Buy-specific detector
class BestBuyDetector extends BaseDetector {
  isCheckoutPage(url) {
    return url.includes('/checkout') || 
           url.includes('/cart');
  }

  isProductPage() {
    return document.querySelector('.sku-title') ||
           document.querySelector('.product-title') ||
           document.querySelector('[data-testid="sku-title"]');
  }

  findCouponField() {
    return document.querySelector('#fld-coupons') ||
           document.querySelector('input[name="couponCode"]') ||
           super.findCouponField();
  }

  findApplyButton() {
    return document.querySelector('.btn-coupon-apply') ||
           document.querySelector('#applyCoupon') ||
           super.findApplyButton();
  }

  extractProductData() {
    const title = document.querySelector('.sku-title, [data-testid="sku-title"]')?.textContent?.trim();
    const price = this.extractPrice();
    const image = document.querySelector('.primary-image img')?.src;
    
    return {
      name: title || document.title,
      price: price,
      image: image,
      url: window.location.href
    };
  }

  extractPrice() {
    const priceSelectors = [
      '.sr-only:contains("current price")', '.pricing-price__range',
      '.sr-only', '.visuallyhidden'
    ];
    
    for (const selector of priceSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.includes('$')) {
        const text = element.textContent.replace(/[^0-9.]/g, '');
        const price = parseFloat(text);
        if (price > 0) return price;
      }
    }
    return super.extractPrice();
  }
}

// Generic detector for other sites
class GenericDetector extends BaseDetector {
  // Uses base implementation
}

// Placeholder detectors for other sites
class EbayDetector extends BaseDetector {}
class EtsyDetector extends BaseDetector {}
class MacysDetector extends BaseDetector {}
class NordstromDetector extends BaseDetector {}
class KohlsDetector extends BaseDetector {}
class JCPenneyDetector extends BaseDetector {}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SiteDetectors;
} else {
  window.SiteDetectors = SiteDetectors;
}