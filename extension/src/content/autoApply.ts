import { detectCouponsForCurrentPage, autoApplyCoupon, injectCouponBanner } from './couponInjector';

/**
 * Auto-apply logic for browser extension
 * Monitors page changes and automatically applies best coupon
 */

let isAutoApplyEnabled = true;
let appliedCouponId: string | null = null;

/**
 * Check if auto-apply should run on current page
 */
function shouldAutoApply(): boolean {
  if (!isAutoApplyEnabled) {
    return false;
  }

  // Only auto-apply on checkout/cart pages
  const path = window.location.pathname.toLowerCase();
  return (
    path.includes('checkout') ||
    path.includes('cart') ||
    path.includes('basket') ||
    path.includes('payment')
  );
}

/**
 * Attempt to auto-apply the best coupon
 */
export async function attemptAutoApply(): Promise<boolean> {
  if (!shouldAutoApply()) {
    return false;
  }

  // Don't apply if already applied
  if (appliedCouponId) {
    return false;
  }

  try {
    const coupons = await detectCouponsForCurrentPage();

    if (!coupons || !coupons.bestCoupon || !coupons.store) {
      return false;
    }

    const bestCoupon = coupons.bestCoupon;

    // Show banner first
    injectCouponBanner(bestCoupon, coupons.store.storeName);

    // Wait a moment for user to see banner
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Attempt to auto-apply
    const success = autoApplyCoupon(bestCoupon.code);

    if (success) {
      appliedCouponId = bestCoupon.id;
      console.log('ShopSavr: Coupon auto-applied:', bestCoupon.code);

      // Send message to background script to track
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({
          type: 'COUPON_APPLIED',
          couponId: bestCoupon.id,
          code: bestCoupon.code,
          storeId: coupons.store.storeId,
        });
      }

      return true;
    }

    return false;
  } catch (error) {
    console.error('ShopSavr: Auto-apply failed:', error);
    return false;
  }
}

/**
 * Monitor page changes (for SPA navigation)
 */
export function setupPageMonitor(): void {
  // Monitor URL changes
  let lastUrl = window.location.href;

  const checkUrlChange = () => {
    const currentUrl = window.location.href;
    if (currentUrl !== lastUrl) {
      lastUrl = currentUrl;
      appliedCouponId = null; // Reset on navigation
      if (shouldAutoApply()) {
        setTimeout(attemptAutoApply, 1000);
      }
    }
  };

  // Check periodically
  setInterval(checkUrlChange, 1000);

  // Also listen to popstate (back/forward navigation)
  window.addEventListener('popstate', () => {
    appliedCouponId = null;
    if (shouldAutoApply()) {
      setTimeout(attemptAutoApply, 1000);
    }
  });
}

/**
 * Initialize auto-apply system
 */
export function initializeAutoApply(): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setupPageMonitor();
      if (shouldAutoApply()) {
        setTimeout(attemptAutoApply, 2000); // Wait for page to settle
      }
    });
  } else {
    setupPageMonitor();
    if (shouldAutoApply()) {
      setTimeout(attemptAutoApply, 2000);
    }
  }
}

// Export toggle function
export function toggleAutoApply(enabled: boolean): void {
  isAutoApplyEnabled = enabled;
}

// Initialize on load
initializeAutoApply();

