import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductRecommendationCard from '../components/features/ProductRecommendationCard';
import toast from 'react-hot-toast';

interface ProductRecommendation {
  productId: string;
  productName: string;
  dealUrl: string;
  discountAmount: number;
  discountType: string;
  storeName: string;
  reason: string;
  confidence: number;
}

/**
 * Dashboard page with personalized recommendations
 */
export default function DashboardPage() {
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [trending, setTrending] = useState<ProductRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        // Load trending deals for non-authenticated users
        const trendingResponse = await fetch(
          'http://localhost:3001/api/recommendations/trending?limit=6'
        );
        const trendingResult = await trendingResponse.json();
        if (trendingResult.success) {
          setTrending(trendingResult.data || []);
        }
        setIsLoading(false);
        return;
      }

      // Load personalized recommendations
      const personalizedResponse = await fetch(
        'http://localhost:3001/api/recommendations/personalized',
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const personalizedResult = await personalizedResponse.json();

      if (personalizedResult.success) {
        setRecommendations(personalizedResult.data || []);
      }

      // Load trending deals
      const trendingResponse = await fetch(
        'http://localhost:3001/api/recommendations/trending?limit=6'
      );
      const trendingResult = await trendingResponse.json();
      if (trendingResult.success) {
        setTrending(trendingResult.data || []);
      }
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      toast.error('Failed to load recommendations');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to ShopSavr™
        </h1>
        <p className="text-gray-600">
          Your intelligent shopping assistant for finding the best deals
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link
          to="/coupons"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Browse Coupons
          </h3>
          <p className="text-sm text-gray-600">
            Find and apply the best coupon codes
          </p>
        </Link>

        <Link
          to="/receipts"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Scan Receipt
          </h3>
          <p className="text-sm text-gray-600">
            Upload receipts to find better prices
          </p>
        </Link>

        <Link
          to="/alerts"
          className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-200"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Price Alerts
          </h3>
          <p className="text-sm text-gray-600">
            Get notified when prices drop
          </p>
        </Link>
      </div>

      {/* Personalized Recommendations */}
      {recommendations.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Recommended For You
            </h2>
            <button
              onClick={loadRecommendations}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recommendations.slice(0, 6).map((rec) => (
              <ProductRecommendationCard key={rec.productId} recommendation={rec} />
            ))}
          </div>
        </div>
      )}

      {/* Trending Deals */}
      {trending.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Trending Deals
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((deal) => (
              <ProductRecommendationCard key={deal.productId} recommendation={deal} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && trending.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow-md">
          <p className="text-gray-600 text-lg mb-4">
            No recommendations available yet
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Start by scanning receipts or creating price alerts to get personalized recommendations
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/receipts"
              className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
            >
              Scan Receipt
            </Link>
            <Link
              to="/alerts"
              className="bg-gray-200 text-gray-900 px-6 py-2 rounded-md hover:bg-gray-300 transition-colors"
            >
              Create Alert
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

