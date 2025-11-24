import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import ReceiptUpload from '../components/features/ReceiptUpload';
import PriceMatchResults from '../components/features/PriceMatchResults';
import toast from 'react-hot-toast';

interface Receipt {
  id: string;
  imageUrl: string;
  storeName: string | null;
  totalAmount: number | null;
  scannedAt: string;
}

/**
 * Receipt scanning page
 * Allows users to upload receipts and view price matches
 */
export default function ReceiptScanPage() {
  const { receiptId } = useParams<{ receiptId?: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (receiptId) {
      loadReceipt(receiptId);
    }
  }, [receiptId]);

  const loadReceipt = async (id: string) => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view receipts');
        return;
      }

      const response = await fetch(`http://localhost:3001/api/receipts/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load receipt');
      }

      if (result.success) {
        setReceipt(result.data);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadSuccess = (newReceiptId: string) => {
    // Reload receipt or redirect
    loadReceipt(newReceiptId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Scan Receipt
        </h1>
        <p className="text-gray-600">
          Upload a receipt to find better prices and save money
        </p>
      </div>

      {!receipt && !receiptId && (
        <div className="mb-8">
          <ReceiptUpload onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {receipt && (
        <div className="space-y-8">
          {/* Receipt Info */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Receipt Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receipt.imageUrl && (
                <div>
                  <img
                    src={receipt.imageUrl}
                    alt="Receipt"
                    className="max-w-full h-auto rounded-lg shadow-sm"
                  />
                </div>
              )}
              <div className="space-y-3">
                {receipt.storeName && (
                  <div>
                    <span className="text-sm text-gray-500">Store:</span>
                    <p className="font-medium text-gray-900">{receipt.storeName}</p>
                  </div>
                )}
                {receipt.totalAmount && (
                  <div>
                    <span className="text-sm text-gray-500">Total:</span>
                    <p className="font-medium text-gray-900">
                      ${receipt.totalAmount.toFixed(2)}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-500">Scanned:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(receipt.scannedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Price Matches */}
          <div>
            <PriceMatchResults receiptId={receipt.id} />
          </div>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading receipt...</p>
        </div>
      )}
    </div>
  );
}

