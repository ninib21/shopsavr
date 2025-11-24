import { useState, useEffect } from 'react';

interface Coupon {
  id: string;
  code: string;
  discountAmount: number | null;
}

interface PopupState {
  isActive: boolean;
  currentStore: string | null;
  coupons: Coupon[];
  bestCoupon: Coupon | null;
  autoApplyEnabled: boolean;
}

/**
 * Browser extension popup component
 * Shows current page coupons and extension status
 */
export function Popup() {
  const [state, setState] = useState<PopupState>({
    isActive: false,
    currentStore: null,
    coupons: [],
    bestCoupon: null,
    autoApplyEnabled: true,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCurrentPageInfo();
  }, []);

  const loadCurrentPageInfo = async () => {
    try {
      // Get current tab URL
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.url) return;

      // Detect coupons for current page
      const response = await fetch('http://localhost:3001/api/coupons/detect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: tab.url }),
      });

      const result = await response.json();

      if (result.success && result.data) {
        setState({
          isActive: true,
          currentStore: result.data.store?.storeName || null,
          coupons: result.data.coupons || [],
          bestCoupon: result.data.bestCoupon,
          autoApplyEnabled: true,
        });
      }
    } catch (error) {
      console.error('Failed to load page info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleAutoApply = () => {
    const newState = !state.autoApplyEnabled;
    setState({ ...state, autoApplyEnabled: newState });

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0].id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'TOGGLE_AUTO_APPLY',
          enabled: newState,
        });
      }
    });
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (isLoading) {
    return (
      <div className="w-80 p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!state.isActive || !state.currentStore) {
    return (
      <div className="w-80 p-4">
        <div className="text-center">
          <h2 className="text-lg font-bold text-gray-900 mb-2">ShopSavr™</h2>
          <p className="text-sm text-gray-600">
            Visit a supported retailer's checkout page to see available coupons
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-accent-600 text-white p-4">
        <h2 className="text-lg font-bold">ShopSavr™</h2>
        <p className="text-xs opacity-90">{state.currentStore}</p>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Auto-Apply Toggle */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b">
          <div>
            <p className="text-sm font-medium text-gray-900">Auto-Apply</p>
            <p className="text-xs text-gray-500">Automatically apply best coupon</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={state.autoApplyEnabled}
              onChange={handleToggleAutoApply}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
          </label>
        </div>

        {/* Best Coupon */}
        {state.bestCoupon && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">BEST COUPON</p>
            <div className="bg-primary-50 border-2 border-primary-500 border-dashed rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-primary-900">
                  {state.bestCoupon.discountAmount
                    ? state.bestCoupon.discountAmount <= 100
                      ? `${state.bestCoupon.discountAmount}% OFF`
                      : `$${state.bestCoupon.discountAmount} OFF`
                    : 'Discount Available'}
                </span>
                <button
                  onClick={() => handleCopyCode(state.bestCoupon!.code)}
                  className="text-xs bg-primary-600 text-white px-2 py-1 rounded hover:bg-primary-700"
                >
                  Copy
                </button>
              </div>
              <code className="text-sm font-mono text-gray-800">
                {state.bestCoupon.code}
              </code>
            </div>
          </div>
        )}

        {/* Other Coupons */}
        {state.coupons.length > 1 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              MORE COUPONS ({state.coupons.length - 1})
            </p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {state.coupons
                .filter((c) => c.id !== state.bestCoupon?.id)
                .slice(0, 3)
                .map((coupon) => (
                  <div
                    key={coupon.id}
                    className="bg-gray-50 rounded p-2 flex items-center justify-between"
                  >
                    <code className="text-xs font-mono text-gray-800">
                      {coupon.code}
                    </code>
                    <button
                      onClick={() => handleCopyCode(coupon.code)}
                      className="text-xs text-primary-600 hover:text-primary-700"
                    >
                      Copy
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 pt-4 border-t text-center">
          <a
            href="http://localhost:5173/coupons"
            target="_blank"
            className="text-xs text-primary-600 hover:text-primary-700"
          >
            View All Coupons →
          </a>
        </div>
      </div>
    </div>
  );
}

export default Popup;

