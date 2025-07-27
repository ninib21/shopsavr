// ShopSavr Extension Popup Script
// Handles the popup interface and user interactions

class PopupManager {
  constructor() {
    this.currentTab = null;
    this.isLoggedIn = false;
    this.coupons = [];
    this.userStats = null;
    
    this.init();
  }

  async init() {
    // Get current tab
    this.currentTab = await this.getCurrentTab();
    
    // Check authentication status
    await this.checkAuthStatus();
    
    // Load user data and coupons
    await this.loadData();
    
    // Set up event listeners
    this.setupEventListeners();
    
    // Update UI
    this.updateUI();
    
    // Hide loading state
    this.hideLoading();
  }

  async getCurrentTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      return tab;
    } catch (error) {
      console.error('Error getting current tab:', error);
      return null;
    }
  }

  async checkAuthStatus() {
    try {
      const response = await this.sendMessageToBackground({
        action: 'getAuthStatus'
      });
      
      this.isLoggedIn = response.isLoggedIn;
    } catch (error) {
      console.error('Error checking auth status:', error);
      this.isLoggedIn = false;
    }
  }

  async loadData() {
    if (!this.isLoggedIn) return;

    try {
      // Load user stats
      await this.loadUserStats();
      
      // Load coupons for current site
      if (this.currentTab) {
        await this.loadCoupons();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }

  async loadUserStats() {
    try {
      // This would typically make an API call to get user stats
      // For now, we'll use placeholder data
      this.userStats = {
        totalSaved: 0,
        couponsUsed: 0,
        wishlistItems: 0
      };
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async loadCoupons() {
    try {
      const domain = this.extractDomain(this.currentTab.url);
      
      const response = await this.sendMessageToBackground({
        action: 'searchCoupons',
        domain: domain
      });
      
      if (response.success) {
        this.coupons = response.coupons || [];
      }
    } catch (error) {
      console.error('Error loading coupons:', error);
      this.coupons = [];
    }
  }

  setupEventListeners() {
    // Search coupons button
    document.getElementById('search-coupons').addEventListener('click', () => {
      this.searchCoupons();
    });

    // Try all coupons button
    document.getElementById('try-all-coupons').addEventListener('click', () => {
      this.tryAllCoupons();
    });

    // Add to wishlist button
    document.getElementById('add-to-wishlist').addEventListener('click', () => {
      this.addToWishlist();
    });

    // Open dashboard button
    document.getElementById('open-dashboard').addEventListener('click', () => {
      this.openDashboard();
    });

    // Settings button
    document.getElementById('settings').addEventListener('click', () => {
      this.openSettings();
    });

    // Login button
    document.getElementById('login-btn').addEventListener('click', () => {
      this.openLogin();
    });

    // Signup button
    document.getElementById('signup-btn').addEventListener('click', () => {
      this.openSignup();
    });

    // Footer links
    document.getElementById('help-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openHelp();
    });

    document.getElementById('feedback-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openFeedback();
    });

    document.getElementById('privacy-link').addEventListener('click', (e) => {
      e.preventDefault();
      this.openPrivacy();
    });
  }

  updateUI() {
    // Update current site
    if (this.currentTab) {
      const domain = this.extractDomain(this.currentTab.url);
      document.getElementById('current-site').textContent = domain || 'Unknown';
    }

    // Update total saved
    if (this.userStats) {
      document.getElementById('total-saved').textContent = `$${this.userStats.totalSaved.toFixed(2)}`;
    }

    // Show appropriate content based on login status
    if (this.isLoggedIn) {
      document.getElementById('main-content').classList.remove('hidden');
      document.getElementById('login-state').classList.add('hidden');
      
      // Update coupon section
      this.updateCouponSection();
    } else {
      document.getElementById('main-content').classList.add('hidden');
      document.getElementById('login-state').classList.remove('hidden');
    }

    // Update extension status
    const statusElement = document.getElementById('extension-status');
    if (this.isSupportedSite()) {
      statusElement.textContent = 'Active';
      statusElement.className = 'status-value success';
    } else {
      statusElement.textContent = 'Not Supported';
      statusElement.className = 'status-value warning';
    }
  }

  updateCouponSection() {
    const couponSection = document.getElementById('coupon-section');
    const couponCount = document.getElementById('coupon-count');
    const couponList = document.getElementById('coupon-list');

    if (this.coupons.length > 0) {
      couponSection.classList.remove('hidden');
      couponCount.textContent = this.coupons.length;
      
      // Clear existing coupons
      couponList.innerHTML = '';
      
      // Add coupon items
      this.coupons.forEach(coupon => {
        const couponItem = this.createCouponItem(coupon);
        couponList.appendChild(couponItem);
      });
    } else {
      couponSection.classList.add('hidden');
    }
  }

  createCouponItem(coupon) {
    const item = document.createElement('div');
    item.className = 'coupon-item';
    
    const savings = coupon.discountType === 'percentage' 
      ? `${coupon.discountValue}% off`
      : `$${coupon.discountValue} off`;
    
    item.innerHTML = `
      <div class="coupon-info">
        <div class="coupon-title">${coupon.title}</div>
        <div class="coupon-savings">${savings}</div>
      </div>
      <button class="coupon-apply" data-coupon-code="${coupon.code}">
        Apply
      </button>
    `;
    
    // Add click listener to apply button
    const applyBtn = item.querySelector('.coupon-apply');
    applyBtn.addEventListener('click', () => {
      this.applyCoupon(coupon.code);
    });
    
    return item;
  }

  async searchCoupons() {
    if (!this.currentTab) {
      this.showNotification('Unable to detect current page', 'error');
      return;
    }

    this.showNotification('Searching for coupons...', 'info');
    
    try {
      await this.loadCoupons();
      this.updateCouponSection();
      
      if (this.coupons.length > 0) {
        this.showNotification(`Found ${this.coupons.length} coupon(s)!`, 'success');
      } else {
        this.showNotification('No coupons found for this site', 'warning');
      }
    } catch (error) {
      console.error('Error searching coupons:', error);
      this.showNotification('Failed to search for coupons', 'error');
    }
  }

  async applyCoupon(couponCode) {
    if (!this.currentTab) {
      this.showNotification('Unable to apply coupon', 'error');
      return;
    }

    this.showNotification('Applying coupon...', 'info');
    
    try {
      // Send message to content script to apply coupon
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'applyCouponToPage',
        couponCode: couponCode
      });
      
      if (response && response.success) {
        if (response.applied) {
          this.showNotification(`Coupon ${couponCode} applied successfully! 🎉`, 'success');
        } else {
          this.showNotification(`Coupon ${couponCode} didn't work`, 'warning');
        }
      } else {
        this.showNotification('Failed to apply coupon', 'error');
      }
    } catch (error) {
      console.error('Error applying coupon:', error);
      this.showNotification('Error applying coupon', 'error');
    }
  }

  async tryAllCoupons() {
    if (this.coupons.length === 0) {
      this.showNotification('No coupons available', 'warning');
      return;
    }

    this.showNotification('Trying all coupons...', 'info');
    
    try {
      // Send message to content script to try all coupons
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'tryAllCoupons',
        coupons: this.coupons
      });
      
      if (response && response.success) {
        this.showNotification('Finished trying all coupons', 'success');
      } else {
        this.showNotification('Failed to try coupons', 'error');
      }
    } catch (error) {
      console.error('Error trying all coupons:', error);
      this.showNotification('Error trying coupons', 'error');
    }
  }

  async addToWishlist() {
    if (!this.currentTab) {
      this.showNotification('Unable to add to wishlist', 'error');
      return;
    }

    this.showNotification('Adding to wishlist...', 'info');
    
    try {
      // Get page data from content script
      const pageData = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'getPageData'
      });
      
      if (pageData && pageData.success) {
        // Send to background script to add to wishlist
        const response = await this.sendMessageToBackground({
          action: 'addToWishlist',
          productData: pageData.data
        });
        
        if (response.success) {
          this.showNotification('Added to wishlist! 💝', 'success');
        } else {
          this.showNotification('Failed to add to wishlist', 'error');
        }
      } else {
        this.showNotification('Unable to detect product information', 'error');
      }
    } catch (error) {
      console.error('Error adding to wishlist:', error);
      this.showNotification('Error adding to wishlist', 'error');
    }
  }

  openDashboard() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/dashboard'
    });
    window.close();
  }

  openSettings() {
    chrome.tabs.create({
      url: chrome.runtime.getURL('options.html')
    });
    window.close();
  }

  openLogin() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/login?source=extension'
    });
    window.close();
  }

  openSignup() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/signup?source=extension'
    });
    window.close();
  }

  openHelp() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/help'
    });
    window.close();
  }

  openFeedback() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/feedback'
    });
    window.close();
  }

  openPrivacy() {
    chrome.tabs.create({
      url: 'https://shopsavr.xyz/privacy'
    });
    window.close();
  }

  // Utility methods
  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return null;
    }
  }

  isSupportedSite() {
    if (!this.currentTab) return false;
    
    const domain = this.extractDomain(this.currentTab.url);
    const supportedDomains = [
      'amazon.com', 'walmart.com', 'target.com', 'bestbuy.com',
      'ebay.com', 'etsy.com', 'macys.com', 'nordstrom.com'
    ];
    
    return supportedDomains.some(supported => domain && domain.includes(supported));
  }

  async sendMessageToBackground(message) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(message, resolve);
    });
  }

  showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
  }

  hideLoading() {
    document.getElementById('loading-state').classList.add('hidden');
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new PopupManager();
});