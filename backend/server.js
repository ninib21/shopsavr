const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { generalLimiter } = require('./middleware/rateLimiting');
const { sessionMiddleware } = require('./middleware/session');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// Session middleware
app.use(sessionMiddleware);

// Rate limiting
app.use('/api/', generalLimiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsavr', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Redis connection
const { connectRedis, getRedisClient } = require('./config/redis');

// Connect to Redis only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  connectRedis().catch(err => {
    console.error('Redis connection failed:', err);
    // Continue without Redis in development if connection fails
  });
}

// Health check endpoint
app.get('/health', (req, res) => {
  let redisStatus = 'not configured';
  try {
    if (process.env.NODE_ENV !== 'test') {
      const redisClient = getRedisClient();
      redisStatus = redisClient.isReady ? 'connected' : 'disconnected';
    }
  } catch (error) {
    redisStatus = 'disconnected';
  }

  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    redis: redisStatus
  });
});

// Import routes
const authRoutes = require('./routes/auth');
const couponRoutes = require('./routes/coupons');
const savingsRoutes = require('./routes/savings');
const wishlistRoutes = require('./routes/wishlist');
const priceTrackingRoutes = require('./routes/priceTracking');
const productRoutes = require('./routes/products');
const subscriptionRoutes = require('./routes/subscription');
const referralRoutes = require('./routes/referral');

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/savings', savingsRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/price-tracking', priceTrackingRoutes);
app.use('/api/products', productRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/referral', referralRoutes);

// Default API route
app.use('/api', (req, res) => {
  res.json({ message: 'ShopSavr API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Something went wrong!',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found'
    }
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  
  if (process.env.NODE_ENV !== 'test') {
    try {
      const redisClient = getRedisClient();
      await redisClient.quit();
    } catch (error) {
      console.log('Redis client not available for shutdown');
    }
  }
  
  process.exit(0);
});

// Start price tracking service in production
if (process.env.NODE_ENV === 'production') {
  const PriceTrackingService = require('./services/priceTrackingService');
  PriceTrackingService.start();
}

app.listen(PORT, () => {
  console.log(`ShopSavr API server running on port ${PORT}`);
});

module.exports = app;