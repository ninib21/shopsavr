import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './ProfilePage.css';

const ProfilePage = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    bio: user?.bio || '',
    location: user?.location || '',
    website: user?.website || ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = () => {
    // TODO: Implement profile update API call
    console.log('Saving profile:', formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: user?.name || '',
      email: user?.email || '',
      bio: user?.bio || '',
      location: user?.location || '',
      website: user?.website || ''
    });
    setIsEditing(false);
  };

  const stats = {
    totalSavings: 1247.50,
    couponsUsed: 23,
    wishlistItems: 12,
    memberSince: user?.createdAt ? new Date(user.createdAt).getFullYear() : new Date().getFullYear()
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>My Profile</h1>
        <p>Manage your personal information and view your savings stats</p>
      </div>

      <div className="profile-container">
        <div className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-avatar">
              <img 
                src={user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=667eea&color=fff&size=120`}
                alt="Profile"
                className="avatar-image"
              />
              <button className="avatar-edit-btn">📷</button>
            </div>
            
            <div className="profile-info">
              <h2 className="profile-name">{user?.name || 'User'}</h2>
              <p className="profile-email">{user?.email}</p>
              <div className="member-badge">
                <span className="badge-icon">⭐</span>
                <span>Member since {stats.memberSince}</span>
              </div>
            </div>
          </div>

          <div className="stats-card">
            <h3>Your Stats</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">${stats.totalSavings}</div>
                <div className="stat-label">Total Saved</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.couponsUsed}</div>
                <div className="stat-label">Coupons Used</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{stats.wishlistItems}</div>
                <div className="stat-label">Wishlist Items</div>
              </div>
            </div>
          </div>
        </div>

        <div className="profile-content">
          <div className="profile-section">
            <div className="section-header">
              <h3>Personal Information</h3>
              {!isEditing ? (
                <button 
                  className="btn btn-primary"
                  onClick={() => setIsEditing(true)}
                >
                  Edit Profile
                </button>
              ) : (
                <div className="edit-actions">
                  <button 
                    className="btn btn-secondary"
                    onClick={handleCancel}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-primary"
                    onClick={handleSave}
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Full Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-display">{formData.name || 'Not provided'}</div>
                )}
              </div>

              <div className="form-group">
                <label>Email Address</label>
                {isEditing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                ) : (
                  <div className="form-display">{formData.email}</div>
                )}
              </div>

              <div className="form-group full-width">
                <label>Bio</label>
                {isEditing ? (
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="form-textarea"
                    placeholder="Tell us about yourself..."
                    rows="3"
                  />
                ) : (
                  <div className="form-display">
                    {formData.bio || 'No bio provided'}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Location</label>
                {isEditing ? (
                  <input
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="City, Country"
                  />
                ) : (
                  <div className="form-display">{formData.location || 'Not provided'}</div>
                )}
              </div>

              <div className="form-group">
                <label>Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    className="form-input"
                    placeholder="https://example.com"
                  />
                ) : (
                  <div className="form-display">
                    {formData.website ? (
                      <a 
                        href={formData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="website-link"
                      >
                        {formData.website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Account Security</h3>
            <div className="security-items">
              <div className="security-item">
                <div className="security-info">
                  <h4>Password</h4>
                  <p>Last changed 3 months ago</p>
                </div>
                <button className="btn btn-secondary">Change Password</button>
              </div>
              
              <div className="security-item">
                <div className="security-info">
                  <h4>Two-Factor Authentication</h4>
                  <p>Add an extra layer of security to your account</p>
                </div>
                <button className="btn btn-primary">Enable 2FA</button>
              </div>
              
              <div className="security-item">
                <div className="security-info">
                  <h4>Login Sessions</h4>
                  <p>Manage your active login sessions</p>
                </div>
                <button className="btn btn-secondary">View Sessions</button>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">🛒</div>
                <div className="activity-content">
                  <h4>Used coupon "SAVE20"</h4>
                  <p>Saved $15.99 on Amazon purchase</p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon">❤️</div>
                <div className="activity-content">
                  <h4>Added item to wishlist</h4>
                  <p>Nike Air Max 270 - Black/White</p>
                  <span className="activity-time">1 day ago</span>
                </div>
              </div>
              
              <div className="activity-item">
                <div className="activity-icon">📉</div>
                <div className="activity-content">
                  <h4>Price drop alert</h4>
                  <p>MacBook Pro dropped by $200</p>
                  <span className="activity-time">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;