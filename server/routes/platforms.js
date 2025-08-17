const express = require('express');
const router = express.Router();

// Get all supported platforms
router.get('/', (req, res) => {
  const platforms = [
    {
      name: 'YouTube',
      domain: 'youtube.com',
      icon: '🎥',
      supported: true,
      formats: ['MP4', 'WEBM', 'MP3']
    },
    {
      name: 'Facebook',
      domain: 'facebook.com',
      icon: '📘',
      supported: true,
      formats: ['MP4', 'MP3']
    },
    {
      name: 'Instagram',
      domain: 'instagram.com',
      icon: '📷',
      supported: true,
      formats: ['MP4', 'MP3', 'JPG'],
      types: ['posts', 'stories', 'reels', 'igtv']
    },
    {
      name: 'Twitter/X',
      domain: 'twitter.com',
      icon: '🐦',
      supported: true,
      formats: ['MP4', 'MP3']
    },
    {
      name: 'TikTok',
      domain: 'tiktok.com',
      icon: '🎵',
      supported: true,
      formats: ['MP4', 'MP3']
    },
    {
      name: 'Vimeo',
      domain: 'vimeo.com',
      icon: '🎬',
      supported: true,
      formats: ['MP4', 'MP3']
    },
    {
      name: 'Dailymotion',
      domain: 'dailymotion.com',
      icon: '📺',
      supported: true,
      formats: ['MP4', 'MP3']
    }
  ];
  
  res.json(platforms);
});

module.exports = router;
