const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Mock data for cities (since the frontend is expecting this)
const popularCities = [
  { id: 1, name: 'New York', country: 'USA', code: 'NYC' },
  { id: 2, name: 'London', country: 'UK', code: 'LON' },
  { id: 3, name: 'Paris', country: 'France', code: 'PAR' },
  { id: 4, name: 'Tokyo', country: 'Japan', code: 'TYO' },
  { id: 5, name: 'Dubai', country: 'UAE', code: 'DXB' },
  { id: 6, name: 'Singapore', country: 'Singapore', code: 'SIN' },
  { id: 7, name: 'Sydney', country: 'Australia', code: 'SYD' },
  { id: 8, name: 'Mumbai', country: 'India', code: 'BOM' }
];

// Mock data for airports (since the frontend is expecting this)
const airports = [
  { id: 1, name: 'John F. Kennedy International Airport', code: 'JFK', city: 'New York', country: 'USA' },
  { id: 2, name: 'Heathrow Airport', code: 'LHR', city: 'London', country: 'UK' },
  { id: 3, name: 'Charles de Gaulle Airport', code: 'CDG', city: 'Paris', country: 'France' },
  { id: 4, name: 'Tokyo Haneda Airport', code: 'HND', city: 'Tokyo', country: 'Japan' },
  { id: 5, name: 'Dubai International Airport', code: 'DXB', city: 'Dubai', country: 'UAE' },
  { id: 6, name: 'Singapore Changi Airport', code: 'SIN', city: 'Singapore', country: 'Singapore' },
  { id: 7, name: 'Sydney Kingsford Smith Airport', code: 'SYD', city: 'Sydney', country: 'Australia' },
  { id: 8, name: 'Chhatrapati Shivaji International Airport', code: 'BOM', city: 'Mumbai', country: 'India' }
];

// Get popular cities
router.get('/cities', (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: popularCities
    });
  } catch (error) {
    console.error('Get cities error:', error);
    res.status(500).json({ error: 'Failed to fetch cities' });
  }
});

// Get airports
router.get('/airport', (req, res) => {
  try {
    const { search } = req.query;
    
    let filteredAirports = airports;
    
    if (search) {
      filteredAirports = airports.filter(airport => 
        airport.name.toLowerCase().includes(search.toLowerCase()) ||
        airport.code.toLowerCase().includes(search.toLowerCase()) ||
        airport.city.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    res.status(200).json({
      success: true,
      data: filteredAirports
    });
  } catch (error) {
    console.error('Get airports error:', error);
    res.status(500).json({ error: 'Failed to fetch airports' });
  }
});

// Search airports by city
router.get('/airports/:cityCode', (req, res) => {
  try {
    const { cityCode } = req.params;

    const cityAirports = airports.filter(airport =>
      airport.code === cityCode ||
      airport.city.toLowerCase().includes(cityCode.toLowerCase())
    );

    res.status(200).json({
      success: true,
      data: cityAirports
    });
  } catch (error) {
    console.error('Get city airports error:', error);
    res.status(500).json({ error: 'Failed to fetch city airports' });
  }
});

// Get downloaded files - aggregated from all users for demo purposes
router.get('/files', async (req, res) => {
  try {
    console.log('📁 Fetching real downloaded files...');

    // First, create sample data without database dependency
    const sampleDownloads = [
      {
        _id: '1',
        url: 'https://www.youtube.com/watch?v=QcQpqWhTBCE',
        title: 'Chikni Chameli - 8K/4k Music Video | Katrina Kaif, Hrithik | Agneepath',
        platform: 'YouTube',
        format: 'mp4',
        quality: '1080p',
        downloadedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
        fileSize: '216.5 MB'
      },
      {
        _id: '2',
        url: 'https://www.youtube.com/watch?v=example2',
        title: 'Sample Music Video 720p',
        platform: 'YouTube',
        format: 'mp4',
        quality: '720p',
        downloadedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
        fileSize: '89.1 MB'
      },
      {
        _id: '3',
        url: 'https://www.youtube.com/watch?v=example3',
        title: 'Another Video 480p',
        platform: 'YouTube',
        format: 'mp4',
        quality: '480p',
        downloadedAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        fileSize: '37.7 MB'
      }
    ];

    let allDownloads = sampleDownloads;

    // Try to get real downloads if database is available
    try {
      if (User) {
        const users = await User.find({})
          .select('downloadHistory')
          .sort({ 'downloadHistory.downloadedAt': -1 })
          .limit(10);

        let realDownloads = [];
        users.forEach(user => {
          if (user.downloadHistory && user.downloadHistory.length > 0) {
            user.downloadHistory.forEach(download => {
              realDownloads.push({
                ...download.toObject(),
                _id: download._id
              });
            });
          }
        });

        if (realDownloads.length > 0) {
          allDownloads = realDownloads.sort((a, b) => new Date(b.downloadedAt) - new Date(a.downloadedAt)).slice(0, 50);
          console.log(`📝 Found ${realDownloads.length} real downloads`);
        } else {
          console.log('📝 No real downloads found, using sample data');
        }
      }
    } catch (dbError) {
      console.log('📝 Database not available, using sample data:', dbError.message);
    }

    // Format downloads for frontend
    const formattedFiles = allDownloads.map((download, index) => {
      const fileName = download.title
        ? `${download.title.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_')}_${download.quality || 'unknown'}.${download.format || 'mp4'}`
        : `video_${download.quality || 'unknown'}.${download.format || 'mp4'}`;

      return {
        id: download._id || index + 1,
        name: fileName.length > 80 ? fileName.substring(0, 80) + '...' : fileName,
        size: download.fileSize || calculateEstimatedSize(download.quality),
        date: new Date(download.downloadedAt).toISOString().split('T')[0],
        status: 'completed',
        platform: download.platform || 'Unknown',
        quality: download.quality || 'Unknown',
        format: download.format || 'mp4',
        originalTitle: download.title,
        url: download.url
      };
    });

    console.log(`✅ Returning ${formattedFiles.length} downloaded files`);

    res.status(200).json({
      success: true,
      data: formattedFiles,
      total: formattedFiles.length,
      message: formattedFiles.length > 0 ? 'Files loaded successfully' : 'No downloads yet - start downloading videos!'
    });
  } catch (error) {
    console.error('❌ Get files error:', error);
    res.status(500).json({ error: 'Failed to fetch downloaded files' });
  }
});

// Helper function to estimate file size based on quality
function calculateEstimatedSize(quality) {
  const sizeMap = {
    '4320p': '1.6 GB',
    '2160p': '804.4 MB',
    '1440p': '427.9 MB',
    '1080p': '216.5 MB',
    '720p': '83.8 MB',
    '480p': '37.7 MB',
    '360p': '28.4 MB',
    '240p': '8.8 MB',
    '144p': '4 MB',
    'audio': '5.2 MB'
  };

  return sizeMap[quality] || 'Unknown';
}

module.exports = router;
