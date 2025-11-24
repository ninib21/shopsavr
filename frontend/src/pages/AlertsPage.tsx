import { useState, useEffect } from 'react';
import PriceAlertForm from '../components/features/PriceAlertForm';
import PriceAlertCard from '../components/features/PriceAlertCard';
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

/**
 * Price alerts management page
 */
export default function AlertsPage() {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    setIsLoading(true);

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to view alerts');
        return;
      }

      const response = await fetch('http://localhost:3001/api/alerts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to load alerts');
      }

      if (result.success) {
        setAlerts(result.data || []);
      }
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error('Failed to load alerts');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertCreated = () => {
    setShowForm(false);
    loadAlerts();
  };

  const handleAlertDeleted = (alertId: string) => {
    setAlerts(alerts.filter((a) => a.id !== alertId));
  };

  const triggeredAlerts = alerts.filter((a) => a.triggered);
  const activeAlerts = alerts.filter((a) => !a.triggered);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Price Alerts
          </h1>
          <p className="text-gray-600">
            Get notified when prices drop below your threshold
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 transition-colors"
        >
          {showForm ? 'Cancel' : '+ New Alert'}
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div className="mb-8 bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Create Price Alert
          </h2>
          <PriceAlertForm onSuccess={handleAlertCreated} />
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading alerts...</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Triggered Alerts */}
          {triggeredAlerts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                🎉 Triggered Alerts ({triggeredAlerts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {triggeredAlerts.map((alert) => (
                  <PriceAlertCard
                    key={alert.id}
                    alert={alert}
                    onDelete={handleAlertDeleted}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Active Alerts */}
          {activeAlerts.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Active Alerts ({activeAlerts.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeAlerts.map((alert) => (
                  <PriceAlertCard
                    key={alert.id}
                    alert={alert}
                    onDelete={handleAlertDeleted}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {alerts.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-600 text-lg mb-4">
                No price alerts yet
              </p>
              <p className="text-gray-500 text-sm mb-6">
                Create an alert to get notified when prices drop
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-md hover:bg-primary-700 transition-colors"
              >
                Create Your First Alert
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

