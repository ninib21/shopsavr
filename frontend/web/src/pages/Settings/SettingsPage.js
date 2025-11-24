import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import './SettingsPage.css';

const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('account');
  const [notifications, setNotifications] = useState({
    priceDrops: true,
    newCoupons: true,
    weeklyReport: false,
    marketing: false
  });

  const handleNotificationChange = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      logout();
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: '👤' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'privacy', label: 'Privacy', icon: '🔒' },
    { id: 'appearance', label: 'Appearance', icon: '🎨' }
  ];

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account and preferences</p>
      </div>

      <div className="settings-container">
        <div className="settings-sidebar">
          <nav className="settings-nav">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="nav-icon">{tab.icon}</span>
                <span className="nav-label">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="settings-content">
          {activeTab === 'account' && (
            <div className="settings-section">
              <h2>Account Information</h2>
              
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  value={user?.name || ''} 
                  readOnly 
                  className="form-input readonly"
                />
              </div>
              
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  value={user?.email || ''} 
                  readOnly 
                  className="form-input readonly"
                />
              </div>
              
              <div className="form-group">
                <label>Member Since</label>
                <input 
                  type="text" 
                  value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'} 
                  readOnly 
                  className="form-input readonly"
                />
              </div>
              
              <div className="form-group">
                <label>Subscription Plan</label>
                <div className="subscription-info">
                  <span className="plan-badge free">Free Plan</span>
                  <Link to="/upgrade" className="btn btn-primary">Upgrade to Pro</Link>
                </div>
              </div>

              <div className="action-buttons">
                <Link to="/profile" className="btn btn-secondary">Change Password</Link>
                <button className="btn btn-danger" onClick={handleLogout}>
                  Sign Out
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="settings-section">
              <h2>Notification Preferences</h2>
              <p className="section-description">
                Choose what notifications you'd like to receive
              </p>
              
              <div className="notification-settings">
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Price Drop Alerts</h4>
                    <p>Get notified when items in your wishlist drop in price</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.priceDrops}
                      onChange={() => handleNotificationChange('priceDrops')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>New Coupons</h4>
                    <p>Be the first to know about new coupon codes</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.newCoupons}
                      onChange={() => handleNotificationChange('newCoupons')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Weekly Savings Report</h4>
                    <p>Weekly summary of your savings and deals</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.weeklyReport}
                      onChange={() => handleNotificationChange('weeklyReport')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                
                <div className="notification-item">
                  <div className="notification-info">
                    <h4>Marketing Emails</h4>
                    <p>Promotional offers and product updates</p>
                  </div>
                  <label className="toggle-switch">
                    <input
                      type="checkbox"
                      checked={notifications.marketing}
                      onChange={() => handleNotificationChange('marketing')}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy & Security</h2>
              <p className="section-description">
                Control your privacy and security settings
              </p>
              
              <div className="privacy-settings">
                <div className="privacy-item">
                  <h4>Data Collection</h4>
                  <p>We collect minimal data to provide our services</p>
                  <a href="https://shopsavr.xyz/privacy" target="_blank" rel="noopener noreferrer" className="btn btn-secondary">View Privacy Policy</a>
                </div>
                
                <div className="privacy-item">
                  <h4>Account Data</h4>
                  <p>Download or delete your account data</p>
                  <div className="privacy-actions">
                    <Link to="/profile" className="btn btn-secondary">Download Data</Link>
                    <Link to="/profile" className="btn btn-danger">Delete Account</Link>
                  </div>
                </div>
                
                <div className="privacy-item">
                  <h4>Browser Extension</h4>
                  <p>Manage extension permissions and data access</p>
                  <a href="chrome-extension://settings" className="btn btn-secondary">Extension Settings</a>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="settings-section">
              <h2>Appearance</h2>
              <p className="section-description">
                Customize how ShopSavr looks and feels
              </p>
              
              <div className="appearance-settings">
                <div className="appearance-item">
                  <div className="appearance-info">
                    <h4>Theme</h4>
                    <p>Choose between light and dark mode</p>
                  </div>
                  <div className="theme-selector">
                    <button 
                      className={`theme-option ${theme === 'light' ? 'active' : ''}`}
                      onClick={() => theme !== 'light' && toggleTheme()}
                    >
                      ☀️ Light
                    </button>
                    <button 
                      className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
                      onClick={() => theme !== 'dark' && toggleTheme()}
                    >
                      🌙 Dark
                    </button>
                  </div>
                </div>
                
                <div className="appearance-item">
                  <div className="appearance-info">
                    <h4>Language</h4>
                    <p>Select your preferred language</p>
                  </div>
                  <select className="language-select">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>
                
                <div className="appearance-item">
                  <div className="appearance-info">
                    <h4>Currency</h4>
                    <p>Choose your preferred currency display</p>
                  </div>
                  <select className="currency-select">
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;