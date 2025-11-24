import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchSavingsSummary, fetchSavingsHistory } from '../../store/slices/savingsSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './SavingsPage.css';

const SavingsPage = () => {
  const dispatch = useDispatch();
  const { summary, history, loading, error } = useSelector(state => state.savings || { 
    summary: { totalSaved: 0 }, 
    history: [], 
    loading: { summary: false, history: false }, 
    error: { summary: null, history: null } 
  });
  const [timeFilter, setTimeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    // dispatch(fetchSavingsSummary());
    // dispatch(fetchSavingsHistory());
    // For now, we'll use mock data since the API isn't connected
  }, [dispatch]);

  const filterSavings = () => {
    let filtered = [...history];

    // Apply time filter
    if (timeFilter !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      
      switch (timeFilter) {
        case 'week':
          filterDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          filterDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          filterDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          break;
      }
      
      filtered = filtered.filter(saving => new Date(saving.createdAt) >= filterDate);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'amount':
          return b.amount - a.amount;
        case 'percentage':
          return b.percentage - a.percentage;
        case 'date':
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return filtered;
  };

  const filteredSavings = filterSavings();
  const filteredTotal = filteredSavings.reduce((sum, saving) => sum + saving.amount, 0);

  if (loading.summary || loading.history) return <LoadingSpinner />;

  return (
    <div className="savings-page">
      <div className="page-header">
        <h1>Your Savings</h1>
        <p>Track all the money you've saved with ShopSavr</p>
      </div>

      <div className="savings-stats">
        <div className="stat-card total-savings">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Savings</h3>
            <p className="stat-value">${summary.totalSaved.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="stat-card filtered-savings">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Filtered Savings</h3>
            <p className="stat-value">${filteredTotal.toFixed(2)}</p>
          </div>
        </div>
        
        <div className="stat-card avg-savings">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <h3>Average per Purchase</h3>
            <p className="stat-value">
              ${filteredSavings.length > 0 ? (filteredTotal / filteredSavings.length).toFixed(2) : '0.00'}
            </p>
          </div>
        </div>
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Time Period:</label>
          <select 
            value={timeFilter} 
            onChange={(e) => setTimeFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Time</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Sort By:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="filter-select"
          >
            <option value="date">Date</option>
            <option value="amount">Amount Saved</option>
            <option value="percentage">Percentage Saved</option>
          </select>
        </div>
      </div>

      <div className="savings-content">
        {(error.summary || error.history) && (
          <div className="error-message">
            <p>Error loading savings: {error.summary || error.history}</p>
          </div>
        )}

        {filteredSavings.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💸</div>
            <h3>No savings found</h3>
            <p>Start shopping with ShopSavr to track your savings!</p>
          </div>
        ) : (
          <div className="savings-list">
            {filteredSavings.map(saving => (
              <div key={saving.id} className="saving-card">
                <div className="saving-header">
                  <div className="store-info">
                    <img src={saving.storeImage} alt={saving.store} className="store-logo" />
                    <div className="store-details">
                      <h4 className="store-name">{saving.store}</h4>
                      <p className="purchase-date">
                        {new Date(saving.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="saving-amount">
                    <span className="amount-saved">${saving.amount.toFixed(2)}</span>
                    <span className="percentage-saved">{saving.percentage}% off</span>
                  </div>
                </div>
                
                <div className="saving-body">
                  <h5 className="product-name">{saving.productName}</h5>
                  <div className="price-breakdown">
                    <span className="original-price">
                      Original: <s>${saving.originalPrice.toFixed(2)}</s>
                    </span>
                    <span className="final-price">
                      Paid: ${saving.finalPrice.toFixed(2)}
                    </span>
                  </div>
                  
                  {saving.couponCode && (
                    <div className="coupon-used">
                      <span className="coupon-label">Coupon Used:</span>
                      <span className="coupon-code">{saving.couponCode}</span>
                    </div>
                  )}
                </div>
                
                <div className="saving-footer">
                  <div className="saving-method">
                    <span className="method-icon">
                      {saving.method === 'coupon' ? '🎫' : 
                       saving.method === 'cashback' ? '💳' : 
                       saving.method === 'price-drop' ? '📉' : '🏷️'}
                    </span>
                    <span className="method-name">
                      {saving.method.charAt(0).toUpperCase() + saving.method.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                  
                  {saving.orderUrl && (
                    <a 
                      href={saving.orderUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="view-order-btn"
                    >
                      View Order
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavingsPage;