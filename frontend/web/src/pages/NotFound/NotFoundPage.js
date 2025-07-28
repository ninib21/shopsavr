import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './NotFoundPage.css';

const NotFoundPage = () => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="not-found-page">
      <div className="not-found-container">
        <div className="error-illustration">
          <div className="error-code">404</div>
          <div className="error-icon">🔍</div>
        </div>
        
        <div className="error-content">
          <h1>Page Not Found</h1>
          <p>
            Oops! The page you're looking for doesn't exist. 
            It might have been moved, deleted, or you entered the wrong URL.
          </p>
          
          <div className="error-actions">
            <Link 
              to={isAuthenticated ? "/dashboard" : "/"} 
              className="btn btn-primary"
            >
              {isAuthenticated ? "Go to Dashboard" : "Go Home"}
            </Link>
            
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-secondary"
            >
              Go Back
            </button>
          </div>
        </div>
        
        <div className="helpful-links">
          <h3>Maybe you're looking for:</h3>
          <div className="links-grid">
            {isAuthenticated ? (
              <>
                <Link to="/dashboard" className="help-link">
                  <span className="link-icon">📊</span>
                  <span className="link-text">Dashboard</span>
                </Link>
                <Link to="/wishlist" className="help-link">
                  <span className="link-icon">❤️</span>
                  <span className="link-text">Wishlist</span>
                </Link>
                <Link to="/coupons" className="help-link">
                  <span className="link-icon">🎫</span>
                  <span className="link-text">Coupons</span>
                </Link>
                <Link to="/savings" className="help-link">
                  <span className="link-icon">💰</span>
                  <span className="link-text">Savings</span>
                </Link>
              </>
            ) : (
              <>
                <Link to="/" className="help-link">
                  <span className="link-icon">🏠</span>
                  <span className="link-text">Home</span>
                </Link>
                <Link to="/login" className="help-link">
                  <span className="link-icon">🔐</span>
                  <span className="link-text">Login</span>
                </Link>
                <Link to="/register" className="help-link">
                  <span className="link-icon">📝</span>
                  <span className="link-text">Sign Up</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;