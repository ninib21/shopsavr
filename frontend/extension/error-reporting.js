// ShopSavr Extension Error Reporting and User Feedback System
// Handles error collection, reporting, and user feedback

class ErrorReporting {
  constructor() {
    this.errorQueue = [];
    this.maxQueueSize = 50;
    this.reportingEnabled = true;
    this.userId = null;
    this.sessionId = this.generateSessionId();
    
    this.init();
  }

  async init() {
    // Load user preferences
    const result = await chrome.storage.sync.get(['errorReportingEnabled', 'userId']);
    this.reportingEnabled = result.errorReportingEnabled !== false; // Default to true
    this.userId = result.userId;

    // Set up global error handlers
    this.setupErrorHandlers();

    // Load queued errors from storage
    await this.loadQueuedErrors();

    console.log('ErrorReporting initialized');
  }

  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError({
        type: 'javascript_error',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now()
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError({
        type: 'unhandled_promise_rejection',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: Date.now()
      });
    });

    // Chrome extension specific error handler
    if (chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'reportError') {
          this.captureError(request.error);
          sendResponse({ success: true });
        }
      });
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async loadQueuedErrors() {
    try {
      const result = await chrome.storage.local.get(['errorQueue']);
      if (result.errorQueue) {
        this.errorQueue = result.errorQueue;
        
        // Try to send queued errors if we're online
        if (navigator.onLine && this.errorQueue.length > 0) {
          await this.sendQueuedErrors();
        }
      }
    } catch (error) {
      console.error('Failed to load queued errors:', error);
    }
  }

  captureError(errorData) {
    if (!this.reportingEnabled) {
      return;
    }

    // Enhance error data with context
    const enhancedError = {
      ...errorData,
      sessionId: this.sessionId,
      userId: this.userId,
      url: window.location?.href,
      userAgent: navigator.userAgent,
      timestamp: errorData.timestamp || Date.now(),
      extensionVersion: chrome.runtime?.getManifest()?.version,
      context: this.getContextInfo()
    };

    // Add to queue
    this.errorQueue.push(enhancedError);

    // Limit queue size
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }

    // Save to storage
    this.saveErrorQueue();

    // Try to send immediately if online
    if (navigator.onLine) {
      this.sendQueuedErrors();
    }

    // Log locally for debugging
    console.error('ShopSavr Error Captured:', enhancedError);
  }

  getContextInfo() {
    return {
      domain: window.location?.hostname,
      isCheckoutPage: this.isCheckoutPage(),
      hasShopSavrWidget: !!document.querySelector('.shopsavr-coupon-widget'),
      activeFeatures: this.getActiveFeatures(),
      browserInfo: {
        language: navigator.language,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      }
    };
  }

  isCheckoutPage() {
    const url = window.location?.href?.toLowerCase() || '';
    const checkoutKeywords = ['checkout', 'cart', 'basket', 'bag', 'payment', 'billing'];
    return checkoutKeywords.some(keyword => url.includes(keyword));
  }

  getActiveFeatures() {
    return {
      couponWidget: !!document.querySelector('.shopsavr-coupon-widget'),
      automationRunning: !!document.querySelector('.shopsavr-automation-widget'),
      wishlistButton: !!document.querySelector('.shopsavr-wishlist-btn'),
      priceIndicators: document.querySelectorAll('.shopsavr-price-indicator').length
    };
  }

  async saveErrorQueue() {
    try {
      await chrome.storage.local.set({ errorQueue: this.errorQueue });
    } catch (error) {
      console.error('Failed to save error queue:', error);
    }
  }

  async sendQueuedErrors() {
    if (this.errorQueue.length === 0 || !navigator.onLine) {
      return;
    }

    try {
      const response = await this.makeApiRequest('/errors/report', {
        method: 'POST',
        body: JSON.stringify({
          errors: this.errorQueue,
          sessionId: this.sessionId,
          timestamp: Date.now()
        })
      });

      if (response.success) {
        // Clear sent errors
        this.errorQueue = [];
        await this.saveErrorQueue();
        console.log('Error reports sent successfully');
      }
    } catch (error) {
      console.error('Failed to send error reports:', error);
      // Keep errors in queue for next attempt
    }
  }

  async makeApiRequest(endpoint, options = {}) {
    try {
      const authResult = await chrome.storage.local.get(['authToken', 'apiUrl']);
      const apiUrl = authResult.apiUrl || 'https://api.shopsavr.xyz';
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers
      };

      if (authResult.authToken) {
        headers['Authorization'] = `Bearer ${authResult.authToken}`;
      }

      const response = await fetch(`${apiUrl}/api${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      // Don't report errors from error reporting to avoid loops
      console.error('Error reporting API request failed:', error);
      throw error;
    }
  }

  // Public methods for manual error reporting
  reportError(error, context = {}) {
    this.captureError({
      type: 'manual_report',
      message: error.message || error,
      stack: error.stack,
      context: context,
      timestamp: Date.now()
    });
  }

  reportCouponError(couponCode, domain, errorMessage) {
    this.captureError({
      type: 'coupon_application_error',
      message: errorMessage,
      couponCode: couponCode,
      domain: domain,
      timestamp: Date.now()
    });
  }

  reportSiteCompatibilityIssue(domain, issue) {
    this.captureError({
      type: 'site_compatibility_issue',
      message: issue,
      domain: domain,
      timestamp: Date.now()
    });
  }

  // User feedback system
  async showFeedbackDialog() {
    const dialog = this.createFeedbackDialog();
    document.body.appendChild(dialog);
    
    return new Promise((resolve) => {
      dialog.addEventListener('feedback-submitted', (event) => {
        resolve(event.detail);
        dialog.remove();
      });
      
      dialog.addEventListener('feedback-cancelled', () => {
        resolve(null);
        dialog.remove();
      });
    });
  }

  createFeedbackDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'shopsavr-feedback-dialog';
    dialog.innerHTML = `
      <div class="feedback-overlay"></div>
      <div class="feedback-content">
        <div class="feedback-header">
          <h3>Send Feedback to ShopSavr</h3>
          <button class="feedback-close">×</button>
        </div>
        <div class="feedback-body">
          <div class="feedback-type">
            <label>Feedback Type:</label>
            <select id="feedback-type">
              <option value="bug">Bug Report</option>
              <option value="feature">Feature Request</option>
              <option value="improvement">Improvement Suggestion</option>
              <option value="general">General Feedback</option>
            </select>
          </div>
          <div class="feedback-message">
            <label>Message:</label>
            <textarea id="feedback-message" placeholder="Please describe your feedback in detail..." rows="5"></textarea>
          </div>
          <div class="feedback-email">
            <label>Email (optional):</label>
            <input type="email" id="feedback-email" placeholder="your@email.com">
            <small>We'll only use this to follow up on your feedback</small>
          </div>
          <div class="feedback-include-data">
            <label>
              <input type="checkbox" id="include-debug-data" checked>
              Include debug information to help us resolve issues
            </label>
          </div>
        </div>
        <div class="feedback-footer">
          <button class="feedback-cancel">Cancel</button>
          <button class="feedback-submit">Send Feedback</button>
        </div>
      </div>
    `;

    // Add event listeners
    dialog.querySelector('.feedback-close').addEventListener('click', () => {
      dialog.dispatchEvent(new CustomEvent('feedback-cancelled'));
    });

    dialog.querySelector('.feedback-overlay').addEventListener('click', () => {
      dialog.dispatchEvent(new CustomEvent('feedback-cancelled'));
    });

    dialog.querySelector('.feedback-cancel').addEventListener('click', () => {
      dialog.dispatchEvent(new CustomEvent('feedback-cancelled'));
    });

    dialog.querySelector('.feedback-submit').addEventListener('click', () => {
      const type = dialog.querySelector('#feedback-type').value;
      const message = dialog.querySelector('#feedback-message').value.trim();
      const email = dialog.querySelector('#feedback-email').value.trim();
      const includeDebugData = dialog.querySelector('#include-debug-data').checked;

      if (!message) {
        alert('Please enter a message');
        return;
      }

      const feedbackData = {
        type,
        message,
        email: email || null,
        includeDebugData,
        timestamp: Date.now()
      };

      dialog.dispatchEvent(new CustomEvent('feedback-submitted', { detail: feedbackData }));
    });

    return dialog;
  }

  async submitFeedback(feedbackData) {
    try {
      const payload = {
        ...feedbackData,
        sessionId: this.sessionId,
        userId: this.userId,
        context: feedbackData.includeDebugData ? this.getContextInfo() : null,
        extensionVersion: chrome.runtime?.getManifest()?.version
      };

      const response = await this.makeApiRequest('/feedback/submit', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (response.success) {
        this.showMessage('Thank you for your feedback!', 'success');
        return { success: true };
      } else {
        throw new Error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      this.showMessage('Failed to send feedback. Please try again later.', 'error');
      return { success: false, error: error.message };
    }
  }

  showMessage(text, type = 'info') {
    const message = document.createElement('div');
    message.className = `shopsavr-message shopsavr-message-${type}`;
    message.textContent = text;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
      if (message.parentNode) {
        message.remove();
      }
    }, 3000);
  }

  // Settings management
  async updateSettings(settings) {
    if (settings.hasOwnProperty('errorReportingEnabled')) {
      this.reportingEnabled = settings.errorReportingEnabled;
      await chrome.storage.sync.set({ errorReportingEnabled: this.reportingEnabled });
    }

    if (settings.hasOwnProperty('userId')) {
      this.userId = settings.userId;
      await chrome.storage.sync.set({ userId: this.userId });
    }
  }

  // Get error statistics
  getErrorStats() {
    const stats = {
      totalErrors: this.errorQueue.length,
      errorTypes: {},
      recentErrors: this.errorQueue.slice(-5)
    };

    this.errorQueue.forEach(error => {
      stats.errorTypes[error.type] = (stats.errorTypes[error.type] || 0) + 1;
    });

    return stats;
  }

  // Clear error queue (for testing or privacy)
  async clearErrorQueue() {
    this.errorQueue = [];
    await this.saveErrorQueue();
  }

  // Enable/disable error reporting
  async setErrorReporting(enabled) {
    this.reportingEnabled = enabled;
    await chrome.storage.sync.set({ errorReportingEnabled: enabled });
    
    if (!enabled) {
      await this.clearErrorQueue();
    }
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ErrorReporting;
} else {
  window.ErrorReporting = ErrorReporting;
}