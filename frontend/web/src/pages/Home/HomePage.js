import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import './HomePage.css';

const HomePage = () => {
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    // Generate particles for background animation
    const particleArray = [];
    for (let i = 0; i < 30; i++) {
      particleArray.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        delay: Math.random() * 6,
        size: Math.random() * 3 + 1
      });
    }
    setParticles(particleArray);
  }, []);

  return (
    <>
      <Helmet>
        <title>ShopSavr - Your Ultimate Coupon & Shopping Deal Finder</title>
        <meta
          name="description"
          content="Automatically find the best prices and apply active promo codes at checkout."
        />
        <meta name="keywords" content="coupons, shopping, savings, deals, discounts, browser extension" />
      </Helmet>

      <div className="cyber-homepage">
        {/* Animated Background */}
        <div className="cyber-background">
          <div className="cyber-grid"></div>
          <div className="floating-particles">
            {particles.map(particle => (
              <div
                key={particle.id}
                className="cyber-particle"
                style={{
                  left: `${particle.x}px`,
                  top: `${particle.y}px`,
                  animationDelay: `${particle.delay}s`,
                  width: `${particle.size}px`,
                  height: `${particle.size}px`
                }}
              />
            ))}
          </div>
          <div className="cyber-border-frame"></div>
        </div>

        {/* Main Content Container */}
        <div className="cyber-container">
          {/* Logo Section */}
          <motion.div
            className="cyber-logo-section"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <div className="cyber-logo">
              <div className="logo-icon-wrapper">
                <div className="discount-icon">
                  <span className="percent-symbol">%</span>
                </div>
              </div>
              <h1 className="logo-text">ShopSavr</h1>
            </div>
          </motion.div>

          {/* Main Heading */}
          <motion.div
            className="cyber-hero-text"
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <h2 className="cyber-main-title">
              <span className="title-line-1">Your Ultimate</span>
              <span className="title-line-2">Coupon & Shopping</span>
              <span className="title-line-3">Deal Finder</span>
            </h2>
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="cyber-subtitle"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8 }}
          >
            Automatically find the best prices and apply<br />
            active promo codes at checkout.
          </motion.p>

          {/* CTA Button */}
          <motion.div
            className="cyber-cta-section"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.1 }}
          >
            <Link to="/register" className="cyber-cta-button">
              <span className="button-text">Get Started</span>
              <div className="button-glow"></div>
            </Link>
          </motion.div>

          {/* Navigation Links */}
          <motion.div
            className="cyber-nav-links"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4 }}
          >
            <a href="#how-it-works" className="cyber-nav-link">How It Works</a>
            <span className="nav-separator">•</span>
            <a href="#pricing" className="cyber-nav-link">Pricing</a>
          </motion.div>
        </div>

        {/* Stats Section */}
        <section className="cyber-stats-section">
          <div className="cyber-container">
            <div className="stats-grid">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.id}
                  className="stat-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-number">{stat.number}</div>
                  <div className="stat-label">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="cyber-features-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">Powerful Features</h3>
              <p className="section-subtitle">Everything you need to maximize 

        {/* Pricing Section */}
        <section id="pricing" className="cyber-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">Choose Your Plan</h3>
              <p className="section-subtitle">Start saving money today</p>
            </motion.div>

            <div className="pricing-grid">
              {pricingPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  {plan.popular && <div className="popular-badge">Most Popular</div>}
                  <h4 className="plan-name">{plan.name}</h4>
                  <div className="plan-price">
                    <span className="price-symbol">$</span>
                    <span className="price-amount">{plan.price}</span>
                    <span className="price-period">{plan.period}</span>
                  </div>
                  <ul className="plan-features">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="feature-item">
                        <i className="fas fa-check feature-check"></i>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Link to="/register" className={`plan-button ${plan.buttonClass}`}>
                    {plan.buttonText}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

// Steps data
const steps = [
  {
    id: 1,
    number: '01',
    title: 'Install Extension',
    description: 'Add ShopSavr to your browser in seconds'
  },
  {
    id: 2,
    number: '02',
    title: 'Shop Normally',
    description: 'Continue shopping on your favorite sites'
  },
  {
    id: 3,
    number: '03',
    title: 'Save Automatically',
    description: 'We find and apply the best coupons for you'
  }
];

// Pricing plans data
const pricingPlans = [
  {
    id: 1,
    name: 'Free',
    price: '0',
    period: '/forever',
    popular: false,
    buttonClass: 'outline',
    buttonText: 'Get Started',
    features: [
      'Basic coupon finding',
      'Chrome extension',
      'Email support'
    ]
  },
  {
    id: 2,
    name: 'Pro',
    price: '9.99',
    period: '/month',
    popular: true,
    buttonClass: 'primary',
    buttonText: 'Start Free Trial',
    features: [
      'Advanced AI coupons',
      'Price drop alerts',
      'Mobile apps',
      'Priority support',
      'Cashback tracking'
    ]
  },
  {
    id: 3,
    name: 'Enterprise',
    price: '29.99',
    period: '/month',
    popular: false,
    buttonClass: 'outline',
    buttonText: 'Contact Sales',
    features: [
      'Everything in Pro',
      'Team management',
      'API access',
      'Custom integrations',
      'Dedicated support'
    ]
  }
];

export default HomePage;