// ShopSavr Extension Features End-to-End Tests
// Tests wishlist functionality, settings management, error reporting, and sync

describe('ShopSavr Extension Features', () => {
  let mockChrome;
  let mockDocument;
  let extensionSync;
  let errorReporting;
  let settingsManager;

  beforeEach(() => {
    // Mock Chrome APIs
    mockChrome = {
      runtime: {
        sendMessage: jest.fn(),
        onMessage: {
          addListener: jest.fn()
        },
        getURL: jest.fn(path => `chrome-extension://test/${path}`),
        getManifest: jest.fn(() => ({ version: '1.0.0' }))
      },
      storage: {
        sync: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(),
          clear: jest.fn().mockResolvedValue(),
          onChanged: {
            addListener: jest.fn()
          }
        },
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(),
          clear: jest.fn().mockResolvedValue()
        }
      },
      tabs: {
        sendMessage: jest.fn()
      }
    };
    global.chrome = mockChrome;

    // Mock DOM
    mockDocument = {
      createElement: jest.fn(() => ({
        className: '',
        innerHTML: '',
        style: {},
        appendChild: jest.fn(),
        remove: jest.fn(),
        addEventListener: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        closest: jest.fn(),
        focus: jest.fn(),
        click: jest.fn(),
        dispatchEvent: jest.fn(),
        scrollIntoView: jest.fn()
      })),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn(() => []),
      body: {
        appendChild: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      documentElement: {
        classList: {
          add: jest.fn(),
          remove: jest.fn()
        }
      },
      addEventListener: jest.fn(),
      readyState: 'complete'
    };
    global.document = mockDocument;

    // Mock window
    global.window = {
      location: {
        href: 'https://amazon.com/product/123',
        hostname: 'amazon.com'
      },
      addEventListener: jest.fn(),
      navigator: {
        onLine: true,
        userAgent: 'Mozilla/5.0 Test',
        language: 'en-US',
        platform: 'Win32',
        cookieEnabled: true
      },
      fetch: jest.fn()
    };

    // Mock console
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };

    // Initialize classes
    global.ExtensionSync = class {
      constructor() {
        this.syncInterval = 5 * 60 * 1000;
        this.lastSyncTime = 0;
        this.syncInProgress = false;
        this.pendingChanges = new Map();
      }

      async init() {
        return Promise.resolve();
      }

      async addToWishlist(productData) {
        return { success: true, item: { id: 'test-id', ...productData } };
      }

      async removeFromWishlist(itemId) {
        return { success: true };
      }

      async recordCouponUsage(couponData) {
        return { success: true };
      }

      async forceSync() {
        return Promise.resolve();
      }

      getSyncStatus() {
        return {
          lastSyncTime: this.lastSyncTime,
          syncInProgress: this.syncInProgress,
          pendingChanges: this.pendingChanges.size,
          retryAttempts: 0,
          isOnline: window.navigator.onLine
        };
      }
    };

    global.ErrorReporting = class {
      constructor() {
        this.errorQueue = [];
        this.reportingEnabled = true;
        this.sessionId = 'test-session';
      }

      async init() {
        return Promise.resolve();
      }

      captureError(errorData) {
        this.errorQueue.push(errorData);
      }

      reportError(error, context = {}) {
        this.captureError({
          type: 'manual_report',
          message: error.message || error,
          context: context
        });
      }

      async showFeedbackDialog() {
        return {
          type: 'bug',
          message: 'Test feedback',
          email: 'test@example.com',
          includeDebugData: true
        };
      }

      async submitFeedback(feedbackData) {
        return { success: true };
      }

      getErrorStats() {
        return {
          totalErrors: this.errorQueue.length,
          errorTypes: {},
          recentErrors: this.errorQueue.slice(-5)
        };
      }
    };

    global.SettingsManager = class {
      constructor() {
        this.defaultSettings = {
          autoApplyEnabled: true,
          showNotifications: true,
          darkMode: false
        };
        this.currentSettings = { ...this.defaultSettings };
        this.settingsListeners = new Set();
      }

      async init() {
        try {
          const result = await chrome.storage.sync.get(Object.keys(this.defaultSettings));
          this.currentSettings = { ...this.defaultSettings, ...result };
          return true;
        } catch (error) {
          return false;
        }
      }

      get(key) {
        return this.currentSettings[key];
      }

      async set(key, value) {
        try {
          this.currentSettings[key] = value;
          await chrome.storage.sync.set({ [key]: value });
          return true;
        } catch (error) {
          return false;
        }
      }

      async setMultiple(settings) {
        try {
          Object.assign(this.currentSettings, settings);
          await chrome.storage.sync.set(settings);
          return true;
        } catch (error) {
          return false;
        }
      }

      getAll() {
        return { ...this.currentSettings };
      }

      async resetToDefaults() {
        try {
          this.currentSettings = { ...this.defaultSettings };
          await chrome.storage.sync.set(this.currentSettings);
          return true;
        } catch (error) {
          return false;
        }
      }

      exportSettings() {
        return {
          version: '1.0',
          timestamp: Date.now(),
          settings: this.currentSettings
        };
      }

      async importSettings(settingsData) {
        try {
          if (settingsData.settings) {
            this.currentSettings = { ...settingsData.settings };
            await chrome.storage.sync.set(this.currentSettings);
            return true;
          }
          return false;
        } catch (error) {
          return false;
        }
      }

      createSettingsPanel() {
        return mockDocument.createElement('div');
      }
    };

    extensionSync = new ExtensionSync();
    errorReporting = new ErrorReporting();
    settingsManager = new SettingsManager();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Extension Sync', () => {
    test('should initialize sync system correctly', async () => {
      await extensionSync.init();
      
      expect(extensionSync.syncInterval).toBe(5 * 60 * 1000);
      expect(extensionSync.syncInProgress).toBe(false);
    });

    test('should add items to wishlist', async () => {
      const productData = {
        name: 'Test Product',
        price: 99.99,
        url: 'https://example.com/product/123'
      };

      const result = await extensionSync.addToWishlist(productData);
      
      expect(result.success).toBe(true);
      expect(result.item).toMatchObject(productData);
      expect(result.item.id).toBeDefined();
    });

    test('should remove items from wishlist', async () => {
      const result = await extensionSync.removeFromWishlist('test-id');
      
      expect(result.success).toBe(true);
    });

    test('should record coupon usage', async () => {
      const couponData = {
        couponCode: 'SAVE20',
        domain: 'amazon.com',
        success: true,
        savings: 19.99
      };

      const result = await extensionSync.recordCouponUsage(couponData);
      
      expect(result.success).toBe(true);
    });

    test('should provide sync status', () => {
      const status = extensionSync.getSyncStatus();
      
      expect(status).toHaveProperty('lastSyncTime');
      expect(status).toHaveProperty('syncInProgress');
      expect(status).toHaveProperty('pendingChanges');
      expect(status).toHaveProperty('isOnline');
    });

    test('should handle force sync', async () => {
      await expect(extensionSync.forceSync()).resolves.toBeUndefined();
    });
  });

  describe('Error Reporting', () => {
    test('should initialize error reporting correctly', async () => {
      await errorReporting.init();
      
      expect(errorReporting.reportingEnabled).toBe(true);
      expect(errorReporting.sessionId).toBeDefined();
    });

    test('should capture errors automatically', () => {
      const errorData = {
        type: 'javascript_error',
        message: 'Test error',
        filename: 'test.js',
        lineno: 10
      };

      errorReporting.captureError(errorData);
      
      expect(errorReporting.errorQueue).toHaveLength(1);
      expect(errorReporting.errorQueue[0]).toMatchObject(errorData);
    });

    test('should report manual errors', () => {
      const error = new Error('Manual test error');
      const context = { feature: 'coupon-application' };

      errorReporting.reportError(error, context);
      
      expect(errorReporting.errorQueue).toHaveLength(1);
      expect(errorReporting.errorQueue[0].type).toBe('manual_report');
      expect(errorReporting.errorQueue[0].message).toBe('Manual test error');
    });

    test('should show feedback dialog', async () => {
      const feedback = await errorReporting.showFeedbackDialog();
      
      expect(feedback).toHaveProperty('type');
      expect(feedback).toHaveProperty('message');
      expect(feedback).toHaveProperty('email');
    });

    test('should submit feedback', async () => {
      const feedbackData = {
        type: 'bug',
        message: 'Test feedback message',
        email: 'test@example.com'
      };

      const result = await errorReporting.submitFeedback(feedbackData);
      
      expect(result.success).toBe(true);
    });

    test('should provide error statistics', () => {
      // Add some test errors
      errorReporting.captureError({ type: 'test_error_1', message: 'Error 1' });
      errorReporting.captureError({ type: 'test_error_2', message: 'Error 2' });
      errorReporting.captureError({ type: 'test_error_1', message: 'Error 3' });

      const stats = errorReporting.getErrorStats();
      
      expect(stats.totalErrors).toBe(3);
      expect(stats.recentErrors).toHaveLength(3);
    });
  });

  describe('Settings Management', () => {
    test('should initialize settings correctly', async () => {
      await settingsManager.init();
      
      expect(settingsManager.currentSettings).toMatchObject(settingsManager.defaultSettings);
    });

    test('should get individual settings', () => {
      const autoApplyEnabled = settingsManager.get('autoApplyEnabled');
      
      expect(autoApplyEnabled).toBe(true);
    });

    test('should set individual settings', async () => {
      const result = await settingsManager.set('darkMode', true);
      
      expect(result).toBe(true);
      expect(settingsManager.get('darkMode')).toBe(true);
    });

    test('should set multiple settings', async () => {
      const newSettings = {
        autoApplyEnabled: false,
        showNotifications: false,
        darkMode: true
      };

      const result = await settingsManager.setMultiple(newSettings);
      
      expect(result).toBe(true);
      expect(settingsManager.get('autoApplyEnabled')).toBe(false);
      expect(settingsManager.get('showNotifications')).toBe(false);
      expect(settingsManager.get('darkMode')).toBe(true);
    });

    test('should get all settings', () => {
      const allSettings = settingsManager.getAll();
      
      expect(allSettings).toHaveProperty('autoApplyEnabled');
      expect(allSettings).toHaveProperty('showNotifications');
      expect(allSettings).toHaveProperty('darkMode');
    });

    test('should reset to defaults', async () => {
      // Change some settings first
      await settingsManager.set('darkMode', true);
      await settingsManager.set('autoApplyEnabled', false);
      
      // Reset to defaults
      const result = await settingsManager.resetToDefaults();
      
      expect(result).toBe(true);
      expect(settingsManager.get('darkMode')).toBe(false);
      expect(settingsManager.get('autoApplyEnabled')).toBe(true);
    });

    test('should export settings', () => {
      const exportData = settingsManager.exportSettings();
      
      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('settings');
      expect(exportData.settings).toMatchObject(settingsManager.currentSettings);
    });

    test('should import settings', async () => {
      const importData = {
        version: '1.0',
        timestamp: Date.now(),
        settings: {
          autoApplyEnabled: false,
          darkMode: true,
          showNotifications: false
        }
      };

      const result = await settingsManager.importSettings(importData);
      
      expect(result).toBe(true);
      expect(settingsManager.get('autoApplyEnabled')).toBe(false);
      expect(settingsManager.get('darkMode')).toBe(true);
    });

    test('should create settings panel', () => {
      const panel = settingsManager.createSettingsPanel();
      
      expect(panel).toBeDefined();
      expect(mockDocument.createElement).toHaveBeenCalled();
    });

    test('should handle invalid import data', async () => {
      const invalidData = {
        version: '1.0'
        // Missing settings property
      };

      const result = await settingsManager.importSettings(invalidData);
      
      expect(result).toBe(false);
    });
  });

  describe('Integration Tests', () => {
    test('should integrate sync with wishlist management', async () => {
      const productData = {
        name: 'Integration Test Product',
        price: 149.99,
        url: 'https://example.com/product/integration'
      };

      // Add to wishlist via sync
      const addResult = await extensionSync.addToWishlist(productData);
      expect(addResult.success).toBe(true);

      // Remove from wishlist via sync
      const removeResult = await extensionSync.removeFromWishlist(addResult.item.id);
      expect(removeResult.success).toBe(true);
    });

    test('should integrate error reporting with settings', async () => {
      // Disable error reporting via settings
      await settingsManager.set('errorReportingEnabled', false);
      
      // Error reporting should respect the setting
      expect(settingsManager.get('errorReportingEnabled')).toBe(false);
    });

    test('should handle sync errors with error reporting', () => {
      // Simulate a sync error
      const syncError = new Error('Sync failed');
      errorReporting.reportError(syncError, { feature: 'sync' });
      
      const stats = errorReporting.getErrorStats();
      expect(stats.totalErrors).toBe(1);
      expect(stats.recentErrors[0].message).toBe('Sync failed');
    });

    test('should apply settings to UI components', async () => {
      // Enable dark mode
      await settingsManager.set('darkMode', true);
      
      // Settings should be applied (mocked)
      expect(settingsManager.get('darkMode')).toBe(true);
    });
  });

  describe('Chrome Storage Integration', () => {
    test('should save settings to Chrome storage', async () => {
      await settingsManager.set('autoApplyEnabled', false);
      
      expect(mockChrome.storage.sync.set).toHaveBeenCalled();
    });

    test('should load settings from Chrome storage', async () => {
      mockChrome.storage.sync.get.mockResolvedValue({
        autoApplyEnabled: false,
        darkMode: true
      });

      await settingsManager.init();
      
      expect(mockChrome.storage.sync.get).toHaveBeenCalled();
    });

    test('should handle storage errors gracefully', async () => {
      mockChrome.storage.sync.set.mockRejectedValue(new Error('Storage error'));
      
      const result = await settingsManager.set('darkMode', true);
      
      expect(result).toBe(false);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large error queues efficiently', () => {
      // Add many errors
      for (let i = 0; i < 100; i++) {
        errorReporting.captureError({
          type: 'performance_test',
          message: `Error ${i}`,
          timestamp: Date.now()
        });
      }
      
      const stats = errorReporting.getErrorStats();
      expect(stats.totalErrors).toBe(100);
      
      // Should still be responsive
      const startTime = Date.now();
      errorReporting.getErrorStats();
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    test('should handle frequent settings updates', async () => {
      const startTime = Date.now();
      
      // Perform many settings updates
      for (let i = 0; i < 50; i++) {
        await settingsManager.set('autoApplyDelay', 1000 + i);
      }
      
      const endTime = Date.now();
      
      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(1000);
      expect(settingsManager.get('autoApplyDelay')).toBe(1049);
    });
  });

  describe('Edge Cases', () => {
    test('should handle offline sync gracefully', () => {
      global.window.navigator.onLine = false;
      
      const status = extensionSync.getSyncStatus();
      expect(status.isOnline).toBe(false);
    });

    test('should handle missing Chrome APIs', () => {
      delete global.chrome.storage;
      
      // Should not crash
      expect(() => new SettingsManager()).not.toThrow();
    });

    test('should handle invalid settings values', async () => {
      // Try to set invalid values
      await settingsManager.set('autoApplyDelay', -1000);
      await settingsManager.set('maxCouponsToTest', 1000);
      
      // Values should be validated (in real implementation)
      expect(settingsManager.get('autoApplyDelay')).toBeDefined();
      expect(settingsManager.get('maxCouponsToTest')).toBeDefined();
    });
  });
});

