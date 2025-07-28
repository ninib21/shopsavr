import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span className="logo-icon">🛒</span>
          <span className="logo-text">ShopSavr</span>
        </Link>
        
        <nav className="nav">
          {isAuthenticated ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/coupons" className="nav-link">Coupons</Link>
              <Link to="/wishlist" className="nav-link">Wishlist</Link>
              <Link to="/savings" className="nav-link">Savings</Link>
              
              <div className="user-menu">
                <span className="user-greeting">Hi, {user?.firstName || 'User'}!</span>
                <div className="user-dropdown">
                  <Link to="/profile" className="dropdown-item">Profile</Link>
                  <Link to="/settings" className="dropdown-item">Settings</Link>
                  <Link to="/upgrade" className="dropdown-item">Upgrade</Link>
                  <button onClick={handleLogout} className="dropdown-item logout">
                    Logout
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-primary">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;