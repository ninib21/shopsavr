// ShopSavr Extension Sync and Update Management
// Handles data synchronization between extension and backend

class ExtensionSync {
  constructor() {
    this.syncInterval = 5 * 60 * 1000; // 5 minutes
    this.lastSyncTime = 0;
    this.syncInProgress = false;
    this.pendingChanges = new Map();
    this.retryAttempts = 0;
    this.maxRetries = 3;
    
    this.init();
  }

  async init() {
    // Load last sync time from storage
    const result = await chrome.storage.local.get(['lastSyncTime', 'pendingChanges']);
    this.lastSyncTime = result.lastSyncTime || 0;
    this.pendingChanges = new Map(result.pendingChanges || []);

    // Start periodic sync
    this.startPeriodicSync();

    // Listen for online/offline events
    this.setupNetworkListeners();

    // Listen for storage changes
    this.setupStorageListeners();

    console.log('ExtensionSync initialized');
  }

  startPeriodicSync() {
    setInterval(async () => {
      if (!this.syncInProgress && navigator.onLine) {
        await this.performSync();
      }
    }, this.syncInterval);

    // Initial sync if we haven't synced recently
    if (Date.now() - this.lastSyncTime > this.syncInterval) {
      setTimeout(() => this.performSync(), 2000);
    }
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Network connection restored, syncing...');
      setTimeout(() => this.performSync(), 1000);
    });

    window.addEventListener('offline', () => {
      console.log('Network connection lost, sync paused');
    });
  }

  setupStorageListeners() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace === 'sync') {
        // Handle sync storage changes
        this.handleSyncStorageChanges(changes);
      }
    });
  }

  async performSync() {
    if (this.syncInProgress || !navigator.onLine) {
      return;
    }

    this.syncInProgress = true;
    console.log('Starting extension sync...');

    try {
      // Get auth token
      const authResult = await chrome.storage.local.get(['authToken']);
      if (!authResult.authToken) {
        console.log('No auth token, skipping sync');
        return;
      }

      // Sync user data
      await this.syncUserData();

      // Sync wishlist
      await this.syncWishlist();

      // Sync savings data
      await this.syncSavingsData();

      // Sync user preferences
      await this.syncUserPreferences();

      // Process pending changes
      await this.processPendingChanges();

      // Update last sync time
      this.lastSyncTime = Date.now();
      await chrome.storage.local.set({ lastSyncTime: this.lastSyncTime });

      this.retryAttempts = 0;
      console.log('Extension sync completed successfully');

    } catch (error) {
      console.error('Extension sync failed:', error);
      this.handleSyncError(error);
    } finally {
      this.syncInProgress = false;
    }
  }

  async syncUserData() {
    try {
      const response = await this.makeApiRequest('/auth/profile');
      
      if (response.success) {
        await chrome.storage.local.set({
          user: response.user,
          userSyncTime: Date.now()
        });
      }
    } catch (error) {
      console.error('Failed to sync user data:', error);
      throw error;
    }
  }

  async syncWishlist() {
    try {
      // Get local wishlist
      const localResult = await chrome.storage.local.get(['wishlist', 'wishlistSyncTime']);
      const localWishlist = localResult.wishlist || [];
      const lastWishlistSync = localResult.wishlistSyncTime || 0;

      // Get server wishlist
      const response = await this.makeApiRequest('/wishlist');
      
      if (response.success) {
        const serverWishlist = response.items || [];
        
        // Merge wishlists (server takes precedence for conflicts)
        const mergedWishlist = this.mergeWishlists(localWishlist, serverWishlist, lastWishlistSync);
        
        // Save merged wishlist
        await chrome.storage.local.set({
          wishlist: mergedWishlist,
          wishlistSyncTime: Date.now()
        });

        // Update server if we have local changes
        if (this.hasLocalWishlistChanges(localWishlist, serverWishlist)) {
          await this.uploadWishlistChanges(mergedWishlist);
        }
      }
    } catch (error) {
      console.error('Failed to sync wishlist:', error);
      throw error;
    }
  }

  async syncSavingsData() {
    try {
      const response = await this.makeApiRequest('/savings/summary');
      
      if (response.success) {
        await chrome.storage.local.set({
          savingsData: {
            totalSaved: response.totalSaved,
            lifetimeSavings: response.lifetimeSavings,
            couponsUsed: response.couponsUsed,
            lastUpdated: Date.now()
          }
        });
      }
    } catch (error) {
      console.error('Failed to sync savings data:', error);
      throw error;
    }
  }

  async syncUserPreferences() {
    try {
      // Get local preferences
      const localPrefs = await chrome.storage.sync.get([
        'autoApplyEnabled',
        'showNotifications',
        'autoApplyDelay',
        'preferredCurrency'
      ]);

      // Get server preferences
      const response = await this.makeApiRequest('/user/preferences');
      
      if (response.success) {
        const serverPrefs = response.preferences;
        
        // Merge preferences (local takes precedence)
        const mergedPrefs = { ...serverPrefs, ...localPrefs };
        
        // Save merged preferences
        await chrome.storage.sync.set(mergedPrefs);
        
        // Update server with local preferences
        await this.uploadUserPreferences(mergedPrefs);
      }
    } catch (error) {
      console.error('Failed to sync user preferences:', error);
      // Don't throw - preferences sync is not critical
    }
  }

  async processPendingChanges() {
    if (this.pendingChanges.size === 0) {
      return;
    }

    console.log(`Processing ${this.pendingChanges.size} pending changes...`);

    for (const [changeId, change] of this.pendingChanges) {
      try {
        await this.processChange(change);
        this.pendingChanges.delete(changeId);
      } catch (error) {
        console.error(`Failed to process change ${changeId}:`, error);
        // Keep the change for next sync attempt
      }
    }

    // Save updated pending changes
    await chrome.storage.local.set({
      pendingChanges: Array.from(this.pendingChanges.entries())
    });
  }

  async processChange(change) {
    switch (change.type) {
      case 'wishlist_add':
        await this.makeApiRequest('/wishlist', {
          method: 'POST',
          body: JSON.stringify(change.data)
        });
        break;

      case 'wishlist_remove':
        await this.makeApiRequest(`/wishlist/${change.data.id}`, {
          method: 'DELETE'
        });
        break;

      case 'coupon_usage':
        await this.makeApiRequest('/savings/apply', {
          method: 'POST',
          body: JSON.stringify(change.data)
        });
        break;

      case 'user_preferences':
        await this.makeApiRequest('/user/preferences', {
          method: 'PUT',
          body: JSON.stringify(change.data)
        });
        break;

      default:
        console.warn(`Unknown change type: ${change.type}`);
    }
  }

  mergeWishlists(localWishlist, serverWishlist, lastSyncTime) {
    const merged = new Map();
    
    // Add server items (they are the source of truth)
    serverWishlist.forEach(item => {
      merged.set(item.id || item.url, item);
    });
    
    // Add local items that are newer than last sync
    localWishlist.forEach(item => {
      const itemTime = new Date(item.addedAt || item.createdAt).getTime();
      if (itemTime > lastSyncTime) {
        merged.set(item.id || item.url, item);
      }
    });
    
    return Array.from(merged.values());
  }

  hasLocalWishlistChanges(localWishlist, serverWishlist) {
    if (localWishlist.length !== serverWishlist.length) {
      return true;
    }
    
    const serverIds = new Set(serverWishlist.map(item => item.id || item.url));
    return localWishlist.some(item => !serverIds.has(item.id || item.url));
  }

  async uploadWishlistChanges(wishlist) {
    try {
      await this.makeApiRequest('/wishlist/sync', {
        method: 'POST',
        body: JSON.stringify({ items: wishlist })
      });
    } catch (error) {
      console.error('Failed to upload wishlist changes:', error);
    }
  }

  async uploadUserPreferences(preferences) {
    try {
      await this.makeApiRequest('/user/preferences', {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });
    } catch (error) {
      console.error('Failed to upload user preferences:', error);
    }
  }

  handleSyncError(error) {
    this.retryAttempts++;
    
    if (this.retryAttempts < this.maxRetries) {
      // Exponential backoff
      const delay = Math.pow(2, this.retryAttempts) * 1000;
      console.log(`Retrying sync in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);
      
      setTimeout(() => {
        this.performSync();
      }, delay);
    } else {
      console.error('Max sync retries reached, will try again on next interval');
      this.retryAttempts = 0;
    }
  }

  handleSyncStorageChanges(changes) {
    // Handle changes to sync storage that might need to be uploaded
    for (const [key, change] of Object.entries(changes)) {
      if (key.startsWith('user_') || key === 'autoApplyEnabled' || key === 'showNotifications') {
        // Queue preference change for upload
        this.queueChange('user_preferences', {
          [key]: change.newValue
        });
      }
    }
  }

  queueChange(type, data) {
    const changeId = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.pendingChanges.set(changeId, {
      type,
      data,
      timestamp: Date.now()
    });

    // Save to storage
    chrome.storage.local.set({
      pendingChanges: Array.from(this.pendingChanges.entries())
    });

    // Try to sync immediately if online
    if (navigator.onLine && !this.syncInProgress) {
      setTimeout(() => this.performSync(), 1000);
    }
  }

  async makeApiRequest(endpoint, options = {}) {
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
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Public methods for other components to use
  async addToWishlist(productData) {
    // Add to local storage immediately
    const result = await chrome.storage.local.get(['wishlist']);
    const wishlist = result.wishlist || [];
    
    const newItem = {
      id: `local_${Date.now()}`,
      ...productData,
      addedAt: new Date().toISOString(),
      source: 'extension'
    };
    
    wishlist.push(newItem);
    await chrome.storage.local.set({ wishlist });

    // Queue for server sync
    this.queueChange('wishlist_add', newItem);

    return { success: true, item: newItem };
  }

  async removeFromWishlist(itemId) {
    // Remove from local storage immediately
    const result = await chrome.storage.local.get(['wishlist']);
    const wishlist = result.wishlist || [];
    
    const updatedWishlist = wishlist.filter(item => item.id !== itemId);
    await chrome.storage.local.set({ wishlist: updatedWishlist });

    // Queue for server sync
    this.queueChange('wishlist_remove', { id: itemId });

    return { success: true };
  }

  async recordCouponUsage(couponData) {
    // Queue for server sync
    this.queueChange('coupon_usage', {
      ...couponData,
      timestamp: Date.now(),
      source: 'extension'
    });

    return { success: true };
  }

  async updateUserPreferences(preferences) {
    // Update local storage immediately
    await chrome.storage.sync.set(preferences);

    // Queue for server sync
    this.queueChange('user_preferences', preferences);

    return { success: true };
  }

  // Force sync method for manual triggers
  async forceSync() {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return;
    }

    await this.performSync();
  }

  // Get sync status
  getSyncStatus() {
    return {
      lastSyncTime: this.lastSyncTime,
      syncInProgress: this.syncInProgress,
      pendingChanges: this.pendingChanges.size,
      retryAttempts: this.retryAttempts,
      isOnline: navigator.onLine
    };
  }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ExtensionSync;
} else {
  window.ExtensionSync = ExtensionSync;
}