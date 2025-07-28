import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const HomePage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Save Money While Shopping Online
            <span className="hero-emoji">💰</span>
          </h1>
          <p className="hero-subtitle">
            Automatically find and apply the best coupon codes. 
            Track prices, manage wishlists, and maximize your savings effortlessly.
          </p>
          
          <div className="hero-actions">
            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-large">
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/register" className="btn btn-primary btn-large">
                  Get Started Free
                </Link>
                <Link to="/login" className="btn btn-secondary btn-large">
                  Sign In
                </Link>
              </>
            )}
          </div>
          
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-number">$2.5M+</span>
              <span className="stat-label">Total Saved</span>
            </div>
            <div className="stat">
              <span className="stat-number">50K+</span>
              <span className="stat-label">Happy Users</span>
            </div>
            <div className="stat">
              <span className="stat-number">1M+</span>
              <span className="stat-label">Coupons Found</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2 className="section-title">Why Choose ShopSavr?</h2>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">🎫</div>
              <h3>Automatic Coupon Detection</h3>
              <p>Our browser extension automatically finds and applies the best coupon codes at checkout.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Price Tracking</h3>
              <p>Track product prices across multiple stores and get alerts when prices drop.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">💝</div>
              <h3>Smart Wishlist</h3>
              <p>Save products you love and get notified when they go on sale or when coupons are available.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">📱</div>
              <h3>Multi-Platform</h3>
              <p>Access your savings dashboard on web, mobile, and through our browser extension.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">🔒</div>
              <h3>Secure & Private</h3>
              <p>Your data is encrypted and secure. We never store your payment information.</p>
            </div>
            
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Lightning Fast</h3>
              <p>Find and apply coupons in seconds without slowing down your shopping experience.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <div className="container">
          <div className="cta-content">
            <h2>Ready to Start Saving?</h2>
            <p>Join thousands of smart shoppers who save money with ShopSavr</p>
            
            {!isAuthenticated && (
              <div className="cta-actions">
                <Link to="/register" className="btn btn-primary btn-large">
                  Create Free Account
                </Link>
                <p className="cta-note">No credit card required • Free forever</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;