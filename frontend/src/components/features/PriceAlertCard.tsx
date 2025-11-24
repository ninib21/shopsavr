import { useState } from 'react';
import toast from 'react-hot-toast';

interface PriceAlert {
  id: string;
  productIdentifier: string;
  productName?: string | null;
  thresholdPrice: number;
  currentPrice?: number | null;
  triggered: boolean;
  createdAt: string;
  productUrl?: string | null;
}

interface PriceAlertCardProps {
  alert: PriceAlert;
  onDelete?: (alertId: string) => void;
}

/**
 * Price alert card component
 */
export function PriceAlertCard({ alert, onDelete }: PriceAlertCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) {
      return;
    }

    setIsDeleting(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/alerts/${alert.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete alert');
      }

      toast.success('Alert deleted successfully');
      onDelete?.(alert.id);
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to delete alert');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const savings = alert.currentPrice
    ? alert.thresholdPrice - alert.currentPrice
    : null;
  const savingsPercent = savings
    ? ((savings / alert.thresholdPrice) * 100).toFixed(1)
    : null;

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-4 border-2 ${
        alert.triggered
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200'
      }`}
    >
      {alert.triggered && (
        <div className="mb-3">
          <span className="inline-block bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
            🎉 PRICE DROP ALERT TRIGGERED!
          </span>
        </div>
      )}

      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {alert.productName || alert.productIdentifier}
          </h3>

          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div>
                <span className="text-sm text-gray-500">Alert Price:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  ${alert.thresholdPrice.toFixed(2)}
                </span>
              </div>
              {alert.currentPrice && (
                <>
                  <div className="text-gray-400">→</div>
                  <div>
                    <span className="text-sm text-gray-500">Current Price:</span>
                    <span
                      className={`ml-2 font-semibold ${
                        alert.currentPrice <= alert.thresholdPrice
                          ? 'text-green-600'
                          : 'text-gray-900'
                      }`}
                    >
                      ${alert.currentPrice.toFixed(2)}
                    </span>
                  </div>
                </>
              )}
            </div>

            {savings && savings > 0 && (
              <div>
                <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded">
                  Save ${savings.toFixed(2)}
                  {savingsPercent && ` (${savingsPercent}%)`}
                </span>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Created: {new Date(alert.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={handleDelete}
          disabled={isDeleting}
          className="ml-4 text-red-600 hover:text-red-700 disabled:opacity-50"
          title="Delete alert"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {alert.productUrl && (
        <div className="mt-3">
          <a
            href={alert.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Product →
          </a>
        </div>
      )}
    </div>
  );
}

export default PriceAlertCard;

