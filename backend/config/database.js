const mongoose = require('mongoose');
const Logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shopsavr';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferMaxEntries: 0, // Disable mongoose buffering
      bufferCommands: false, // Disable mongoose buffering
    };

    const conn = await mongoose.connect(mongoURI, options);

    Logger.info(`MongoDB Connected: ${conn.connection.host}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      Logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      Logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      Logger.info('MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        Logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        Logger.error('Error during MongoDB shutdown:', error);
        process.exit(1);
      }
    });

    return conn;
  } catch (error) {
    Logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };