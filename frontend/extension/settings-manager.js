// ShopSavr Extension Settings and Preferences Management
// Handles user preferences, extension configuration, and settings UI

class SettingsManager {
  constructor() {
    this.defaultSettings = {
      // Coupon Settings
      autoApplyEnabled: true,
      autoApplyDelay: 3000,
      maxCouponsToTest: 10,
      showCouponNotifications: true,
      
      // Wishlist Settings
      autoAddToWishlist: false,
      wishlistNotifications: true,
      priceDropThreshold: 10, // percentage
      
      // Privacy Settings
      errorReportingEnabled: true,
      analyticsEnabled: true,
      shareUsageData: true,
      
      // Display Settings
      showSiteIndicator: true,
      widgetPosition: 'top-right',
      darkMode: false,
      compactMode: false,
      
      // Notification Settings
      showSuccessNotifications: true,
      showErrorNotifications: true,
      notificationDuration: 3000,
      soundEnabled: false,
      
      // Advanced Settings
      apiUrl: 'https://api.shopsavr.xyz',
      debugMode: false,
      syncEnabled: true,
      syncInterval: 300000, // 5 minutes
      
      // Site-specific Settings
      siteSettings: {},
      
      // Performance Settings
      maxCacheSize: 100,
      cacheExpiration: 3600000, // 1 hour
      
      // Accessibility Settings
      highContrast: false,
      reducedMotion: false,
      fontSize: 'medium'
    };
    
    this.currentSettings = {};
    this.settingsListeners = new Set();
    
    this.init();
  }

  async init() {
    // Load settings from storage
    await this.loadSettings();
    
    // Set up storage listeners
    this.setupStorageListeners();
    
    // Apply initial settings
    this.applySettings();
    
    console.log('SettingsManager initialized');
  }

  async loadSettings() {
    try {
      // Load from sync storage (user preferences)
      const syncResult = await chrome.storage.sync.get(Object.keys(this.defaultSettings));
      
      // Load from local storage (device-specific settings)
      const localResult = await chrome.storage.local.get(['siteSettings', 'debugMode']);
      
      // Merge with defaults
      this.currentSettings = {
        ...this.defaultSettings,
        ...syncResult,
        ...localResult
      };
      
      // Validate settings
      this.validateSettings();
      
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.currentSettings = { ...this.defaultSettings };
    }
  }

  validateSettings() {
    // Ensure numeric values are within valid ranges
    this.currentSettings.autoApplyDelay = Math.max(1000, Math.min(30000, this.currentSettings.autoApplyDelay));
    this.currentSettings.maxCouponsToTest = Math.max(1, Math.min(50, this.currentSettings.maxCouponsToTest));
    this.currentSettings.priceDropThreshold = Math.max(1, Math.min(100, this.currentSettings.priceDropThreshold));
    this.currentSettings.notificationDuration = Math.max(1000, Math.min(10000, this.currentSettings.notificationDuration));
    this.currentSettings.syncInterval = Math.max(60000, Math.min(3600000, this.currentSettings.syncInterval));
    this.currentSettings.maxCacheSize = Math.max(10, Math.min(1000, this.currentSettings.maxCacheSize));
    
    // Ensure string values are valid
    const validPositions = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
    if (!validPositions.includes(this.currentSettings.widgetPosition)) {
      this.currentSettings.widgetPosition = 'top-right';
    }
    
    const validFontSizes = ['small', 'medium', 'large'];
    if (!validFontSizes.includes(this.currentSettings.fontSize)) {
      this.currentSettings.fontSize = 'medium';
    }
    
    // Ensure URL is valid
    try {
      new URL(this.currentSettings.apiUrl);
    } catch {
      this.currentSettings.apiUrl = this.defaultSettings.apiUrl;
    }
  }

  setupStorageListeners() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      let settingsChanged = false;
      
      for (const [key, change] of Object.entries(changes)) {
        if (this.defaultSettings.hasOwnProperty(key)) {
          this.currentSettings[key] = change.newValue;
          settingsChanged = true;
        }
      }
      
