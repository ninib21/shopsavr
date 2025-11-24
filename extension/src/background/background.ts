/**
 * Browser extension background service worker
 * Handles messages and tracks coupon applications
 */

interface CouponAppliedMessage {
  type: 'COUPON_APPLIED';
  couponId: string;
  code: string;
  storeId: string;
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(
  (message: CouponAppliedMessage, _sender, sendResponse) => {
    if (message.type === 'COUPON_APPLIED') {
      // Track coupon application
      console.log('Coupon applied:', message.code, 'at', message.storeId);

      // Store in local storage for analytics
      chrome.storage.local.get(['appliedCoupons'], (result) => {
        const appliedCoupons = result.appliedCoupons || [];
        appliedCoupons.push({
          couponId: message.couponId,
          code: message.code,
          storeId: message.storeId,
          timestamp: Date.now(),
        });

        chrome.storage.local.set({ appliedCoupons });
      });

      sendResponse({ success: true });
    }

    return true; // Keep message channel open for async response
  }
);

// Track installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('ShopSavr extension installed');
});

