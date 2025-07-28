import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchCoupons, searchCoupons } from '../../store/slices/couponsSlice';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import './CouponsPage.css';

const CouponsPage = () => {
  const dispatch = useDispatch();
  const { coupons, loading, error } = useSelector(state => state.coupons || { coupons: [], loading: false, error: null });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    // dispatch(fetchCoupons());
    // For now, we'll use mock data since the API isn't connected
  }, [dispatch]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      dispatch(searchCoupons(searchTerm));
    }
  };

  const categories = ['all', 'fashion', 'electronics', 'food', 'travel', 'home'];

  const filteredCoupons = coupons.filter(coupon => {
    const matchesCategory = selectedCategory === 'all' || coupon.category === selectedCategory;
    const matchesSearch = coupon.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         coupon.store.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (loading) return <LoadingSpinner />;

  return (
    <div className="coupons-page">
      <div className="page-header">
        <h1>Find Coupons</h1>
        <p>Discover the best coupon codes and deals for your favorite stores</p>
      </div>

      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search for store or product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <button type="submit" className="search-btn">
              🔍
            </button>
          </div>
        </form>

        <div className="category-filters">
          {categories.map(category => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="coupons-content">
        {error && (
          <div className="error-message">
            <p>Error loading coupons: {error}</p>
          </div>
        )}

        {filteredCoupons.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎫</div>
            <h3>No coupons found</h3>
            <p>Try adjusting your search terms or browse different categories</p>
          </div>
        ) : (
          <div className="coupons-grid">
            {filteredCoupons.map(coupon => (
              <div key={coupon.id} className="coupon-card">
                <div className="coupon-header">
                  <div className="store-info">
                    <img src={coupon.storeImage} alt={coupon.store} className="store-logo" />
                    <span className="store-name">{coupon.store}</span>
                  </div>
                  <div className="discount-badge">
                    {coupon.discount}
                  </div>
                </div>
                
                <div className="coupon-body">
                  <h3 className="coupon-title">{coupon.title}</h3>
                  <p className="coupon-description">{coupon.description}</p>
                  
                  <div className="coupon-code">
                    <span className="code-label">Code:</span>
                    <span className="code-value">{coupon.code}</span>
                    <button 
                      className="copy-btn"
                      onClick={() => navigator.clipboard.writeText(coupon.code)}
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="coupon-footer">
                  <span className="expiry-date">
                    Expires: {new Date(coupon.expiryDate).toLocaleDateString()}
                  </span>
                  <a 
                    href={coupon.storeUrl} 
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

export default CouponsPage;