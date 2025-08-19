const express = require('express');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection (optional - app works without it)
if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log('📦 Connected to MongoDB Atlas');
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
    console.log('🔄 Continuing without database connection...');
  });
} else {
  console.log('📦 MongoDB URI not provided - running without database');
}

// Middleware
app.set('trust proxy', 1); // Trust first proxy for rate limiting

// Production-ready CORS configuration
const allowedOrigins = process.env.NODE_ENV === 'production'
  ? [
      'https://tubenix.onrender.com',
      'https://tubenix.netlify.app',
      'https://main--tubenix.netlify.app',
      process.env.CORS_ORIGIN
    ].filter(Boolean)
  : [
      'http://localhost:3000',
      'http://localhost:4000',
      'http://localhost:5000',
      'http://localhost:48752',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:4000',
      'http://127.0.0.1:5000',
      'http://127.0.0.1:48752'
    ];

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Remove timeout restrictions for downloads as requested
app.use((req, res, next) => {
  // Remove timeout restrictions for download endpoints
  if (req.path.includes('/download/video') || req.path.includes('/download/extract-links')) {
    req.setTimeout(0); // No timeout
    res.setTimeout(0); // No timeout
  }
  next();
});

// Security middleware
if (process.env.HELMET_ENABLED === 'true') {
  const helmet = require('helmet');
  app.use(helmet());
}

// Rate limiting
const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Debug middleware to log all API requests
app.use('/api', (req, res, next) => {
  console.log(`🌐 API Request: ${req.method} ${req.path}`);
  next();
});

// API Routes
app.use('/api/download', require('./routes/download_new'));
app.use('/api/streaming', require('./routes/streaming'));
app.use('/api/instagram', require('./routes/instagram'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));

// General routes (with error handling)
try {
  app.use('/api', require('./routes/general'));
} catch (error) {
  console.error('❌ Failed to load general routes:', error.message);
}

// Serve static files from React app in production
if (process.env.NODE_ENV === 'production') {
  const buildPath = path.join(__dirname, '../client/build');

  // Check if build directory exists
  const fs = require('fs');
  if (fs.existsSync(buildPath)) {
    app.use(express.static(buildPath));

    // Handle React Router routes
    app.get('*', (req, res) => {
      // Don't serve index.html for API routes
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found' });
      }

      const indexPath = path.join(buildPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).json({ error: 'Client build not found - please run build process' });
      }
    });
  } else {
    console.log('⚠️ Client build directory not found. Serving API only.');
    app.get('/', (req, res) => {
      res.json({
        message: 'Tubenix API Server',
        status: 'running',
        note: 'Client build not available - API endpoints accessible at /api/*'
      });
    });
  }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    port: PORT,
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    timestamp: new Date().toISOString()
  });
});

// Global error handlers for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit the process, just log the error
});

process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  // Don't exit the process, just log the error
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('🔴 Express Error:', error);

  // Don't send response if headers already sent
  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes only
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Tubenix server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
});
