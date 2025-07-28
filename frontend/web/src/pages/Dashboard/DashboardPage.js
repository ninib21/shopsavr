import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './DashboardPage.css';

const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>Welcome back, {user?.name}! 👋</h1>
        <p>Here's your savings overview</p>
      </div>

      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <h3>Total Saved</h3>
            <p className="stat-value">$0.00</p>
            <span className="stat-change">+$0.00 this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🎫</div>
          <div className="stat-content">
            <h3>Coupons Used</h3>
            <p className="stat-value">0</p>
            <span className="stat-change">0 this month</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💝</div>
          <div className="stat-content">
            <h3>Wishlist Items</h3>
            <p className="stat-value">0</p>
            <span className="stat-change">0 price drops</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <h3>Avg. Savings</h3>
            <p className="stat-value">$0.00</p>
            <span className="stat-change">per order</span>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        <div className="dashboard-section">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            <div className="empty-state">
              <div className="empty-icon">📈</div>
              <h3>No activity yet</h3>
              <p>Start shopping with ShopSavr to see your savings activity here!</p>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <h2>Quick Actions</h2>
          <div className="quick-actions">
            <a href="/coupons" className="action-card">
              <div className="action-icon">🔍</div>
              <h3>Find Coupons</h3>
              <p>Search for coupon codes</p>
            </a>
            
            <a href="/wishlist" className="action-card">
              <div className="action-icon">💝</div>
              <h3>Manage Wishlist</h3>
              <p>Track your favorite items</p>
            </a>
            
            <a href="/settings" className="action-card">
              <div className="action-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Customize your experience</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;