      if (settingsChanged) {
        this.applySettings();
        this.notifyListeners();
      }
    });
  }

  applySettings() {
    // Apply visual settings
    this.applyVisualSettings();
    
    // Apply accessibility settings
    this.applyAccessibilitySettings();
    
    // Apply performance settings
    this.applyPerformanceSettings();
  }

  applyVisualSettings() {
    const root = document.documentElement;
    
    // Dark mode
    if (this.currentSettings.darkMode) {
      root.classList.add('shopsavr-dark-mode');
    } else {
      root.classList.remove('shopsavr-dark-mode');
    }
    
    // Compact mode
    if (this.currentSettings.compactMode) {
      root.classList.add('shopsavr-compact-mode');
    } else {
      root.classList.remove('shopsavr-compact-mode');
    }
    
    // Font size
    root.classList.remove('shopsavr-font-small', 'shopsavr-font-medium', 'shopsavr-font-large');
    root.classList.add(`shopsavr-font-${this.currentSettings.fontSize}`);
  }

  applyAccessibilitySettings() {
    const root = document.documentElement;
    
    // High contrast
    if (this.currentSettings.highContrast) {
      root.classList.add('shopsavr-high-contrast');
    } else {
      root.classList.remove('shopsavr-high-contrast');
    }
    
    // Reduced motion
    if (this.currentSettings.reducedMotion) {
      root.classList.add('shopsavr-reduced-motion');
    } else {
      root.classList.remove('shopsavr-reduced-motion');
    }
  }

  applyPerformanceSettings() {
    // Apply cache settings
    if (window.shopSavrCache) {
      window.shopSavrCache.setMaxSize(this.currentSettings.maxCacheSize);
      window.shopSavrCache.setExpiration(this.currentSettings.cacheExpiration);
    }
  }

  // Get setting value
  get(key) {
    return this.currentSettings[key];
  }

  // Set setting value
  async set(key, value) {
    if (!this.defaultSettings.hasOwnProperty(key)) {
      console.warn(`Unknown setting: ${key}`);
      return false;
    }
    
    this.currentSettings[key] = value;
    
    try {
      // Save to appropriate storage
      if (key === 'siteSettings' || key === 'debugMode') {
        await chrome.storage.local.set({ [key]: value });
      } else {
        await chrome.storage.sync.set({ [key]: value });
      }
      
      this.applySettings();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error(`Failed to save setting ${key}:`, error);
      return false;
    }
  }

  // Set multiple settings
  async setMultiple(settings) {
    const syncSettings = {};
    const localSettings = {};
    
    for (const [key, value] of Object.entries(settings)) {
      if (!this.defaultSettings.hasOwnProperty(key)) {
        console.warn(`Unknown setting: ${key}`);
        continue;
      }
      
      this.currentSettings[key] = value;
      
      if (key === 'siteSettings' || key === 'debugMode') {
        localSettings[key] = value;
      } else {
        syncSettings[key] = value;
      }
    }
    
    try {
      if (Object.keys(syncSettings).length > 0) {
        await chrome.storage.sync.set(syncSettings);
      }
      
      if (Object.keys(localSettings).length > 0) {
        await chrome.storage.local.set(localSettings);
      }
      
      this.applySettings();
      this.notifyListeners();
      return true;
    } catch (error) {
      console.error('Failed to save settings:', error);
      return false;
    }
  }

  // Get all settings
  getAll() {
    return { ...this.currentSettings };
  }

  // Reset to defaults
  async resetToDefaults() {
    try {
      // Clear storage
      await chrome.storage.sync.clear();
      await chrome.storage.local.clear();
      
      // Reset current settings
      this.currentSettings = { ...this.defaultSettings };
      
      // Save defaults
      await this.setMultiple(this.defaultSettings);
      
      return true;
    } catch (error) {
      console.error('Failed to reset settings:', error);
      return false;
    }
  }

  // Site-specific settings
  getSiteSetting(domain, key) {
    const siteSettings = this.currentSettings.siteSettings[domain] || {};
    return siteSettings[key];
  }

  async setSiteSetting(domain, key, value) {
    const siteSettings = { ...this.currentSettings.siteSettings };
    
    if (!siteSettings[domain]) {
      siteSettings[domain] = {};
    }
    
    siteSettings[domain][key] = value;
    
    return await this.set('siteSettings', siteSettings);
  }

  // Export/Import settings
  exportSettings() {
    return {
      version: '1.0',
      timestamp: Date.now(),
      settings: this.currentSettings
    };
  }

  async importSettings(settingsData) {
    try {
      if (!settingsData.settings || !settingsData.version) {
        throw new Error('Invalid settings format');
      }
      
      // Validate imported settings
      const validSettings = {};
      for (const [key, value] of Object.entries(settingsData.settings)) {
        if (this.defaultSettings.hasOwnProperty(key)) {
          validSettings[key] = value;
        }
      }
      
      await this.setMultiple(validSettings);
      return true;
    } catch (error) {
      console.error('Failed to import settings:', error);
      return false;
    }
  }

  // Settings UI
  createSettingsPanel() {
    const panel = document.createElement('div');
    panel.className = 'shopsavr-settings-panel';
    panel.innerHTML = this.getSettingsPanelHTML();
    
    this.attachSettingsEventListeners(panel);
    
    return panel;
  }

  getSettingsPanelHTML() {
    return `
      <div class="settings-overlay"></div>
      <div class="settings-content">
        <div class="settings-header">
          <h2>ShopSavr Settings</h2>
          <button class="settings-close">×</button>
        </div>
        
        <div class="settings-body">
          <div class="settings-tabs">
            <button class="settings-tab active" data-tab="general">General</button>
            <button class="settings-tab" data-tab="coupons">Coupons</button>
            <button class="settings-tab" data-tab="wishlist">Wishlist</button>
            <button class="settings-tab" data-tab="privacy">Privacy</button>
            <button class="settings-tab" data-tab="advanced">Advanced</button>
          </div>
          
          <div class="settings-panels">
            ${this.getGeneralSettingsHTML()}
            ${this.getCouponSettingsHTML()}
            ${this.getWishlistSettingsHTML()}
            ${this.getPrivacySettingsHTML()}
            ${this.getAdvancedSettingsHTML()}
          </div>
        </div>
        
        <div class="settings-footer">
          <button class="settings-reset">Reset to Defaults</button>
          <div class="settings-actions">
            <button class="settings-export">Export</button>
            <button class="settings-import">Import</button>
            <button class="settings-save">Save Changes</button>
          </div>
        </div>
      </div>
    `;
  }

  getGeneralSettingsHTML() {
    return `
      <div class="settings-panel" data-panel="general">
        <h3>General Settings</h3>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.showSiteIndicator ? 'checked' : ''} data-setting="showSiteIndicator">
            Show site support indicator
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Widget Position:</label>
          <select data-setting="widgetPosition">
            <option value="top-left" ${this.currentSettings.widgetPosition === 'top-left' ? 'selected' : ''}>Top Left</option>
            <option value="top-right" ${this.currentSettings.widgetPosition === 'top-right' ? 'selected' : ''}>Top Right</option>
            <option value="bottom-left" ${this.currentSettings.widgetPosition === 'bottom-left' ? 'selected' : ''}>Bottom Left</option>
            <option value="bottom-right" ${this.currentSettings.widgetPosition === 'bottom-right' ? 'selected' : ''}>Bottom Right</option>
          </select>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.darkMode ? 'checked' : ''} data-setting="darkMode">
            Dark mode
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.compactMode ? 'checked' : ''} data-setting="compactMode">
            Compact mode
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Font Size:</label>
          <select data-setting="fontSize">
            <option value="small" ${this.currentSettings.fontSize === 'small' ? 'selected' : ''}>Small</option>
            <option value="medium" ${this.currentSettings.fontSize === 'medium' ? 'selected' : ''}>Medium</option>
            <option value="large" ${this.currentSettings.fontSize === 'large' ? 'selected' : ''}>Large</option>
          </select>
        </div>
      </div>
    `;
  }

  getCouponSettingsHTML() {
    return `
      <div class="settings-panel" data-panel="coupons" style="display: none;">
        <h3>Coupon Settings</h3>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.autoApplyEnabled ? 'checked' : ''} data-setting="autoApplyEnabled">
            Enable automatic coupon application
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Auto-apply delay: <span id="delay-value">${this.currentSettings.autoApplyDelay / 1000}s</span></label>
          <input type="range" min="1" max="30" value="${this.currentSettings.autoApplyDelay / 1000}" data-setting="autoApplyDelay" data-multiplier="1000">
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Maximum coupons to test: <span id="max-coupons-value">${this.currentSettings.maxCouponsToTest}</span></label>
          <input type="range" min="1" max="50" value="${this.currentSettings.maxCouponsToTest}" data-setting="maxCouponsToTest">
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.showCouponNotifications ? 'checked' : ''} data-setting="showCouponNotifications">
            Show coupon notifications
          </label>
        </div>
      </div>
    `;
  }

  getWishlistSettingsHTML() {
    return `
      <div class="settings-panel" data-panel="wishlist" style="display: none;">
        <h3>Wishlist Settings</h3>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.autoAddToWishlist ? 'checked' : ''} data-setting="autoAddToWishlist">
            Automatically add viewed products to wishlist
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.wishlistNotifications ? 'checked' : ''} data-setting="wishlistNotifications">
            Enable wishlist notifications
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Price drop alert threshold: <span id="threshold-value">${this.currentSettings.priceDropThreshold}%</span></label>
          <input type="range" min="1" max="100" value="${this.currentSettings.priceDropThreshold}" data-setting="priceDropThreshold">
        </div>
      </div>
    `;
  }

  getPrivacySettingsHTML() {
    return `
      <div class="settings-panel" data-panel="privacy" style="display: none;">
        <h3>Privacy Settings</h3>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.errorReportingEnabled ? 'checked' : ''} data-setting="errorReportingEnabled">
            Enable error reporting
          </label>
          <small>Help us improve ShopSavr by sending anonymous error reports</small>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.analyticsEnabled ? 'checked' : ''} data-setting="analyticsEnabled">
            Enable analytics
          </label>
          <small>Anonymous usage statistics to help us understand how ShopSavr is used</small>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.shareUsageData ? 'checked' : ''} data-setting="shareUsageData">
            Share usage data
          </label>
          <small>Help us improve coupon success rates by sharing anonymous usage data</small>
        </div>
      </div>
    `;
  }

  getAdvancedSettingsHTML() {
    return `
      <div class="settings-panel" data-panel="advanced" style="display: none;">
        <h3>Advanced Settings</h3>
        
        <div class="setting-group">
          <label class="setting-label">API URL:</label>
          <input type="url" value="${this.currentSettings.apiUrl}" data-setting="apiUrl">
          <small>Only change this if you're using a custom ShopSavr server</small>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.syncEnabled ? 'checked' : ''} data-setting="syncEnabled">
            Enable data synchronization
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">Sync interval: <span id="sync-interval-value">${this.currentSettings.syncInterval / 60000}min</span></label>
          <input type="range" min="1" max="60" value="${this.currentSettings.syncInterval / 60000}" data-setting="syncInterval" data-multiplier="60000">
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.debugMode ? 'checked' : ''} data-setting="debugMode">
            Enable debug mode
          </label>
          <small>Shows additional logging information in the console</small>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.highContrast ? 'checked' : ''} data-setting="highContrast">
            High contrast mode
          </label>
        </div>
        
        <div class="setting-group">
          <label class="setting-label">
            <input type="checkbox" ${this.currentSettings.reducedMotion ? 'checked' : ''} data-setting="reducedMotion">
            Reduce motion
          </label>
        </div>
      </div>
    `;
  }

  attachSettingsEventListeners(panel) {
    // Tab switching
    panel.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        
        // Update active tab
        panel.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding panel
        panel.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
        panel.querySelector(`[data-panel="${tabName}"]`).style.display = 'block';
      });
    });

    // Setting inputs
    panel.querySelectorAll('[data-setting]').forEach(input => {
      input.addEventListener('change', () => {
        const setting = input.dataset.setting;
        let value = input.type === 'checkbox' ? input.checked : input.value;
        
        // Apply multiplier if specified
        if (input.dataset.multiplier) {
          value = parseFloat(value) * parseFloat(input.dataset.multiplier);
        }
        
        this.set(setting, value);
        
        // Update display values for range inputs
        this.updateRangeDisplays(panel);
      });
    });

    // Range input display updates
    panel.querySelectorAll('input[type="range"]').forEach(range => {
      range.addEventListener('input', () => {
        this.updateRangeDisplays(panel);
      });
    });

    // Close button
    panel.querySelector('.settings-close').addEventListener('click', () => {
      panel.remove();
    });

    // Overlay click
    panel.querySelector('.settings-overlay').addEventListener('click', () => {
      panel.remove();
    });

    // Action buttons
    panel.querySelector('.settings-reset').addEventListener('click', async () => {
      if (confirm('Are you sure you want to reset all settings to defaults?')) {
        await this.resetToDefaults();
        panel.remove();
        // Recreate panel with new values
        const newPanel = this.createSettingsPanel();
        document.body.appendChild(newPanel);
      }
    });

    panel.querySelector('.settings-export').addEventListener('click', () => {
      this.exportSettingsToFile();
    });

    panel.querySelector('.settings-import').addEventListener('click', () => {
      this.importSettingsFromFile();
    });

    panel.querySelector('.settings-save').addEventListener('click', () => {
      panel.remove();
    });
  }

  updateRangeDisplays(panel) {
    const delayRange = panel.querySelector('[data-setting="autoApplyDelay"]');
    if (delayRange) {
      panel.querySelector('#delay-value').textContent = `${delayRange.value}s`;
    }

    const maxCouponsRange = panel.querySelector('[data-setting="maxCouponsToTest"]');
    if (maxCouponsRange) {
      panel.querySelector('#max-coupons-value').textContent = maxCouponsRange.value;
    }

    const thresholdRange = panel.querySelector('[data-setting="priceDropThreshold"]');
    if (thresholdRange) {
      panel.querySelector('#threshold-value').textContent = `${thresholdRange.value}%`;
    }

    const syncRange = panel.querySelector('[data-setting="syncInterval"]');
    if (syncRange) {
      panel.querySelector('#sync-interval-value').textContent = `${syncRange.value}min`;
    }
  }

  exportSettingsToFile() {
    const settingsData = this.exportSettings();
    const blob = new Blob([JSON.stringify(settingsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopsavr-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  }

  importSettingsFromFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const settingsData = JSON.parse(text);
        
        const success = await this.importSettings(settingsData);
        if (success) {
          alert('Settings imported successfully!');
          // Refresh the page to apply new settings
          window.location.reload();
        } else {
          alert('Failed to import settings. Please check the file format.');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Failed to import settings. Invalid file format.');
      }
    });
    
    input.click();
  }

  // Event system
  addListener(callback) {
    this.settingsListeners.add(callback);
  }

  removeListener(callback) {
    this.settingsListeners.delete(callback);
  }

  notifyListeners() {
    this.settingsListeners.forEach(callback => {
      try {
        callback(this.currentSettings);
      } catch (error) {
        console.error('Settings listener error:', error);
      }
    });
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsManager;
} else {
  window.SettingsManager = SettingsManager;
}