import { getAvailableCoupons, getBestCoupon, validateCoupon } from './couponService';

export interface StoreInfo {
  storeId: string;
  storeName: string;
  url?: string;
}

/**
 * Detect store from URL or domain
 * Maps common e-commerce domains to store IDs
 */
export function detectStoreFromUrl(url: string): StoreInfo | null {
  const urlObj = new URL(url);
  const domain = urlObj.hostname.toLowerCase();

  // Map of common domains to store IDs
  const storeMap: Record<string, StoreInfo> = {
    'amazon.com': { storeId: 'amazon', storeName: 'Amazon' },
    'amazon.co.uk': { storeId: 'amazon', storeName: 'Amazon' },
    'ebay.com': { storeId: 'ebay', storeName: 'eBay' },
    'walmart.com': { storeId: 'walmart', storeName: 'Walmart' },
    'target.com': { storeId: 'target', storeName: 'Target' },
    'bestbuy.com': { storeId: 'bestbuy', storeName: 'Best Buy' },
    'homedepot.com': { storeId: 'homedepot', storeName: 'Home Depot' },
    'lowes.com': { storeId: 'lowes', storeName: "Lowe's" },
    'macys.com': { storeId: 'macys', storeName: "Macy's" },
    'nike.com': { storeId: 'nike', storeName: 'Nike' },
    'adidas.com': { storeId: 'adidas', storeName: 'Adidas' },
    'zara.com': { storeId: 'zara', storeName: 'Zara' },
    'h&m.com': { storeId: 'hm', storeName: 'H&M' },
    'hm.com': { storeId: 'hm', storeName: 'H&M' },
  };

  // Check exact domain match
  if (storeMap[domain]) {
    return { ...storeMap[domain], url };
  }

  // Check domain patterns (e.g., *.amazon.com)
  for (const [key, value] of Object.entries(storeMap)) {
    if (domain.includes(key) || domain.endsWith(`.${key}`)) {
      return { ...value, url };
    }
  }

  return null;
}

/**
 * Detect coupons available for current page
 * Checks if we're on a supported retailer's checkout/cart page
 */
export async function detectAvailableCoupons(url: string): Promise<{
  store: StoreInfo | null;
  coupons: Array<{
    id: string;
    code: string;
    discountAmount: number | null;
  }>;
  bestCoupon: {
    id: string;
    code: string;
    discountAmount: number | null;
  } | null;
}> {
  const store = detectStoreFromUrl(url);

  if (!store) {
    return {
      store: null,
      coupons: [],
      bestCoupon: null,
    };
  }

  // Get available coupons for this store
  const coupons = await getAvailableCoupons(store.storeId);
  const bestCoupon = await getBestCoupon(store.storeId);

  return {
    store,
    coupons: coupons.map((c) => ({
      id: c.id,
      code: c.code,
      discountAmount: c.discountAmount,
    })),
    bestCoupon: bestCoupon
      ? {
          id: bestCoupon.id,
          code: bestCoupon.code,
          discountAmount: bestCoupon.discountAmount,
        }
      : null,
  };
}

/**
 * Validate a coupon code for a specific store
 */
export async function validateCouponCode(
  code: string,
  storeId: string
): Promise<{
  isValid: boolean;
  discountAmount?: number;
  error?: string;
}> {
  return validateCoupon(code, storeId);
}

