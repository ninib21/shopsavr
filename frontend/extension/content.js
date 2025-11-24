// ShopSavr Extension Content Script
// Runs on all web pages to detect shopping sites and inject coupon functionality

class ShopSavrContent {
  constructor() {
    this.domain = this.extractDomain(window.location.href);
    this.siteDetectors = new SiteDetectors();
    this.siteDetector = this.siteDetectors.getDetector(this.domain);
    this.isCheckoutPage = this.siteDetector.isCheckoutPage();
    this.couponWidget = null;
    this.isProcessing = false;
    this.autoApplyEnabled = true;
    this.appliedCoupons = new Set();
    
    this.init();
  }

  init() {
    // Don't run on ShopSavr's own pages
    if (this.domain.includes('shopsavr.xyz')) {
      return;
    }

    // Set up message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true;
    });

    // Wait for page to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.onPageReady());
    } else {
      this.onPageReady();
    }

    console.log('ShopSavr content script loaded on:', this.domain);
  }

  onPageReady() {
    // Detect if this is a supported shopping site
    if (this.isSupportedSite()) {
      this.setupShoppingSiteFeatures();
    }

    // If this is a checkout page, automatically search for coupons
    if (this.isCheckoutPage) {
      this.handleCheckoutPage();
    }

    // Set up observers for dynamic content
    this.setupObservers();
  }

  setupShoppingSiteFeatures() {
    // Add "Add to Wishlist" buttons on product pages
    if (this.isProductPage()) {
      this.addWishlistButton();
    }

    // Add price tracking indicators
    this.addPriceTrackingIndicators();
  }

  setupObservers() {
    // Watch for checkout form changes
    const checkoutObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Check if checkout elements were added
          const addedNodes = Array.from(mutation.addedNodes);
          const hasCheckoutElements = addedNodes.some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            this.containsCheckoutElements(node)
          );
          
          if (hasCheckoutElements && !this.isProcessing) {
            this.handleCheckoutPage();
          }
        }
      });
    });

    checkoutObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  async handleMessage(request, sender, sendResponse) {
    switch (request.action) {
      case 'showCouponWidget':
        this.showCouponWidget(request.coupons);
        sendResponse({ success: true });
        break;

      case 'applyCouponToPage':
        const result = await this.applyCouponToPage(request.couponCode);
        sendResponse(result);
        break;

      case 'hideCouponWidget':
        this.hideCouponWidget();
        sendResponse({ success: true });
        break;

      case 'getPageData':
        const pageData = this.getPageData();
        sendResponse({ success: true, data: pageData });
        break;
    }
  }

  async handleCheckoutPage() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Get order data from the page
      const orderData = this.extractOrderData();
      
      // Request coupons from background script
      const response = await this.sendMessageToBackground({
        action: 'searchCoupons',
        domain: this.domain,
        orderData: orderData
      });

      if (response.success && response.coupons.length > 0) {
        this.showCouponWidget(response.coupons);
      }
    } catch (error) {
      console.error('Error handling checkout page:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  showCouponWidget(coupons) {
    // Remove existing widget
    this.hideCouponWidget();

    // Create coupon widget
    this.couponWidget = this.createCouponWidget(coupons);
    
    // Find the best place to insert the widget
    const insertionPoint = this.findWidgetInsertionPoint();
    if (insertionPoint) {
      insertionPoint.appendChild(this.couponWidget);
    } else {
      document.body.appendChild(this.couponWidget);
    }

    // Animate widget appearance
    setTimeout(() => {
      this.couponWidget.classList.add('shopsavr-widget-visible');
    }, 100);
  }

  createCouponWidget(coupons) {
    const widget = document.createElement('div');
    widget.className = 'shopsavr-coupon-widget';
    widget.innerHTML = `
      <div class="shopsavr-widget-header">
        <div class="shopsavr-widget-logo">
          <img src="${chrome.runtime.getURL('icons/icon32.png')}" alt="ShopSavr">
          <span>ShopSavr</span>
        </div>
        <button class="shopsavr-widget-close" onclick="this.closest('.shopsavr-coupon-widget').remove()">
          ×
        </button>
      </div>
      <div class="shopsavr-widget-content">
        <h3>💰 Found ${coupons.length} coupon${coupons.length !== 1 ? 's' : ''}!</h3>
        <div class="shopsavr-coupons-list">
          ${coupons.map(coupon => this.createCouponItem(coupon)).join('')}
        </div>
      </div>
      <div class="shopsavr-widget-footer">
        <button class="shopsavr-try-all-btn" onclick="window.shopSavrTryAllCoupons()">
          🚀 Try All Coupons
        </button>
      </div>
    `;

    // Add event listeners
    this.addWidgetEventListeners(widget, coupons);

    return widget;
  }

  createCouponItem(coupon) {
    const savings = coupon.discountType === 'percentage' 
      ? `${coupon.discountValue}% off`
      : `$${coupon.discountValue} off`;

    return `
      <div class="shopsavr-coupon-item" data-coupon-code="${coupon.code}">
        <div class="shopsavr-coupon-info">
          <div class="shopsavr-coupon-title">${coupon.title}</div>
          <div class="shopsavr-coupon-savings">${savings}</div>
          <div class="shopsavr-coupon-code">Code: ${coupon.code}</div>
        </div>
        <button class="shopsavr-apply-btn" onclick="window.shopSavrApplyCoupon('${coupon.code}')">
          Apply
        </button>
      </div>
    `;
  }

  addWidgetEventListeners(widget, coupons) {
    // Global functions for widget interactions
    window.shopSavrApplyCoupon = async (couponCode) => {
      await this.applyCouponToPage(couponCode);
    };

    window.shopSavrTryAllCoupons = async () => {
      await this.tryAllCoupons(coupons);
    };
  }

  async applyCouponToPage(couponCode) {
    try {
      // Check if coupon was already tried
      if (this.appliedCoupons.has(couponCode)) {
        this.showMessage(`Coupon ${couponCode} already tried`, 'warning');
        return { success: true, applied: false, alreadyTried: true };
      }

      this.appliedCoupons.add(couponCode);
      
      // Use site-specific coupon application
      const wasApplied = await this.siteDetector.applyCoupon(couponCode);
      
      if (wasApplied) {
        // Record successful application
        await this.recordCouponApplication(couponCode, true);
        this.showMessage(`Coupon ${couponCode} applied successfully! 🎉`, 'success');
        
        // Update widget to show success
        this.updateCouponItemStatus(couponCode, 'success');
        
        return { success: true, applied: true };
      } else {
        await this.recordCouponApplication(couponCode, false);
        this.showMessage(`Coupon ${couponCode} didn't work 😞`, 'warning');
        
        // Update widget to show failure
        this.updateCouponItemStatus(couponCode, 'failed');
        
        return { success: true, applied: false };
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      
      // Update widget to show error
      this.updateCouponItemStatus(couponCode, 'error');
      
      if (error.message.includes('Coupon field not found')) {
        this.showMessage('Could not find coupon field on this page', 'error');
      } else if (error.message.includes('Apply button not found')) {
        this.showMessage('Could not find apply button', 'error');
      } else {
        this.showMessage('Error applying coupon', 'error');
      }
      
      return { success: false, error: error.message };
    }
  }

  async tryAllCoupons(coupons) {
    this.showMessage('Trying all coupons... 🔄', 'info');
    
    for (const coupon of coupons) {
      const result = await this.applyCouponToPage(coupon.code);
      
      if (result.success && result.applied) {
        this.showMessage(`Success! Applied ${coupon.code} 🎉`, 'success');
        break;
      }
      
      // Wait between attempts
      await this.sleep(1000);
    }
  }

  updateCouponItemStatus(couponCode, status) {
    const couponItem = document.querySelector(`[data-coupon-code="${couponCode}"]`);
    if (!couponItem) return;

    const applyBtn = couponItem.querySelector('.shopsavr-apply-btn');
    if (!applyBtn) return;

    switch (status) {
      case 'success':
        applyBtn.textContent = '✅ Applied';
        applyBtn.style.background = '#28a745';
        applyBtn.disabled = true;
        couponItem.style.border = '2px solid #28a745';
        break;
      case 'failed':
        applyBtn.textContent = '❌ Failed';
        applyBtn.style.background = '#dc3545';
        applyBtn.disabled = true;
        couponItem.style.opacity = '0.6';
        break;
      case 'error':
        applyBtn.textContent = '⚠️ Error';
        applyBtn.style.background = '#ffc107';
        applyBtn.disabled = true;
        couponItem.style.opacity = '0.6';
        break;
      case 'trying':
        applyBtn.textContent = '⏳ Trying...';
        applyBtn.disabled = true;
        break;
    }
  }

  async autoApplyCoupons(coupons) {
    if (!this.autoApplyEnabled || coupons.length === 0) return;

    this.showMessage('Auto-applying best coupon... 🤖', 'info');
    
    // Sort coupons by potential savings (highest first)
    const sortedCoupons = coupons.sort((a, b) => {
      const aValue = a.discountType === 'percentage' ? a.discountValue * 10 : a.discountValue;
      const bValue = b.discountType === 'percentage' ? b.discountValue * 10 : b.discountValue;
      return bValue - aValue;
    });

    // Try the best coupon first
    for (const coupon of sortedCoupons) {
      this.updateCouponItemStatus(coupon.code, 'trying');
      
      const result = await this.applyCouponToPage(coupon.code);
      
      if (result.success && result.applied) {
        this.showMessage(`Auto-applied ${coupon.code}! Saved you time 🎉`, 'success');
        return true;
      }
      
      // Wait between attempts
      await this.sleep(1500);
    }

    this.showMessage('No coupons worked automatically', 'warning');
    return false;
  }

  async recordCouponApplication(couponCode, success) {
    try {
      const orderData = this.extractOrderData();
      
      await this.sendMessageToBackground({
        action: 'applyCoupon',
        couponCode: couponCode,
        domain: this.domain,
        orderData: orderData,
        success: success
      });
    } catch (error) {
      console.error('Error recording coupon application:', error);
    }
  }

  // Utility Methods
  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  detectCheckoutPage() {
    return this.siteDetector.isCheckoutPage();
  }

  containsCheckoutElements(element) {
    const checkoutSelectors = [
      'input[name*="coupon"]',
      'input[name*="promo"]',
      'input[placeholder*="coupon"]',
      'input[placeholder*="promo"]',
      '.coupon-field',
      '.promo-code',
      '#coupon-code',
      '#promo-code'
    ];
    
    return checkoutSelectors.some(selector => 
      element.querySelector && element.querySelector(selector)
    );
  }

  isSupportedSite() {
    const supportedDomains = [
      'amazon.com', 'walmart.com', 'target.com', 'bestbuy.com',
      'ebay.com', 'etsy.com', 'macys.com', 'nordstrom.com'
    ];
    
    return supportedDomains.some(domain => this.domain.includes(domain));
  }

  isProductPage() {
    return this.siteDetector.isProductPage();
  }

  findCouponField() {
    return this.siteDetector.findCouponField();
  }

  findCouponApplyButton() {
    const couponField = this.findCouponField();
    return this.siteDetector.findApplyButton(couponField);
  }

  checkIfCouponWasApplied() {
    return this.siteDetector.checkCouponSuccess();
  }

  extractOrderData() {
    const amount = this.siteDetector.extractOrderTotal();
    
    return {
      amount: amount || 0,
      currency: 'USD',
      url: window.location.href,
      siteName: this.siteDetector.name,
      domain: this.domain
    };
  }

  findWidgetInsertionPoint() {
    // Try to find a good place to insert the coupon widget
    const candidates = [
      '.checkout-summary',
      '.order-summary',
      '.cart-summary',
      '.payment-section',
      '.coupon-section',
      'form[action*="checkout"]',
      'main',
      '.main-content'
    ];
    
    for (const selector of candidates) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return null;
  }

  addWishlistButton() {
    // Add "Add to Wishlist" button on product pages
    const productTitle = document.querySelector('.product-title, .product-name, h1');
    if (!productTitle) return;

    const wishlistBtn = document.createElement('button');
    wishlistBtn.className = 'shopsavr-wishlist-btn';
    wishlistBtn.innerHTML = '💝 Add to ShopSavr Wishlist';
    wishlistBtn.onclick = () => this.addCurrentProductToWishlist();
    
    productTitle.parentNode.insertBefore(wishlistBtn, productTitle.nextSibling);
  }

  async addCurrentProductToWishlist() {
    const productData = this.getPageData();
    
    const result = await this.sendMessageToBackground({
      action: 'addToWishlist',
      productData: productData
    });
    
    if (result.success) {
      this.showMessage('Added to wishlist! 💝', 'success');
    } else {
      this.showMessage('Failed to add to wishlist', 'error');
    }
  }

  getPageData() {
    // Extract product data from the current page
    const title = document.querySelector('.product-title, .product-name, h1')?.textContent?.trim();
    const price = this.extractOrderData().amount;
    const image = document.querySelector('.product-image img, .main-image img')?.src;
    
    return {
      product: {
        name: title || document.title,
        image: image,
        url: window.location.href,
        domain: this.domain
      },
      pricing: {
        currentPrice: price,
        currency: 'USD'
      },
      sources: [{
        name: this.domain,
        price: price,
        url: window.location.href
      }]
    };
  }

  addPriceTrackingIndicators() {
    // Add price tracking indicators to product pages
    const priceElements = document.querySelectorAll('.price, [class*="price"]');
    
    priceElements.forEach(priceElement => {
      if (priceElement.querySelector('.shopsavr-price-indicator')) return;
      
      const indicator = document.createElement('span');
      indicator.className = 'shopsavr-price-indicator';
      indicator.innerHTML = '📊';
      indicator.title = 'Track price with ShopSavr';
      indicator.style.marginLeft = '8px';
      indicator.style.cursor = 'pointer';
      
      indicator.onclick = () => this.addCurrentProductToWishlist();
      
      priceElement.appendChild(indicator);
    });
  }

  hideCouponWidget() {
    if (this.couponWidget) {
      this.couponWidget.remove();
      this.couponWidget = null;
    }
  }

  showMessage(message, type = 'info') {
    // Create and show a temporary message
    const messageEl = document.createElement('div');
    messageEl.className = `shopsavr-message shopsavr-message-${type}`;
    messageEl.textContent = message;
    
    // Style the message
    Object.assign(messageEl.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '6px',
      color: 'white',
      fontWeight: 'bold',
      zIndex: '10000',
      fontSize: '14px',
      maxWidth: '300px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
    });
    
    // Set background color based on type
    const colors = {
      success: '#4CAF50',
      error: '#f44336',
      warning: '#ff9800',
      info: '#2196F3'
    };
    messageEl.style.backgroundColor = colors[type] || colors.info;
    
    document.body.appendChild(messageEl);
    
    // Remove after 3 seconds
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 3000);
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Initialize content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new ShopSavrContent();
  });
} else {
  new ShopSavrContent();
}