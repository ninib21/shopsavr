// ShopSavr Enhanced Content Script with Automatic Coupon Detection
// Integrates site detection, automation, and user interaction

class ShopSavrContentEnhanced {
  constructor() {
    this.domain = this.extractDomain(window.location.href);
    this.siteDetectors = new SiteDetectors();
    this.siteDetector = this.siteDetectors.getDetector(this.domain);
    this.couponAutomation = new CouponAutomation(this);
    this.isCheckoutPage = this.siteDetector.isCheckoutPage(window.location.href);
    this.couponWidget = null;
    this.isProcessing = false;
    this.autoApplyEnabled = true;
    this.appliedCoupons = new Set();
    this.checkoutObserver = null;
    
    this.init();
  }

  async init() {
    // Don't run on ShopSavr's own pages
    if (this.domain.includes('shopsavr.xyz')) {
      return;
    }

    // Load user preferences
    await this.loadUserPreferences();

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

    console.log('ShopSavr enhanced content script loaded on:', this.domain);
  }

  async loadUserPreferences() {
    try {
      const result = await chrome.storage.sync.get([
        'autoApplyEnabled',
        'showNotifications',
        'autoApplyDelay'
      ]);
      
      this.autoApplyEnabled = result.autoApplyEnabled !== false; // Default to true
      this.showNotifications = result.showNotifications !== false;
      this.autoApplyDelay = result.autoApplyDelay || 3000; // 3 second delay
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  }

  async onPageReady() {
    // Detect if this is a supported shopping site
    if (this.isSupportedSite()) {
      await this.setupShoppingSiteFeatures();
    }

    // If this is a checkout page, handle checkout detection
    if (this.isCheckoutPage) {
      await this.handleCheckoutPage();
    }

    // Set up observers for dynamic content
    this.setupObservers();

    // Set up periodic checkout detection for SPAs
    this.startPeriodicCheckoutDetection();
  }

  async setupShoppingSiteFeatures() {
    // Add \"Add to Wishlist\" buttons on product pages
    if (this.siteDetector.isProductPage()) {
      this.addWishlistButton();
    }

    // Add price tracking indicators
    this.addPriceTrackingIndicators();

    // Show site support indicator
    this.showSiteSupport();
  }

  setupObservers() {
    // Watch for checkout form changes and dynamic content
    this.checkoutObserver = new MutationObserver((mutations) => {
      let shouldCheckForCheckout = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          const addedNodes = Array.from(mutation.addedNodes);
          const hasCheckoutElements = addedNodes.some(node => 
            node.nodeType === Node.ELEMENT_NODE && 
            this.containsCheckoutElements(node)
          );
          
          if (hasCheckoutElements) {
            shouldCheckForCheckout = true;
          }
        }
      });
      
      if (shouldCheckForCheckout && !this.isProcessing) {
        // Debounce checkout detection
        clearTimeout(this.checkoutDetectionTimeout);
        this.checkoutDetectionTimeout = setTimeout(() => {
          this.handleDynamicCheckoutDetection();
        }, 1000);
      }
    });

    this.checkoutObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  startPeriodicCheckoutDetection() {
    // Check for checkout page changes every 2 seconds (for SPAs)
    setInterval(() => {
      const currentlyOnCheckout = this.siteDetector.isCheckoutPage(window.location.href);
      
      if (currentlyOnCheckout && !this.isCheckoutPage && !this.isProcessing) {
        this.isCheckoutPage = true;
        this.handleCheckoutPage();
      } else if (!currentlyOnCheckout && this.isCheckoutPage) {
        this.isCheckoutPage = false;
        this.hideCouponWidget();
      }
    }, 2000);
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

      case 'startAutomaticTesting':
        await this.startAutomaticCouponTesting(request.coupons);
        sendResponse({ success: true });
        break;

      case 'stopAutomaticTesting':
        this.couponAutomation.stopAutomation();
        sendResponse({ success: true });
        break;

      case 'hideCouponWidget':
        this.hideCouponWidget();
        sendResponse({ success: true });
        break;

      case 'getPageData':
        const pageData = this.getPageData();
        sendResponse({ success: true, data: pageData });
        break;

      case 'updatePreferences':
        await this.updatePreferences(request.preferences);
        sendResponse({ success: true });
        break;
    }
  }

  async handleCheckoutPage() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // Show checkout detection notification
      if (this.showNotifications) {
        this.showMessage('🛒 Checkout detected! Searching for coupons...', 'info');
      }

      // Get order data from the page
      const orderData = this.siteDetector.extractOrderData();
      
      // Request coupons from background script
      const response = await this.sendMessageToBackground({
        action: 'searchCoupons',
        domain: this.domain,
        orderData: orderData
      });

      if (response.success && response.coupons.length > 0) {
        // Show coupon widget
        this.showCouponWidget(response.coupons);
        
        // Auto-apply if enabled and user preference allows
        if (this.autoApplyEnabled && response.coupons.length > 0) {
          // Wait for user-defined delay before auto-applying
          setTimeout(() => {
            this.startAutomaticCouponTesting(response.coupons);
          }, this.autoApplyDelay);
        }
      } else {
        if (this.showNotifications) {
          this.showMessage('No coupons found for this site', 'info');
        }
      }
    } catch (error) {
      console.error('Error handling checkout page:', error);
      if (this.showNotifications) {
        this.showMessage('Error searching for coupons', 'error');
      }
    } finally {
      this.isProcessing = false;
    }
  }

  async handleDynamicCheckoutDetection() {
    // Handle checkout detection for dynamically loaded content
    if (!this.isCheckoutPage) {
      this.isCheckoutPage = true;
      await this.handleCheckoutPage();
    }
  }

  async startAutomaticCouponTesting(coupons) {
    if (!this.autoApplyEnabled || coupons.length === 0) {
      return;
    }

    try {
      await this.couponAutomation.startAutomaticCouponTesting(coupons);
    } catch (error) {
      console.error('Error during automatic coupon testing:', error);
      this.showMessage('Error during automatic coupon testing', 'error');
    }
  }

  showCouponWidget(coupons) {
    // Remove existing widget
    this.hideCouponWidget();

    // Create enhanced coupon widget
    this.couponWidget = this.createEnhancedCouponWidget(coupons);
    
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

  createEnhancedCouponWidget(coupons) {
    const widget = document.createElement('div');
    widget.className = 'shopsavr-coupon-widget shopsavr-enhanced-widget';
    widget.innerHTML = `
      <div class=\"shopsavr-widget-header\">
        <div class=\"shopsavr-widget-logo\">
          <img src=\"${chrome.runtime.getURL('icons/icon32.png')}\" alt=\"ShopSavr\">
          <span>ShopSavr</span>
        </div>
        <div class=\"widget-actions\">
          <button class=\"widget-settings\" onclick=\"window.shopSavrShowSettings()\" title=\"Settings\">
            ⚙️
          </button>
          <button class=\"shopsavr-widget-close\" onclick=\"this.closest('.shopsavr-coupon-widget').remove()\">
            ×
          </button>
        </div>
      </div>
      <div class=\"shopsavr-widget-content\">
        <div class=\"widget-status\">
          <h3>💰 Found ${coupons.length} coupon${coupons.length !== 1 ? 's' : ''}!</h3>
          <div class=\"auto-apply-status\" id=\"auto-apply-status\">
            ${this.autoApplyEnabled ? 
              `🤖 Auto-apply will start in ${this.autoApplyDelay / 1000}s` : 
              '⏸️ Auto-apply disabled'
            }
          </div>
        </div>
        <div class=\"shopsavr-coupons-list\">
          ${coupons.map(coupon => this.createEnhancedCouponItem(coupon)).join('')}
        </div>
      </div>
      <div class=\"shopsavr-widget-footer\">
        <div class=\"footer-actions\">
          <button class=\"shopsavr-try-all-btn\" onclick=\"window.shopSavrTryAllCoupons()\">
            🚀 Try All Automatically
          </button>
          <button class=\"shopsavr-manual-btn\" onclick=\"window.shopSavrToggleManualMode()\">
            ✋ Manual Mode
          </button>
        </div>
      </div>
    `;

    // Add event listeners
    this.addEnhancedWidgetEventListeners(widget, coupons);

    return widget;
  }

  createEnhancedCouponItem(coupon) {
    const savings = coupon.discountType === 'percentage' 
      ? `${coupon.discountValue}% off`
      : `$${coupon.discountValue} off`;

    const successRate = coupon.successRate || 0;
    const successClass = successRate > 70 ? 'high-success' : successRate > 40 ? 'medium-success' : 'low-success';

    return `
      <div class=\"shopsavr-coupon-item enhanced-coupon-item\" data-coupon-code=\"${coupon.code}\">
        <div class=\"shopsavr-coupon-info\">
          <div class=\"coupon-header\">
            <div class=\"shopsavr-coupon-title\">${coupon.title}</div>
            <div class=\"success-rate ${successClass}\" title=\"Success rate: ${successRate}%\">
              ${successRate}% ✓
            </div>
          </div>
          <div class=\"shopsavr-coupon-savings\">${savings}</div>
          <div class=\"shopsavr-coupon-code\">Code: ${coupon.code}</div>
          ${coupon.expiresAt ? `<div class=\"coupon-expires\">Expires: ${new Date(coupon.expiresAt).toLocaleDateString()}</div>` : ''}
        </div>
        <div class=\"coupon-actions\">
          <button class=\"shopsavr-apply-btn\" onclick=\"window.shopSavrApplyCoupon('${coupon.code}')\">
            Apply
          </button>
          <button class=\"copy-code-btn\" onclick=\"window.shopSavrCopyCode('${coupon.code}')\" title=\"Copy code\">
            📋
          </button>
        </div>
      </div>
    `;
  }

  addEnhancedWidgetEventListeners(widget, coupons) {
    // Global functions for widget interactions
    window.shopSavrApplyCoupon = async (couponCode) => {
      await this.applyCouponToPage(couponCode);
    };

    window.shopSavrTryAllCoupons = async () => {
      await this.startAutomaticCouponTesting(coupons);
    };

    window.shopSavrToggleManualMode = () => {
      this.autoApplyEnabled = !this.autoApplyEnabled;
      this.updateAutoApplyStatus();
      chrome.storage.sync.set({ autoApplyEnabled: this.autoApplyEnabled });
    };

    window.shopSavrCopyCode = (couponCode) => {
      navigator.clipboard.writeText(couponCode).then(() => {
        this.showMessage(`Copied ${couponCode} to clipboard`, 'success');
      });
    };

    window.shopSavrShowSettings = () => {
      this.showSettingsPanel();
    };

    // Start auto-apply countdown if enabled
    if (this.autoApplyEnabled) {
      this.startAutoApplyCountdown();
    }
  }

  startAutoApplyCountdown() {
    const statusEl = document.getElementById('auto-apply-status');
    if (!statusEl) return;

    let countdown = this.autoApplyDelay / 1000;
    const countdownInterval = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        statusEl.textContent = `🤖 Auto-apply starting in ${countdown}s`;
      } else {
        statusEl.textContent = '🤖 Starting automatic coupon testing...';
        clearInterval(countdownInterval);
      }
    }, 1000);
  }

  updateAutoApplyStatus() {
    const statusEl = document.getElementById('auto-apply-status');
    if (statusEl) {
      statusEl.textContent = this.autoApplyEnabled ? 
        '🤖 Auto-apply enabled' : 
        '⏸️ Auto-apply disabled';
    }
  }

  showSettingsPanel() {
    // Create and show settings panel
    const panel = document.createElement('div');
    panel.className = 'shopsavr-settings-panel';
    panel.innerHTML = `
      <div class=\"settings-overlay\" onclick=\"this.closest('.shopsavr-settings-panel').remove()\"></div>
      <div class=\"settings-content\">
        <div class=\"settings-header\">
          <h3>ShopSavr Settings</h3>
          <button class=\"settings-close\" onclick=\"this.closest('.shopsavr-settings-panel').remove()\">×</button>
        </div>
        <div class=\"settings-body\">
          <div class=\"setting-item\">
            <label>
              <input type=\"checkbox\" id=\"auto-apply-toggle\" ${this.autoApplyEnabled ? 'checked' : ''}>
              <span>Enable automatic coupon testing</span>
            </label>
          </div>
          <div class=\"setting-item\">
            <label>
              <input type=\"checkbox\" id=\"notifications-toggle\" ${this.showNotifications ? 'checked' : ''}>
              <span>Show notifications</span>
            </label>
          </div>
          <div class=\"setting-item\">
            <label>
              <span>Auto-apply delay: <span id=\"delay-value\">${this.autoApplyDelay / 1000}s</span></span>
              <input type=\"range\" id=\"delay-slider\" min=\"1\" max=\"10\" value=\"${this.autoApplyDelay / 1000}\">
            </label>
          </div>
        </div>
        <div class=\"settings-footer\">
          <button class=\"save-settings-btn\" onclick=\"window.shopSavrSaveSettings()\">Save Settings</button>
        </div>
      </div>
    `;

    document.body.appendChild(panel);

    // Add event listeners
    window.shopSavrSaveSettings = () => {
      this.saveSettingsFromPanel();
      panel.remove();
    };

    // Update delay display
    const delaySlider = panel.querySelector('#delay-slider');
    const delayValue = panel.querySelector('#delay-value');
    delaySlider.addEventListener('input', (e) => {
      delayValue.textContent = `${e.target.value}s`;
    });
  }

  saveSettingsFromPanel() {
    const autoApplyToggle = document.getElementById('auto-apply-toggle');
    const notificationsToggle = document.getElementById('notifications-toggle');
    const delaySlider = document.getElementById('delay-slider');

    this.autoApplyEnabled = autoApplyToggle.checked;
    this.showNotifications = notificationsToggle.checked;
    this.autoApplyDelay = parseInt(delaySlider.value) * 1000;

    // Save to storage
    chrome.storage.sync.set({
      autoApplyEnabled: this.autoApplyEnabled,
      showNotifications: this.showNotifications,
      autoApplyDelay: this.autoApplyDelay
    });

    this.showMessage('Settings saved!', 'success');
  }

  // Enhanced utility methods
  isSupportedSite() {
    const supportedDomains = [
      'amazon.com', 'walmart.com', 'target.com', 'bestbuy.com',
      'ebay.com', 'etsy.com', 'macys.com', 'nordstrom.com',
      'kohls.com', 'jcpenney.com'
    ];
    
    return supportedDomains.some(domain => this.domain.includes(domain));
  }

  containsCheckoutElements(element) {
    return this.siteDetector.findCouponField() !== null ||
           this.siteDetector.findApplyButton() !== null;
  }

  showSiteSupport() {
    // Show a small indicator that the site is supported
    const indicator = document.createElement('div');
    indicator.className = 'shopsavr-site-indicator';
    indicator.innerHTML = '💰 ShopSavr Active';
    indicator.title = 'ShopSavr is monitoring this site for deals';
    
    document.body.appendChild(indicator);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.remove();
      }
    }, 3000);
  }

  // Delegate to existing methods
  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return '';
    }
  }

  async applyCouponToPage(couponCode) {
    // Use the automation system for more reliable application
    const result = await this.couponAutomation.testSingleCoupon({ code: couponCode });
    
    if (result.success) {
      this.showMessage(`Coupon ${couponCode} applied! Saved $${result.savings.toFixed(2)}`, 'success');
    } else {
      this.showMessage(`Coupon ${couponCode} didn't work`, 'warning');
    }
    
    return result;
  }

  getPageData() {
    return this.siteDetector.extractProductData();
  }

  findWidgetInsertionPoint() {
    // Try to find a good place to insert the coupon widget
    const candidates = [
      '.checkout-summary', '.order-summary', '.cart-summary',
      '.payment-section', '.coupon-section', 'form[action*=\"checkout\"]',
      'main', '.main-content'
    ];
    
    for (const selector of candidates) {
      const element = document.querySelector(selector);
      if (element) return element;
    }
    
    return null;
  }

  hideCouponWidget() {
    if (this.couponWidget) {
      this.couponWidget.remove();
      this.couponWidget = null;
    }
  }

  addWishlistButton() {
    // Enhanced wishlist button with better detection
    const productContainer = document.querySelector('.product-title, .product-name, h1')?.parentElement;
    if (!productContainer || productContainer.querySelector('.shopsavr-wishlist-btn')) return;

    const wishlistBtn = document.createElement('button');
    wishlistBtn.className = 'shopsavr-wishlist-btn enhanced-wishlist-btn';
    wishlistBtn.innerHTML = '💝 Add to ShopSavr Wishlist';
    wishlistBtn.onclick = () => this.addCurrentProductToWishlist();
    
    productContainer.appendChild(wishlistBtn);
  }

  addPriceTrackingIndicators() {
    // Enhanced price tracking with better visual indicators
    const priceElements = document.querySelectorAll('.price, [class*=\"price\"]');
    
    priceElements.forEach(priceElement => {
      if (priceElement.querySelector('.shopsavr-price-indicator')) return;
      
      const indicator = document.createElement('span');
      indicator.className = 'shopsavr-price-indicator enhanced-indicator';
      indicator.innerHTML = '📊';
      indicator.title = 'Track price changes with ShopSavr';
      
      indicator.onclick = () => this.addCurrentProductToWishlist();
      
      priceElement.appendChild(indicator);
    });
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

  showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `shopsavr-message shopsavr-message-${type} enhanced-message`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  async updatePreferences(preferences) {
    Object.assign(this, preferences);
    await chrome.storage.sync.set(preferences);
  }

  // Cleanup
  destroy() {
    if (this.checkoutObserver) {
      this.checkoutObserver.disconnect();
    }
    
    if (this.checkoutDetectionTimeout) {
      clearTimeout(this.checkoutDetectionTimeout);
    }
    
    this.hideCouponWidget();
  }
}

// Initialize enhanced content script
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.shopSavrContent = new ShopSavrContentEnhanced();
  });
} else {
  window.shopSavrContent = new ShopSavrContentEnhanced();
}