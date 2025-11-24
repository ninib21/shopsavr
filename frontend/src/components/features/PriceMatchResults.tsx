import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';

interface PriceMatch {
  itemName: string;
  originalPrice: number;
  betterPrice?: number;
  storeName?: string;
  savings?: number;
  savingsPercentage?: number;
  dealUrl?: string;
}

interface PriceMatchResultsProps {
  receiptId: string;
}

/**
 * Price match results component
 * Displays better prices found for receipt items
 */
export function PriceMatchResults({ receiptId }: PriceMatchResultsProps) {
  const [matches, setMatches] = useState<PriceMatch[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [itemsMatched, setItemsMatched] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPriceMatches();
  }, [receiptId]);

  const loadPriceMatches = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view price matches');
        return;
      }

      const response = await fetch(
        `http://localhost:3001/api/receipts/${receiptId}/matches`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load price matches');
      }

      if (result.success && result.data) {
        setMatches(result.data.matches || []);
        setTotalSavings(result.data.totalSavings || 0);
        setItemsMatched(result.data.itemsMatched || 0);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to load price matches');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Finding better prices...</p>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No better prices found at this time</p>
      </div>
    );
  }

  const matchesWithBetterPrice = matches.filter((m) => m.betterPrice);

  return (
    <div className="space-y-6">
      {/* Summary */}
      {totalSavings > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-green-900">
                Potential Savings Found!
              </h3>
              <p className="text-sm text-green-700 mt-1">
                {itemsMatched} item{itemsMatched !== 1 ? 's' : ''} with better prices
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-green-900">
                ${totalSavings.toFixed(2)}
              </p>
              <p className="text-sm text-green-700">Total Savings</p>
            </div>
          </div>
        </div>
      )}

      {/* Matches List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Price Matches ({matchesWithBetterPrice.length})
        </h3>

        {matches.map((match, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg shadow-md p-4 border ${
              match.betterPrice
                ? 'border-green-200'
                : 'border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="font-medium text-gray-900">{match.itemName}</h4>
                <div className="mt-2 flex items-center gap-4">
                  <div>
                    <span className="text-sm text-gray-500">You Paid:</span>
                    <span className="ml-2 text-lg font-semibold text-gray-900">
                      ${match.originalPrice.toFixed(2)}
                    </span>
                  </div>
                  {match.betterPrice && (
                    <>
                      <div className="text-gray-400">→</div>
                      <div>
                        <span className="text-sm text-gray-500">Better Price:</span>
                        <span className="ml-2 text-lg font-semibold text-green-600">
                          ${match.betterPrice.toFixed(2)}
                        </span>
                      </div>
                      {match.savings && (
                        <div className="ml-auto">
                          <span className="inline-block bg-green-100 text-green-800 text-sm font-semibold px-3 py-1 rounded">
                            Save ${match.savings.toFixed(2)}
                            {match.savingsPercentage &&
                              ` (${match.savingsPercentage.toFixed(1)}%)`}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
                {match.storeName && (
                  <p className="text-sm text-gray-500 mt-2">
                    Available at: {match.storeName}
                  </p>
                )}
              </div>
            </div>
            {match.dealUrl && (
              <div className="mt-3">
                <a
                  href={match.dealUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  View Deal →
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PriceMatchResults;

