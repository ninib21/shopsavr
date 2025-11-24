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
              <p className="section-subtitle">Everything you need to maximize your savings</p>
            </motion.div>

            <div className="features-grid">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  className="feature-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className={`feature-icon ${feature.iconColor}`}>
                    <i className={feature.icon}></i>
                  </div>
                  <h4 className="feature-title">{feature.title}</h4>
                  <p className="feature-description">{feature.description}</p>
                  <div className="feature-benefits">
                    {feature.benefits.map((benefit, idx) => (
                      <span key={idx} className="benefit-tag">{benefit}</span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="cyber-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">How It Works</h3>
              <p className="section-subtitle">Save money in 3 simple steps</p>
            </motion.div>

            <div className="steps-grid">
              {steps.map((step, index) => (
                <motion.div
                  key={step.id}
                  className="step-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.2 }}
                  viewport={{ once: true }}
                >
                  <div className="step-icon">
                    <i className={step.icon}></i>
                  </div>
                  <div className="step-number">{step.number}</div>
                  <h4 className="step-title">{step.title}</h4>
                  <p className="step-description">{step.description}</p>
                  <div className="step-details">
                    {step.details.map((detail, idx) => (
                      <div key={idx} className="step-detail">
                        <i className="fas fa-check-circle"></i>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Demo Section */}
        <section className="cyber-demo-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">See ShopSavr in Action</h3>
              <p className="section-subtitle">Watch how we automatically save you money</p>
            </motion.div>

            <motion.div
              className="demo-container"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="browser-mockup">
                <div className="browser-header">
                  <div className="browser-controls">
                    <span className="control red"></span>
                    <span className="control yellow"></span>
                    <span className="control green"></span>
                  </div>
                  <div className="browser-url">
                    <i className="fas fa-lock"></i>
                    amazon.com/checkout
                  </div>
                </div>
                <div className="browser-content">
                  <div className="checkout-mockup">
                    <div className="product-item">
                      <div className="product-image"></div>
                      <div className="product-details">
                        <h5>Wireless Headphones</h5>
                        <p className="original-price">$199.99</p>
                      </div>
                    </div>
                    <motion.div
                      className="shopsavr-popup"
                      animate={{
                        scale: [1, 1.05, 1],
                        boxShadow: [
                          '0 0 20px rgba(0, 212, 255, 0.3)',
                          '0 0 40px rgba(0, 212, 255, 0.6)',
                          '0 0 20px rgba(0, 212, 255, 0.3)'
                        ]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                    >
                      <div className="popup-header">
                        <i className="fas fa-magic"></i>
                        ShopSavr Found 3 Coupons!
                      </div>
                      <div className="coupon-list">
                        <div className="coupon-item best">
                          <span className="coupon-code">SAVE25</span>
                          <span className="coupon-savings">-$50.00</span>
                        </div>
                        <div className="coupon-item">
                          <span className="coupon-code">WELCOME20</span>
                          <span className="coupon-savings">-$40.00</span>
                        </div>
                        <div className="coupon-item">
                          <span className="coupon-code">FIRST15</span>
                          <span className="coupon-savings">-$30.00</span>
                        </div>
                      </div>
                      <div className="popup-footer">
                        <div className="total-savings">Total Savings: $50.00</div>
                        <button className="apply-btn">Apply Best Coupon</button>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="cyber-testimonials-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">What Our Users Say</h3>
              <p className="section-subtitle">Join thousands of happy savers</p>
            </motion.div>

            <div className="testimonials-grid">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.id}
                  className="testimonial-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="testimonial-content">
                    <div className="quote-icon">
                      <i className="fas fa-quote-left"></i>
                    </div>
                    <p className="testimonial-text">{testimonial.text}</p>
                    <div className="testimonial-savings">
                      Saved: <span className="savings-amount">${testimonial.saved}</span>
                    </div>
                  </div>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      <img src={testimonial.avatar} alt={testimonial.name} />
                    </div>
                    <div className="author-info">
                      <h5 className="author-name">{testimonial.name}</h5>
                      <p className="author-title">{testimonial.title}</p>
                    </div>
                    <div className="rating">
                      {[...Array(5)].map((_, i) => (
                        <i key={i} className="fas fa-star"></i>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Stores Section */}
        <section className="cyber-stores-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">Works on 10,000+ Stores</h3>
              <p className="section-subtitle">Save money on all your favorite shopping sites</p>
            </motion.div>

            <div className="stores-grid">
              {supportedStores.map((store, index) => (
                <motion.div
                  key={store.id}
                  className="store-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="store-logo">
                    <img src={store.logo} alt={store.name} />
                  </div>
                  <div className="store-info">
                    <h5 className="store-name">{store.name}</h5>
                    <p className="store-savings">Avg. savings: {store.avgSavings}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              className="stores-cta"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <p>And thousands more...</p>
              <Link to="/register" className="stores-button">
                Start Saving Now
              </Link>
            </motion.div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="cyber-faq-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">Frequently Asked Questions</h3>
              <p className="section-subtitle">Everything you need to know about ShopSavr</p>
            </motion.div>

            <div className="faq-grid">
              {faqs.map((faq, index) => (
                <motion.div
                  key={faq.id}
                  className="faq-card"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="faq-question">
                    <h4>{faq.question}</h4>
                    <i className="fas fa-chevron-down"></i>
                  </div>
                  <div className="faq-answer">
                    <p>{faq.answer}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Security & Trust Section */}
        <section className="cyber-security-section">
          <div className="cyber-container">
            <motion.div
              className="section-header"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <h3 className="section-title">Your Security is Our Priority</h3>
              <p className="section-subtitle">Enterprise-grade security you can trust</p>
            </motion.div>

            <div className="security-grid">
              {securityFeatures.map((feature, index) => (
                <motion.div
                  key={feature.id}
                  className="security-card"
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="security-icon">
                    <i className={feature.icon}></i>
                  </div>
                  <h4 className="security-title">{feature.title}</h4>
                  <p className="security-description">{feature.description}</p>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="trust-badges"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              viewport={{ once: true }}
            >
              <div className="badge">
                <i className="fas fa-shield-alt"></i>
                <span>SSL Encrypted</span>
              </div>
              <div className="badge">
                <i className="fas fa-lock"></i>
                <span>GDPR Compliant</span>
              </div>
              <div className="badge">
                <i className="fas fa-certificate"></i>
                <span>SOC 2 Certified</span>
              </div>
              <div className="badge">
                <i className="fas fa-user-shield"></i>
                <span>Privacy First</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="cyber-final-cta">
          <div className="cyber-container">
            <motion.div
              className="final-cta-content"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              viewport={{ once: true }}
            >
              <div className="cta-icon">
                <i className="fas fa-rocket"></i>
              </div>
              <h3 className="cta-title">Ready to Start Saving?</h3>
              <p className="cta-subtitle">
                Join over 500,000 smart shoppers who save money with ShopSavr every day.
                <br />
                Start your free trial now - no credit card required!
              </p>
              <div className="cta-buttons">
                <Link to="/register" className="cta-primary-btn">
                  Get Started Free
                </Link>
                <a href="#demo" className="cta-secondary-btn">
                  Watch Demo
                </a>
              </div>
              <div className="cta-guarantee">
                <i className="fas fa-medal"></i>
                <span>30-day money-back guarantee</span>
              </div>
            </motion.div>
          </div>
        </section>

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

// Stats data
const stats = [
  {
    id: 1,
    icon: '💰',
    number: '$2.5M+',
    label: 'Total Saved'
  },
  {
    id: 2,
    icon: '👥',
    number: '500K+',
    label: 'Happy Users'
  },
  {
    id: 3,
    icon: '🎫',
    number: '1M+',
    label: 'Coupons Applied'
  },
  {
    id: 4,
    icon: '🏪',
    number: '10K+',
    label: 'Partner Stores'
  }
];

// Features data
const features = [
  {
    id: 1,
    icon: 'fas fa-robot',
    iconColor: 'icon-blue',
    title: 'AI-Powered Coupon Detection',
    description: 'Our advanced AI scans millions of coupon codes in real-time to find the best deals for you.',
    benefits: ['Real-time scanning', 'Smart matching', 'Auto-validation']
  },
  {
    id: 2,
    icon: 'fas fa-bolt',
    iconColor: 'icon-green',
    title: 'Lightning-Fast Application',
    description: 'Apply coupons instantly at checkout with our one-click technology.',
    benefits: ['One-click apply', 'Instant savings', 'No manual entry']
  },
  {
    id: 3,
    icon: 'fas fa-chart-line',
    iconColor: 'icon-pink',
    title: 'Price Drop Monitoring',
    description: 'Track your favorite products and get notified when prices drop.',
    benefits: ['Price alerts', 'Historical tracking', 'Best time to buy']
  },
  {
    id: 4,
    icon: 'fas fa-shield-alt',
    iconColor: 'icon-purple',
    title: 'Secure & Private',
    description: 'Your data is encrypted and secure. We never store payment information.',
    benefits: ['End-to-end encryption', 'Privacy first', 'No data selling']
  },
  {
    id: 5,
    icon: 'fas fa-mobile-alt',
    iconColor: 'icon-orange',
    title: 'Cross-Platform Sync',
    description: 'Access your savings across all devices - browser, mobile, and desktop.',
    benefits: ['Universal sync', 'Mobile apps', 'Cloud backup']
  },
  {
    id: 6,
    icon: 'fas fa-users',
    iconColor: 'icon-cyan',
    title: 'Community Driven',
    description: 'Join a community of smart shoppers sharing the best deals and tips.',
    benefits: ['Deal sharing', 'User reviews', 'Community tips']
  }
];

// Steps data
const steps = [
  {
    id: 1,
    number: '01',
    icon: 'fas fa-download',
    title: 'Install Extension',
    description: 'Add ShopSavr to your browser in seconds',
    details: [
      'Works with Chrome, Firefox, Edge',
      'Lightweight and fast',
      'No account required to start'
    ]
  },
  {
    id: 2,
    number: '02',
    icon: 'fas fa-shopping-cart',
    title: 'Shop Normally',
    description: 'Continue shopping on your favorite sites',
    details: [
      'Works on 10,000+ stores',
      'No change to your routine',
      'Automatic detection'
    ]
  },
  {
    id: 3,
    number: '03',
    icon: 'fas fa-magic',
    title: 'Save Automatically',
    description: 'We find and apply the best coupons for you',
    details: [
      'Best coupon guaranteed',
      'Instant application',
      'Track your savings'
    ]
  }
];

// Testimonials data
const testimonials = [
  {
    id: 1,
    name: 'Sarah Johnson',
    title: 'Frequent Online Shopper',
    text: 'ShopSavr has saved me over $500 this year alone! It finds coupons I never would have discovered on my own.',
    saved: '547',
    avatar: 'https://ui-avatars.com/api/?name=Sarah+Johnson&background=00d4ff&color=fff&size=60'
  },
  {
    id: 2,
    name: 'Mike Chen',
    title: 'Tech Enthusiast',
    text: 'The AI-powered coupon detection is incredible. It works seamlessly and saves me time and money on every purchase.',
    saved: '892',
    avatar: 'https://ui-avatars.com/api/?name=Mike+Chen&background=39ff14&color=fff&size=60'
  },
  {
    id: 3,
    name: 'Emily Rodriguez',
    title: 'Budget-Conscious Mom',
    text: 'As a mom of three, every dollar counts. ShopSavr helps me stretch our budget further than I ever thought possible.',
    saved: '1247',
    avatar: 'https://ui-avatars.com/api/?name=Emily+Rodriguez&background=ff1493&color=fff&size=60'
  }
];

// Supported stores data
const supportedStores = [
  {
    id: 1,
    name: 'Amazon',
    logo: 'https://logo.clearbit.com/amazon.com',
    avgSavings: '$25'
  },
  {
    id: 2,
    name: 'Target',
    logo: 'https://logo.clearbit.com/target.com',
    avgSavings: '$18'
  },
  {
    id: 3,
    name: 'Walmart',
    logo: 'https://logo.clearbit.com/walmart.com',
    avgSavings: '$22'
  },
  {
    id: 4,
    name: 'Best Buy',
    logo: 'https://logo.clearbit.com/bestbuy.com',
    avgSavings: '$45'
  },
  {
    id: 5,
    name: 'Nike',
    logo: 'https://logo.clearbit.com/nike.com',
    avgSavings: '$35'
  },
  {
    id: 6,
    name: 'Macy\'s',
    logo: 'https://logo.clearbit.com/macys.com',
    avgSavings: '$28'
  },
  {
    id: 7,
    name: 'eBay',
    logo: 'https://logo.clearbit.com/ebay.com',
    avgSavings: '$15'
  },
  {
    id: 8,
    name: 'Home Depot',
    logo: 'https://logo.clearbit.com/homedepot.com',
    avgSavings: '$32'
  }
];

// FAQ data
const faqs = [
  {
    id: 1,
    question: 'How does ShopSavr find coupons?',
    answer: 'Our AI-powered system scans millions of coupon codes across the web in real-time, testing and validating them to ensure you get working codes that provide the maximum savings.'
  },
  {
    id: 2,
    question: 'Is ShopSavr really free?',
    answer: 'Yes! Our basic plan is completely free forever. You can upgrade to Pro for advanced features like price tracking and mobile apps, but the core coupon-finding functionality is always free.'
  },
  {
    id: 3,
    question: 'Does ShopSavr slow down my browser?',
    answer: 'Not at all! ShopSavr is designed to be lightweight and efficient. It only activates when you\'re on a supported shopping site and runs in the background without affecting your browsing speed.'
  },
  {
    id: 4,
    question: 'How much money can I save?',
    answer: 'Our users save an average of $150 per year, with many power users saving over $500 annually. The amount depends on your shopping habits, but most users see savings on their very first purchase.'
  },
  {
    id: 5,
    question: 'Is my personal information safe?',
    answer: 'Absolutely. We use enterprise-grade encryption and never store your payment information. We\'re GDPR compliant and SOC 2 certified. Your privacy and security are our top priorities.'
  },
  {
    id: 6,
    question: 'Can I use ShopSavr on mobile?',
    answer: 'Yes! We have mobile apps for iOS and Android (Pro plan), and our browser extension works on mobile browsers. You can save money whether you\'re shopping on desktop or mobile.'
  }
];

// Security features data
const securityFeatures = [
  {
    id: 1,
    icon: 'fas fa-lock',
    title: 'End-to-End Encryption',
    description: 'All data is encrypted using industry-standard AES-256 encryption, ensuring your information stays private and secure.'
  },
  {
    id: 2,
    icon: 'fas fa-shield-alt',
    title: 'No Payment Data Storage',
    description: 'We never store your credit card information or payment details. ShopSavr only helps you find coupons, not process payments.'
  },
  {
    id: 3,
    icon: 'fas fa-user-secret',
    title: 'Anonymous Browsing',
    description: 'Your browsing habits and shopping data are kept completely anonymous. We don\'t track or sell your personal information.'
  },
  {
    id: 4,
    icon: 'fas fa-certificate',
    title: 'Certified Secure',
    description: 'SOC 2 Type II certified and GDPR compliant. Regular security audits ensure we meet the highest industry standards.'
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