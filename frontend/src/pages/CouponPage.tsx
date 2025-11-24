import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import CouponCard from '../components/features/CouponCard';
import toast from 'react-hot-toast';

interface Coupon {
  id: string;
  code: string;
  discountAmount: number | null;
  expiration: Date | null;
  storeId: string;
}

interface CouponsResponse {
  success: boolean;
  data: Coupon[];
  count: number;
}

/**
 * Coupon management page
 * Displays available coupons for a store
 */
export default function CouponPage() {
  const [searchParams] = useSearchParams();
  const storeId = searchParams.get('storeId') || '';
  const url = searchParams.get('url') || '';

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [bestCoupon, setBestCoupon] = useState<Coupon | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storeName, setStoreName] = useState<string>('');

  useEffect(() => {
    loadCoupons();
  }, [storeId, url]);

  const loadCoupons = async () => {
    setIsLoading(true);

    try {
      // If URL is provided, detect coupons
      if (url) {
        const response = await fetch('http://localhost:3001/api/coupons/detect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });

        const result = await response.json();

        if (result.success && result.data) {
          setCoupons(result.data.coupons || []);
          setBestCoupon(result.data.bestCoupon);
          setStoreName(result.data.store?.storeName || '');
        }
      } else if (storeId) {
        // Get coupons for specific store
        const response = await fetch(
          `http://localhost:3001/api/coupons/available?storeId=${storeId}`
        );

        const result: CouponsResponse = await response.json();

        if (result.success) {
          setCoupons(result.data || []);

          // Get best coupon
          const bestResponse = await fetch(
            `http://localhost:3001/api/coupons/best?storeId=${storeId}`
          );
          const bestResult = await bestResponse.json();
          if (bestResult.success && bestResult.data) {
            setBestCoupon(bestResult.data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load coupons:', error);
      toast.error('Failed to load coupons');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyCoupon = async (couponId: string) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Please log in to apply coupons');
      return;
    }

    try {
      const coupon = coupons.find((c) => c.id === couponId) || bestCoupon;
      if (!coupon) return;

      const amountSaved = coupon.discountAmount || 0;

      const response = await fetch('http://localhost:3001/api/coupons/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          couponId,
          storeId: coupon.storeId,
          amountSaved,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to apply coupon');
      }

      toast.success(`Coupon applied! Saved $${amountSaved}`);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to apply coupon');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading coupons...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Available Coupons
        </h1>
        {storeName && (
          <p className="text-gray-600">For {storeName}</p>
        )}
      </div>

      {coupons.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 text-lg">
            No coupons available for this store
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Try visiting a supported retailer's website
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Best Coupon First */}
          {bestCoupon && (
            <CouponCard
              coupon={bestCoupon}
              onApply={handleApplyCoupon}
              isBest={true}
            />
          )}

          {/* Other Coupons */}
          {coupons
            .filter((c) => c.id !== bestCoupon?.id)
            .map((coupon) => (
              <CouponCard
                key={coupon.id}
                coupon={coupon}
                onApply={handleApplyCoupon}
              />
            ))}
        </div>
      )}
    </div>
  );
}

