const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Middleware to protect routes
const protect = async (req, res, next) => {
  try {
    const token = req.cookies.token || req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Not authorized to access this route' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(404).json({ error: 'User not found' });
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Not authorized to access this route' });
  }
};

// Get user download history
router.get('/history', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const user = await User.findById(req.user._id);

    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    const history = user.downloadHistory.slice(startIndex, endIndex);

    res.status(200).json({
      success: true,
      data: history,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(user.downloadHistory.length / limit),
        hasNext: endIndex < user.downloadHistory.length,
        hasPrev: startIndex > 0
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user favorites
router.get('/favorites', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.status(200).json({
      success: true,
      data: user.favorites
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add to favorites
router.post('/favorites', protect, async (req, res) => {
  try {
    const { url, title, platform, thumbnail } = req.body;
    const user = await User.findById(req.user._id);

    user.addToFavorites({ url, title, platform, thumbnail });
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Added to favorites',
      data: user.favorites
    });
  } catch (error) {
    console.error('Add to favorites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Remove from favorites
router.delete('/favorites/:index', protect, async (req, res) => {
  try {
    const { index } = req.params;
    const user = await User.findById(req.user._id);

    if (index >= 0 && index < user.favorites.length) {
      user.favorites.splice(index, 1);
      await user.save();
    }

    res.status(200).json({
      success: true,
      message: 'Removed from favorites',
      data: user.favorites
    });
  } catch (error) {
    console.error('Remove from favorites error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        subscription: user.subscription
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get download statistics
router.get('/stats', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Reset daily downloads if needed
    user.resetDailyDownloads();

    const stats = {
      totalDownloads: user.downloadHistory.length,
      dailyDownloads: user.dailyDownloads,
      favorites: user.favorites.length,
      subscription: user.subscription,
      canDownload: user.canDownload(),
      downloadLimit: user.subscription === 'premium' ? 'Unlimited' : '10 per day'
    };

    // Platform breakdown
    const platformStats = {};
    user.downloadHistory.forEach(download => {
      platformStats[download.platform] = (platformStats[download.platform] || 0) + 1;
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentDownloads = user.downloadHistory.filter(
      download => new Date(download.downloadedAt) > sevenDaysAgo
    ).length;

    res.status(200).json({
      success: true,
      data: {
        ...stats,
        platformBreakdown: platformStats,
        recentActivity: recentDownloads
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
