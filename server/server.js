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

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4000',
    'http://localhost:5000',
    'http://localhost:48752', // Additional dev environment port
    process.env.CORS_ORIGIN,
    // Development environment variations
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4000',
    'http://127.0.0.1:5000',
    'http://127.0.0.1:48752'
  ].filter(Boolean),
  credentials: true
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
app.use('/api/download', require('./routes/download'));
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
  app.use(express.static(path.join(__dirname, '../client/build')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
  });
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Tubenix server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV}`);
  console.log(`🌐 CORS Origin: ${process.env.CORS_ORIGIN}`);
});