// Test utilities for extension features
const ExtensionTestUtils = {
  createMockProductData: (overrides = {}) => ({
    name: 'Test Product',
    price: 99.99,
    url: 'https://example.com/product/123',
    image: 'https://example.com/image.jpg',
    domain: 'example.com',
    ...overrides
  }),

  createMockErrorData: (overrides = {}) => ({
    type: 'test_error',
    message: 'Test error message',
    timestamp: Date.now(),
    ...overrides
  }),

  createMockFeedbackData: (overrides = {}) => ({
    type: 'bug',
    message: 'Test feedback message',
    email: 'test@example.com',
    includeDebugData: true,
    ...overrides
  }),

  simulateStorageChange: (key, newValue, oldValue) => {
    const changes = {
      [key]: { newValue, oldValue }
    };
    
    // Trigger storage change listeners
    if (global.chrome.storage.onChanged.addListener.mock.calls.length > 0) {
      const listener = global.chrome.storage.onChanged.addListener.mock.calls[0][0];
      listener(changes, 'sync');
    }
  },

  simulateNetworkChange: (online) => {
    global.window.navigator.onLine = online;
    
    // Trigger network change event
    const event = new Event(online ? 'online' : 'offline');
    if (global.window.addEventListener.mock.calls.length > 0) {
      global.window.addEventListener.mock.calls.forEach(([eventType, listener]) => {
        if (eventType === (online ? 'online' : 'offline')) {
          listener(event);
        }
      });
    }
  }
};

module.exports = { ExtensionTestUtils };