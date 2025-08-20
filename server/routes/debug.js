const express = require('express');
const router = express.Router();

// Debug endpoint to check production environment
router.get('/environment', (req, res) => {
  try {
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      port: process.env.PORT,
      ytdlNoUpdate: process.env.YTDL_NO_UPDATE,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      origin: req.headers.origin,
      referer: req.headers.referer,
      cors: {
        allowedOrigins: process.env.NODE_ENV === 'production'
          ? [
              'https://tubenix.onrender.com',
              'https://tubenix.netlify.app',
              'https://main--tubenix.netlify.app',
              process.env.CORS_ORIGIN
            ].filter(Boolean)
          : ['http://localhost:3000', 'http://localhost:4000', 'http://localhost:5000']
      },
      headers: req.headers
    };

    console.log('🔍 Environment debug request:', envInfo);
    
    res.json({
      success: true,
      environment: envInfo,
      message: 'Environment debug info'
    });
  } catch (error) {
    console.error('❌ Environment debug error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Simple test endpoint to verify API connectivity
router.get('/ping', (req, res) => {
  res.json({
    success: true,
    message: 'Production API is working',
    timestamp: new Date().toISOString(),
    origin: req.headers.origin
  });
});

// Test YouTube API connectivity
router.post('/test-youtube', async (req, res) => {
  try {
    const { url } = req.body;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL is required'
      });
    }

    console.log('🧪 Testing YouTube URL:', url);
    
    // Basic URL validation
    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    
    res.json({
      success: true,
      isYouTube,
      url,
      message: 'URL validation test complete',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ YouTube test error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
