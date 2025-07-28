import React from 'react';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h4>ShopSavr</h4>
            <p>Save money while shopping online</p>
          </div>
          
          <div className="footer-section">
            <h4>Product</h4>
            <a href="/features">Features</a>
            <a href="/pricing">Pricing</a>
            <a href="/extension">Browser Extension</a>
          </div>
          
          <div className="footer-section">
            <h4>Support</h4>
            <a href="/help">Help Center</a>
            <a href="/contact">Contact Us</a>
            <a href="/feedback">Feedback</a>
          </div>
          
          <div className="footer-section">
            <h4>Legal</h4>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/security">Security</a>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 ShopSavr. All rights reserved.</p>
          <div className="social-links">
            <a href="#" aria-label="Twitter">🐦</a>
            <a href="#" aria-label="Facebook">📘</a>
            <a href="#" aria-label="Instagram">📷</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;