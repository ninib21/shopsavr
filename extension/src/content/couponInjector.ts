/**
 * Browser extension content script
 * Injects coupon detection and auto-apply functionality into web pages
 */

interface CouponData {
  id: string;
  code: string;
  discountAmount: number | null;
}

interface DetectedCoupons {
  store: {
    storeId: string;
    storeName: string;
  } | null;
  coupons: CouponData[];
  bestCoupon: CouponData | null;
}

/**
 * Detect current page store and fetch available coupons
 */
export async function detectCouponsForCurrentPage(): Promise<DetectedCoupons | null> {
  const currentUrl = window.location.href;

  try {
    const response = await fetch('http://localhost:3001/api/coupons/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: currentUrl }),
    });

    if (!response.ok) {
      return null;
    }

    const result = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error('Failed to detect coupons:', error);
    return null;
  }
}

/**
 * Inject coupon notification banner into page
 */
export function injectCouponBanner(coupon: CouponData, storeName: string): void {
  // Remove existing banner if any
  const existingBanner = document.getElementById('shopsavr-coupon-banner');
  if (existingBanner) {
    existingBanner.remove();
  }

  // Create banner element
  const banner = document.createElement('div');
  banner.id = 'shopsavr-coupon-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 12px 20px;
    z-index: 999999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
    justify-content: space-between;
  `;

  const discountText = coupon.discountAmount
    ? coupon.discountAmount <= 100
      ? `${coupon.discountAmount}% OFF`
      : `$${coupon.discountAmount} OFF`
    : 'Coupon Available';

  banner.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span style="font-weight: bold; font-size: 16px;">🎉 ShopSavr Found a Coupon!</span>
      <span style="font-size: 14px;">${discountText} code: <strong>${coupon.code}</strong></span>
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="shopsavr-copy-btn" style="
        background: white;
        color: #667eea;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
      ">Copy Code</button>
      <button id="shopsavr-apply-btn" style="
        background: #10b981;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-weight: 600;
        font-size: 14px;
      ">Auto-Apply</button>
      <button id="shopsavr-close-btn" style="
        background: transparent;
        color: white;
        border: 1px solid white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      ">✕</button>
    </div>
  `;

  // Add event listeners
  const copyBtn = banner.querySelector('#shopsavr-copy-btn');
  const applyBtn = banner.querySelector('#shopsavr-apply-btn');
  const closeBtn = banner.querySelector('#shopsavr-close-btn');

  copyBtn?.addEventListener('click', () => {
    navigator.clipboard.writeText(coupon.code);
    (copyBtn as HTMLButtonElement).textContent = 'Copied!';
    setTimeout(() => {
      (copyBtn as HTMLButtonElement).textContent = 'Copy Code';
    }, 2000);
  });

  applyBtn?.addEventListener('click', () => {
    autoApplyCoupon(coupon.code);
  });

  closeBtn?.addEventListener('click', () => {
    banner.remove();
  });

  // Insert banner at top of page
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Find coupon input field on page
 */
function findCouponInput(): HTMLInputElement | null {
  // Common selectors for coupon/promo code inputs
  const selectors = [
    'input[name*="coupon"]',
    'input[name*="promo"]',
    'input[name*="code"]',
    'input[id*="coupon"]',
    'input[id*="promo"]',
    'input[id*="code"]',
    'input[placeholder*="coupon" i]',
    'input[placeholder*="promo" i]',
    'input[placeholder*="code" i]',
    'input[type="text"][name*="discount"]',
  ];

  for (const selector of selectors) {
    const input = document.querySelector<HTMLInputElement>(selector);
    if (input && input.offsetParent !== null) {
      // Input is visible
      return input;
    }
  }

  return null;
}

/**
 * Find apply/submit button near coupon input
 */
function findApplyButton(input: HTMLInputElement): HTMLButtonElement | null {
  // Look for button in same form or nearby
  const form = input.closest('form');
  if (form) {
    const buttons = form.querySelectorAll<HTMLButtonElement>(
      'button[type="submit"], input[type="submit"], button:not([type])'
    );
    if (buttons.length > 0) {
      return buttons[0];
    }
  }

  // Look for button with common text
  const buttonTexts = ['apply', 'submit', 'redeem', 'use'];
  const allButtons = document.querySelectorAll<HTMLButtonElement>('button');
  for (const button of allButtons) {
    const text = button.textContent?.toLowerCase() || '';
    if (buttonTexts.some((bt) => text.includes(bt))) {
      // Check if button is near the input
      const rect1 = input.getBoundingClientRect();
      const rect2 = button.getBoundingClientRect();
      const distance = Math.abs(rect1.top - rect2.top);
      if (distance < 200) {
        return button;
      }
    }
  }

  return null;
}

/**
 * Auto-apply coupon code to page
 */
export function autoApplyCoupon(couponCode: string): boolean {
  const input = findCouponInput();

  if (!input) {
    console.warn('ShopSavr: Could not find coupon input field');
    return false;
  }

  // Set coupon code
  input.value = couponCode;
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));

  // Try to find and click apply button
  const applyButton = findApplyButton(input);
  if (applyButton) {
    applyButton.click();
    return true;
  }

  // If no button found, trigger form submit if input is in a form
  const form = input.closest('form');
  if (form) {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return true;
  }

  return false;
}

/**
 * Initialize coupon detection on page load
 */
export function initializeCouponDetection(): void {
  // Wait for page to be fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      detectAndInjectCoupons();
    });
  } else {
    detectAndInjectCoupons();
  }
}

/**
 * Main function to detect and inject coupons
 */
async function detectAndInjectCoupons(): void {
  // Check if we're on a checkout or cart page
  const path = window.location.pathname.toLowerCase();
  const isCheckoutPage =
    path.includes('checkout') ||
    path.includes('cart') ||
    path.includes('basket') ||
    path.includes('payment');

  if (!isCheckoutPage) {
    return;
  }

  const coupons = await detectCouponsForCurrentPage();

  if (coupons && coupons.bestCoupon && coupons.store) {
    injectCouponBanner(coupons.bestCoupon, coupons.store.storeName);
  }
}

// Auto-initialize when script loads
initializeCouponDetection();

