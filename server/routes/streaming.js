const express = require('express');
const router = express.Router();
const streamingDownloader = require('../services/streamingDownloader');
const ytdl = require('@distube/ytdl-core');

// Real-time streaming download endpoint
router.get('/download', async (req, res) => {
  try {
    const { url, quality = 'highest', format = 'video' } = req.query;

    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Validate YouTube URL
    try {
      if (!ytdl.validateURL(url)) {
        return res.status(400).json({ error: 'Invalid YouTube URL' });
      }
    } catch (validateError) {
      console.error('URL validation error:', validateError);
      return res.status(400).json({ error: 'Invalid or malformed URL' });
    }

    console.log(`Streaming download request: ${url}, quality: ${quality}, format: ${format}`);

    // Start streaming download
    await streamingDownloader.downloadStream(url, quality, res, null, format);

  } catch (error) {
    console.error('Streaming download error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get available formats for a video
router.get('/formats', async (req, res) => {
  try {
    const { url } = req.query;

    console.log('🔍 Formats request received for URL:', url);

    if (!url) {
      console.error('❌ No URL provided in request');
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    // Decode URL if it's encoded
    let decodedUrl;
    try {
      decodedUrl = decodeURIComponent(url);
      console.log('🔗 Decoded URL:', decodedUrl);
    } catch (decodeError) {
      console.error('❌ URL decode error:', decodeError);
      decodedUrl = url; // Use original if decode fails
    }

    // Enhanced URL validation
    try {
      if (!ytdl.validateURL(decodedUrl)) {
        console.error('❌ YouTube URL validation failed for:', decodedUrl);

        // Detect the actual platform for better error messaging
        const platform = decodedUrl.includes('instagram.com') ? 'Instagram' :
                        decodedUrl.includes('facebook.com') ? 'Facebook' :
                        decodedUrl.includes('tiktok.com') ? 'TikTok' :
                        decodedUrl.includes('twitter.com') ? 'Twitter' :
                        decodedUrl.includes('vimeo.com') ? 'Vimeo' : 'Unknown platform';

        return res.status(400).json({
          error: `Real-time streaming is only available for YouTube videos. Detected: ${platform}`,
          platform: platform,
          suggestion: `For ${platform} content, please use the main download options.`
        });
      }
      console.log('✅ YouTube URL validation passed');
    } catch (validateError) {
      console.error('❌ URL validation error:', validateError.message);
      return res.status(400).json({ error: 'Invalid or malformed URL: ' + validateError.message });
    }

    console.log('🚀 Attempting to get formats...');
    const { info, progressive, adaptive } = await streamingDownloader.getBestFormats(decodedUrl);
    
    // Process all available formats
    const availableFormats = [];

    // Get video and audio formats
    const videoFormats = info.formats.filter(f => f.hasVideo && !f.hasAudio);
    const audioFormats = info.formats.filter(f => f.hasAudio && !f.hasVideo);
    const progressiveFormats = info.formats.filter(f => f.hasVideo && f.hasAudio);

    // Helper function to get quality category
    const getQualityCategory = (height) => {
      if (height >= 7680) return '8K UHD'; // True 8K resolution
      if (height >= 4320) return '8K'; // 4320p often called 8K
      if (height >= 2160) return '4K';
      if (height >= 1440) return '2K';
      if (height >= 1080) return 'FHD';
      if (height >= 720) return 'HD';
      return 'SD';
    };

    // Get best audio for reference
    const bestAudio = audioFormats.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0))[0];

    // Create comprehensive quality list with 8K support
    const standardQualities = [144, 240, 360, 480, 720, 1080, 1440, 2160, 4320, 7680]; // Added 8K (7680p) support

    standardQualities.forEach(height => {
      // Find progressive format for this quality
      const progressive = progressiveFormats.find(f => f.height === height);
      if (progressive) {
        availableFormats.push({
          type: 'progressive',
          quality: progressive.qualityLabel || `${height}p`,
          height: height,
          fps: progressive.fps,
          filesize: progressive.contentLength,
          codec: progressive.videoCodec,
          container: progressive.container,
          category: getQualityCategory(height),
          note: '⚡ Instant Download (Complete file)',
          instantDownload: true
        });
      }

      // Find adaptive video format for this quality
      const adaptiveVideo = videoFormats.find(f => f.height === height);
      if (adaptiveVideo && bestAudio) {
        availableFormats.push({
          type: 'adaptive',
          quality: adaptiveVideo.qualityLabel || `${height}p`,
          height: height,
          fps: adaptiveVideo.fps,
          filesize: (adaptiveVideo.contentLength || 0) + (bestAudio.contentLength || 0),
          codec: adaptiveVideo.videoCodec,
          container: 'mp4',
          category: getQualityCategory(height),
          note: 'Merged (Video + Audio)',
          instantDownload: false
        });
      }
    });

    // Add audio-only formats
    const uniqueAudioFormats = [];
    const seenBitrates = new Set();

    audioFormats.forEach(audio => {
      const bitrate = audio.audioBitrate || 128;
      if (!seenBitrates.has(bitrate)) {
        seenBitrates.add(bitrate);
        uniqueAudioFormats.push({
          type: 'audio',
          quality: `${bitrate}kbps`,
          height: 0,
          fps: null,
          filesize: audio.contentLength,
          codec: audio.audioCodec,
          container: audio.container,
          category: 'Audio',
          note: '🎵 Audio Only',
          instantDownload: true,
          isAudio: true
        });
      }
    });

    // Sort video formats by quality (highest first), then add audio formats
    const videoFormatsOnly = availableFormats.filter(f => !f.isAudio);
    videoFormatsOnly.sort((a, b) => (b.height || 0) - (a.height || 0));

    // Sort audio formats by bitrate (highest first)
    uniqueAudioFormats.sort((a, b) => {
      const aBitrate = parseInt(a.quality.replace('kbps', '')) || 0;
      const bBitrate = parseInt(b.quality.replace('kbps', '')) || 0;
      return bBitrate - aBitrate;
    });

    // Combine video and audio formats
    const allFormats = [...videoFormatsOnly, ...uniqueAudioFormats];

    res.json({
      title: info.videoDetails.title,
      duration: info.videoDetails.lengthSeconds,
      thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
      uploader: info.videoDetails.author.name,
      formats: allFormats,
      stats: {
        totalFormats: allFormats.length,
        videoFormats: videoFormatsOnly.length,
        audioFormats: uniqueAudioFormats.length,
        instantDownloads: allFormats.filter(f => f.instantDownload).length
      },
      recommended: {
        progressive: progressive ? {
          quality: progressive.qualityLabel,
          height: progressive.height,
          note: 'Best progressive format'
        } : null,
        adaptive: adaptive.video && adaptive.audio ? {
          quality: adaptive.video.qualityLabel,
          height: adaptive.video.height,
          note: 'Highest quality with real-time merging'
        } : null
      }
    });

  } catch (error) {
    console.error('❌ Format extraction error:', error.message);
    console.error('Error stack:', error.stack);

    // Don't send response if headers already sent
    if (!res.headersSent) {
      // Provide more specific error messages for different types of failures
      let errorMessage = error.message;
      let statusCode = 500;

      if (error.message.includes('parsing watch.html') || error.message.includes('YouTube made a change')) {
        errorMessage = 'YouTube temporarily changed their system. Please try again in a few moments.';
        statusCode = 503; // Service Temporarily Unavailable

        console.log('🔄 YouTube parsing error detected - client should retry');

      } else if (error.message.includes('Video unavailable')) {
        errorMessage = 'This video is not available or has been removed';
        statusCode = 404;
      } else if (error.message.includes('private')) {
        errorMessage = 'This video is private and cannot be accessed';
        statusCode = 403;
      } else if (error.message.includes('age')) {
        errorMessage = 'This video is age-restricted and cannot be processed';
        statusCode = 403;
      } else if (error.message.includes('Invalid YouTube URL')) {
        errorMessage = 'Please provide a valid YouTube URL';
        statusCode = 400;
      } else if (error.message.includes('ECONNREFUSED') || error.message.includes('ENOTFOUND')) {
        errorMessage = 'Network connection error. Please check your internet and try again.';
        statusCode = 502; // Bad Gateway
      } else if (error.message.includes('too many requests') || error.message.includes('rate limit')) {
        errorMessage = 'Too many requests to YouTube. Please wait a moment and try again.';
        statusCode = 429; // Too Many Requests
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Request timeout. Please try again.';
        statusCode = 408; // Request Timeout
      }

      console.log(`📤 Sending error response: ${statusCode} - ${errorMessage}`);

      res.status(statusCode).json({
        error: errorMessage,
        url: decodedUrl,
        retryable: statusCode === 503 || statusCode === 502 || statusCode === 408 || statusCode === 429,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }
});

// Download progress tracking endpoint (for WebSocket alternative)
router.get('/progress/:downloadId', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  const downloadId = req.params.downloadId;
  
  // This would connect to a progress tracking system
  // For now, send mock progress updates
  let progress = 0;
  const interval = setInterval(() => {
    progress += 10;
    res.write(`data: {"progress": ${progress}, "downloadId": "${downloadId}"}\n\n`);
    
    if (progress >= 100) {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => {
    clearInterval(interval);
  });
});

// Batch download endpoint
router.post('/batch', async (req, res) => {
  try {
    const { urls, quality = 'highest' } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'URLs array is required' });
    }

    if (urls.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 URLs allowed per batch' });
    }

    // Validate all URLs first
    const invalidUrls = urls.filter(url => !ytdl.validateURL(url));
    if (invalidUrls.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid YouTube URLs', 
        invalidUrls 
      });
    }

    // Start batch processing
    const results = [];
    for (const url of urls) {
      try {
        const { info } = await streamingDownloader.getBestFormats(url);
        results.push({
          url,
          title: info.videoDetails.title,
          status: 'ready',
          downloadUrl: `/api/streaming/download?url=${encodeURIComponent(url)}&quality=${quality}`
        });
      } catch (error) {
        results.push({
          url,
          status: 'error',
          error: error.message
        });
      }
    }

    res.json({
      batchId: Date.now().toString(),
      total: urls.length,
      ready: results.filter(r => r.status === 'ready').length,
      results
    });

  } catch (error) {
    console.error('Batch download error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
