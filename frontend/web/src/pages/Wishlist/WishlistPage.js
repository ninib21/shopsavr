import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchWishlist, removeFromWishlist } from '../../store/slices/wishlistSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './WishlistPage.css';

const WishlistPage = () => {
  const dispatch = useDispatch();
  const { items, loading, error } = useSelector(state => state.wishlist || { items: [], loading: false, error: null });
  const [sortBy, setSortBy] = useState('dateAdded');
  const [filterBy, setFilterBy] = useState('all');

  useEffect(() => {
    // dispatch(fetchWishlist());
    // For now, we'll use mock data since the API isn't connected
  }, [dispatch]);

  const handleRemoveItem = (itemId) => {
    if (window.confirm('Are you sure you want to remove this item from your wishlist?')) {
      dispatch(removeFromWishlist(itemId));
    }
  };

  const handleShareItem = (item) => {
    if (navigator.share) {
      navigator.share({
        title: item.title,
        text: `Check out this deal: ${item.title}`,
        url: item.url
      });
    } else {
      navigator.clipboard.writeText(item.url);
      // TODO: Show toast notification
    }
  };

  const filterItems = () => {
    let filtered = [...items];

    // Apply filters
    if (filterBy === 'priceDrops') {
      filtered = filtered.filter(item => item.hasPriceDrop);
    } else if (filterBy === 'inStock') {
      filtered = filtered.filter(item => item.inStock);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.currentPrice - b.currentPrice;
        case 'priceDrop':
          return (b.originalPrice - b.currentPrice) - (a.originalPrice - a.currentPrice);
        case 'dateAdded':
        default:
          return new Date(b.dateAdded) - new Date(a.dateAdded);
      }
    });

    return filtered;
  };

  const filteredItems = filterItems();
  const stats = {
    totalItems: items.length,
    priceDrops: items.filter(item => item.hasPriceDrop).length,
    totalSavings: items.reduce((sum, item) => sum + (item.originalPrice - item.currentPrice), 0)
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="wishlist-page">
      <div className="page-header">
        <h1>My Wishlist</h1>
        <p>Track your favorite items and get notified when prices drop</p>
      </div>

      {items.length > 0 && (
        <div className="wishlist-stats">
          <div className="stat-card">
            <div className="stat-icon">❤️</div>
            <div className="stat-value">{stats.totalItems}</div>
            <div className="stat-label">Items Tracked</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📉</div>
            <div className="stat-value">{stats.priceDrops}</div>
            <div className="stat-label">Price Drops</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-value">${stats.totalSavings.toFixed(2)}</div>
            <div className="stat-label">Potential Savings</div>
          </div>
        </div>
      )}

      {items.length > 0 && (
        <div className="wishlist-filters">
          <div className="filter-group">
            <label>Sort By:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="dateAdded">Date Added</option>
              <option value="price">Price (Low to High)</option>
              <option value="priceDrop">Biggest Savings</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Filter:</label>
            <select 
              value={filterBy} 
              onChange={(e) => setFilterBy(e.target.value)}
              className="filter-select"
            >
              <option value="all">All Items</option>
              <option value="priceDrops">Price Drops Only</option>
              <option value="inStock">In Stock Only</option>
            </select>
          </div>
        </div>
      )}

      <div className="wishlist-content">
        {error && (
          <div className="error-message">
            <p>Error loading wishlist: {error}</p>
          </div>
        )}

        {filteredItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <h3>Your wishlist is empty</h3>
            <p>Start adding items to your wishlist to track price drops and never miss a deal!</p>
            <a href="/coupons" className="btn btn-primary">
              Browse Deals
            </a>
          </div>
        ) : (
          <div className="wishlist-grid">
            {filteredItems.map(item => (
              <div key={item.id} className="wishlist-item">
                {item.hasPriceDrop && (
                  <div className="price-drop-badge">
                    Price Drop!
                  </div>
                )}
                
                <div className="item-header">
                  <img src={item.image} alt={item.title} className="item-image" />
                  <div className="item-actions">
                    <button 
                      className="action-btn share-btn"
                      onClick={() => handleShareItem(item)}
                      title="Share item"
                    >
                      📤
                    </button>
                    <button 
                      className="action-btn remove-btn"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove from wishlist"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="item-body">
                  <h3 className="item-title">{item.title}</h3>
                  <p className="item-store">{item.store}</p>
                  
                  <div className="price-info">
                    <div className="current-price">${item.currentPrice.toFixed(2)}</div>
                    {item.originalPrice > item.currentPrice && (
                      <>
                        <span className="original-price">${item.originalPrice.toFixed(2)}</span>
                        <span className="price-drop">
                          Save ${(item.originalPrice - item.currentPrice).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="price-history">
                    <div className="price-chart">
                      {item.priceHistory?.map((price, index) => (
                        <div 
                          key={index}
                          className="price-bar"
                          style={{ 
                            height: `${(price / Math.max(...item.priceHistory)) * 100}%` 
                          }}
                          title={`$${price.toFixed(2)}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="item-footer">
                  <span className="added-date">
                    Added {new Date(item.dateAdded).toLocaleDateString()}
                  </span>
                  <a 
                    href={item.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="shop-now-btn"
                  >
                    Shop Now
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WishlistPage;