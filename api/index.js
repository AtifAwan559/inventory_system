const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const connectDB = require('../backend/dbconfig');

// Load local backend .env if present (fallback for local testing)
dotenv.config({ path: './backend/.env' });
dotenv.config();

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Connect to DB with proper error handling
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Database connection error in API handler:', err.message);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to database',
      error: err.message,
    });
  }
});

// Normalize routes for Vercel rewrite compatibility
const userRoutes = require('../backend/routes/userRoutes');
const productRoutes = require('../backend/routes/productRoutes');

// Mount under both /api/v1 and /v1 so rewrites work seamlessly
app.use('/api/v1', userRoutes);
app.use('/v1', userRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/v1/products', productRoutes);

// Health check
app.get(['/health', '/api/health', '/api/v1/health'], (req, res) => {
  res.json({
    success: true,
    message: 'Cosmetics Inventory API is healthy 🚀',
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err.stack || err.message);

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: messages,
    });
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `Duplicate value for ${field}. Please use a unique ${field}.`,
    });
  }

  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format: ${err.value}`,
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token expired',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

module.exports = app;