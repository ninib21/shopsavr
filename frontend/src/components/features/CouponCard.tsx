import { useState } from 'react';
import toast from 'react-hot-toast';

interface CouponCardProps {
  coupon: {
    id: string;
    code: string;
    discountAmount: number | null;
    expiration: Date | null;
  };
  onApply?: (couponId: string) => void;
  isBest?: boolean;
}

/**
 * Coupon card component
 * Displays coupon information with apply button
 */
export function CouponCard({ coupon, onApply, isBest = false }: CouponCardProps) {
  const [isApplying, setIsApplying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setIsCopied(true);
      toast.success('Coupon code copied!');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy coupon code');
    }
  };

  const handleApply = async () => {
    if (!onApply) return;

    setIsApplying(true);
    try {
      await onApply(coupon.id);
      toast.success('Coupon applied successfully!');
    } catch (error) {
      toast.error('Failed to apply coupon');
    } finally {
      setIsApplying(false);
    }
  };

  const formatDiscount = () => {
    if (!coupon.discountAmount) return 'Discount Available';
    // Assume percentage if amount is <= 100, otherwise fixed amount
    if (coupon.discountAmount <= 100) {
      return `${coupon.discountAmount}% OFF`;
    }
    return `$${coupon.discountAmount} OFF`;
  };

  const formatExpiration = () => {
    if (!coupon.expiration) return null;
    const date = new Date(coupon.expiration);
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 border-2 ${
        isBest ? 'border-primary-500 border-dashed' : 'border-gray-200'
      }`}
    >
      {isBest && (
        <div className="mb-2">
          <span className="inline-block bg-primary-100 text-primary-800 text-xs font-semibold px-2 py-1 rounded">
            BEST DEAL
          </span>
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {formatDiscount()}
          </h3>
          {coupon.expiration && (
            <p className="text-xs text-gray-500">
              Expires: {formatExpiration()}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <code className="flex-1 bg-gray-100 px-3 py-2 rounded font-mono text-sm text-gray-800">
          {coupon.code}
        </code>
        <button
          onClick={handleCopy}
          className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium transition-colors"
        >
          {isCopied ? '✓' : 'Copy'}
        </button>
      </div>

      {onApply && (
        <button
          onClick={handleApply}
          disabled={isApplying}
          className="w-full bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isApplying ? 'Applying...' : 'Apply Coupon'}
        </button>
      )}
    </div>
  );
}

export default CouponCard;

