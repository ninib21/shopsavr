import { Link } from 'react-router-dom';

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

interface ProductRecommendationCardProps {
  recommendation: ProductRecommendation;
}

/**
 * Product recommendation card component
 */
export function ProductRecommendationCard({
  recommendation,
}: ProductRecommendationCardProps) {
  const formatDiscount = () => {
    if (recommendation.discountType === 'percentage') {
      return `${recommendation.discountAmount}% OFF`;
    }
    return `$${recommendation.discountAmount} OFF`;
  };

  const confidenceColor = () => {
    if (recommendation.confidence >= 0.8) return 'bg-green-100 text-green-800';
    if (recommendation.confidence >= 0.6) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {recommendation.productName}
          </h3>
          <p className="text-sm text-gray-500 mb-2">{recommendation.storeName}</p>
          <span
            className={`inline-block text-xs font-semibold px-2 py-1 rounded ${confidenceColor()}`}
          >
            {Math.round(recommendation.confidence * 100)}% Match
          </span>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary-600">
            {formatDiscount()}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-3">{recommendation.reason}</p>

      <div className="flex items-center gap-2">
        <a
          href={recommendation.dealUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 bg-primary-600 text-white text-center py-2 px-4 rounded-md hover:bg-primary-700 transition-colors text-sm font-medium"
        >
          View Deal
        </a>
        <Link
          to={`/coupons?storeId=${recommendation.storeName.toLowerCase()}`}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
        >
          Coupons
        </Link>
      </div>
    </div>
  );
}

export default ProductRecommendationCard;

