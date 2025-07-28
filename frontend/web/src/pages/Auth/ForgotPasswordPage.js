import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import './AuthPages.css';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { forgotPassword } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await forgotPassword(email);
      
      if (result.success) {
        setIsSubmitted(true);
        toast.success('Password reset email sent!');
      } else {
        toast.error(result.error || 'Failed to send reset email');
      }
    } catch (err) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <div className="success-icon">📧</div>
            <h1>Check Your Email</h1>
            <p>
              We've sent a password reset link to <strong>{email}</strong>
            </p>
          </div>

          <div className="auth-content">
            <p>
              Click the link in the email to reset your password. 
              If you don't see the email, check your spam folder.
            </p>
            
            <div className="auth-actions">
              <button
                onClick={() => setIsSubmitted(false)}
                className="btn btn-secondary btn-full"
              >
                Try Different Email
              </button>
              
              <Link to="/login" className="btn btn-primary btn-full">
                Back to Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Forgot Password?</h1>
          <p>Enter your email address and we'll send you a link to reset your password</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email address"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isLoading || !email}
          >
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <div className="auth-links">
          <Link to="/login" className="back-link">
            ← Back to Sign In
          </Link>
          
          <div className="auth-switch">
            Don't have an account?{' '}
            <Link to="/register" className="auth-switch-link">
              Sign up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;