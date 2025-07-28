import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './UpgradePage.css';

const UpgradePage = () => {
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = {
    free: {
      name: 'Free',
      price: { monthly: 0, yearly: 0 },
      features: [
        'Basic coupon search',
        'Up to 10 wishlist items',
        'Email notifications',
        'Browser extension'
      ],
      limitations: [
        'Limited coupon access',
        'Basic price tracking',
        'Standard support'
      ]
    },
    pro: {
      name: 'Pro',
      price: { monthly: 9.99, yearly: 99.99 },
      features: [
        'Unlimited coupon access',
        'Unlimited wishlist items',
        'Advanced price tracking',
        'Real-time notifications',
        'Cashback rewards',
        'Priority support',
        'Advanced analytics',
        'Custom alerts'
      ],
      popular: true
    },
    premium: {
      name: 'Premium',
      price: { monthly: 19.99, yearly: 199.99 },
      features: [
        'Everything in Pro',
        'Personal shopping assistant',
        'Exclusive deals access',
        'Advanced automation',
        'API access',
        'White-label options',
        'Dedicated account manager',
        'Custom integrations'
      ]
    }
  };

  const handleUpgrade = (planName) => {
    // TODO: Implement payment processing
    console.log(`Upgrading to ${planName} plan (${billingCycle})`);
  };

  const currentPlan = user?.subscription?.plan || 'free';

  return (
    <div className="upgrade-page">
      <div className="page-header">
        <h1>Upgrade Your Plan</h1>
        <p>Unlock more savings and premium features</p>
      </div>

      <div className="billing-toggle">
        <div className="toggle-container">
          <button
            className={`toggle-btn ${billingCycle === 'monthly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('monthly')}
          >
            Monthly
          </button>
          <button
            className={`toggle-btn ${billingCycle === 'yearly' ? 'active' : ''}`}
            onClick={() => setBillingCycle('yearly')}
          >
            Yearly
            <span className="savings-badge">Save 17%</span>
          </button>
        </div>
      </div>

      <div className="plans-grid">
        {Object.entries(plans).map(([planKey, plan]) => (
          <div
            key={planKey}
            className={`plan-card ${plan.popular ? 'popular' : ''} ${currentPlan === planKey ? 'current' : ''}`}
          >
            {plan.popular && <div className="popular-badge">Most Popular</div>}
            {currentPlan === planKey && <div className="current-badge">Current Plan</div>}
            
            <div className="plan-header">
              <h3 className="plan-name">{plan.name}</h3>
              <div className="plan-price">
                <span className="price-amount">
                  ${plan.price[billingCycle]}
                </span>
                <span className="price-period">
                  /{billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
              </div>
              {billingCycle === 'yearly' && plan.price.yearly > 0 && (
                <div className="yearly-savings">
                  Save ${(plan.price.monthly * 12 - plan.price.yearly).toFixed(2)} per year
                </div>
              )}
            </div>

            <div className="plan-features">
              <ul className="features-list">
                {plan.features.map((feature, index) => (
                  <li key={index} className="feature-item">
                    <span className="feature-icon">✓</span>
                    <span className="feature-text">{feature}</span>
                  </li>
                ))}
              </ul>
              
              {plan.limitations && (
                <ul className="limitations-list">
                  {plan.limitations.map((limitation, index) => (
                    <li key={index} className="limitation-item">
                      <span className="limitation-icon">⚠</span>
                      <span className="limitation-text">{limitation}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="plan-action">
              {currentPlan === planKey ? (
                <button className="btn btn-current" disabled>
                  Current Plan
                </button>
              ) : planKey === 'free' ? (
                <button className="btn btn-secondary" disabled>
                  Downgrade
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleUpgrade(planKey)}
                >
                  {currentPlan === 'free' ? 'Upgrade' : 'Switch'} to {plan.name}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="features-comparison">
        <h2>Feature Comparison</h2>
        <div className="comparison-table">
          <div className="comparison-header">
            <div className="feature-column">Features</div>
            <div className="plan-column">Free</div>
            <div className="plan-column">Pro</div>
            <div className="plan-column">Premium</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">Coupon Access</div>
            <div className="feature-value">Limited</div>
            <div className="feature-value">✓ Unlimited</div>
            <div className="feature-value">✓ Unlimited</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">Wishlist Items</div>
            <div className="feature-value">10</div>
            <div className="feature-value">✓ Unlimited</div>
            <div className="feature-value">✓ Unlimited</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">Price Tracking</div>
            <div className="feature-value">Basic</div>
            <div className="feature-value">✓ Advanced</div>
            <div className="feature-value">✓ Advanced</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">Cashback Rewards</div>
            <div className="feature-value">✗</div>
            <div className="feature-value">✓</div>
            <div className="feature-value">✓</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">Personal Assistant</div>
            <div className="feature-value">✗</div>
            <div className="feature-value">✗</div>
            <div className="feature-value">✓</div>
          </div>
          
          <div className="comparison-row">
            <div className="feature-name">API Access</div>
            <div className="feature-value">✗</div>
            <div className="feature-value">✗</div>
            <div className="feature-value">✓</div>
          </div>
        </div>
      </div>

      <div className="faq-section">
        <h2>Frequently Asked Questions</h2>
        <div className="faq-list">
          <div className="faq-item">
            <h4>Can I cancel anytime?</h4>
            <p>Yes, you can cancel your subscription at any time. Your plan will remain active until the end of your billing period.</p>
          </div>
          
          <div className="faq-item">
            <h4>What payment methods do you accept?</h4>
            <p>We accept all major credit cards, PayPal, and bank transfers for yearly plans.</p>
          </div>
          
          <div className="faq-item">
            <h4>Is there a free trial?</h4>
            <p>Yes! All paid plans come with a 14-day free trial. No credit card required.</p>
          </div>
          
          <div className="faq-item">
            <h4>Can I switch plans later?</h4>
            <p>Absolutely! You can upgrade or downgrade your plan at any time from your account settings.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;