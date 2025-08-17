const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const cheerio = require('cheerio');
const InstagramExtractor = require('../services/InstagramExtractor');
const RealFileSizeCalculator = require('../services/RealFileSizeCalculator');
const YouTubeDownloader = require('../services/YouTubeDownloader');
const User = require('../models/User');

// Simple cache for metadata like 9xbuddy
const metadataCache = new Map();
const CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache

// Clean cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of metadataCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      metadataCache.delete(key);
    }
  }
}, 60000); // Clean every minute

// Helper function to get proper content type based on container format
function getContentType(container) {
  const contentTypes = {
    'mp4': 'video/mp4',
    'webm': 'video/webm',
    'mkv': 'video/x-matroska',
    'avi': 'video/x-msvideo',
    'mov': 'video/quicktime',
    'flv': 'video/x-flv',
    '3gp': 'video/3gpp',
    'm4a': 'audio/mp4',
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'flac': 'audio/flac',
    'ogg': 'audio/ogg'
  };

  return contentTypes[container?.toLowerCase()] || 'video/mp4';
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// Helper function to extract video ID from YouTube URL
function extractVideoId(url) {
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(regex);
  return match ? match[1] : 'unknown';
}

// Helper function to track downloads
async function trackDownload(downloadData) {
  try {
    console.log('📝 Tracking download:', downloadData.title);

    // Create a demo user or find existing one to track downloads
    // For demo purposes, we'll create/update a demo user
    let demoUser = await User.findOne({ email: 'demo@tubenix.com' });

    if (!demoUser) {
      console.log('📝 Creating demo user for tracking...');
      demoUser = new User({
        name: 'Demo User',
        email: 'demo@tubenix.com',
        password: 'demopassword123', // Will be hashed
        downloadHistory: []
      });
    }

    // Add to download history
    demoUser.addToHistory(downloadData);
    await demoUser.save();

    console.log('✅ Download tracked successfully');
  } catch (error) {
    console.error('❌ Failed to track download:', error.message);
    // Don't throw error to avoid interrupting download
  }
}

// Detect platform from URL
function detectPlatform(url) {
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('music.youtube.com')) return 'Youtube Music';
  if (url.includes('facebook.com') || url.includes('fb.watch')) return 'Facebook';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'Twitter';
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('vimeo.com')) return 'Vimeo';
  if (url.includes('dailymotion.com')) return 'Dailymotion';
  return 'Unknown';
}

// Extract video metadata
router.post('/metadata', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const platform = detectPlatform(url);

    // Check cache first
    const cacheKey = `${platform}_${url}`;
    const cached = metadataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('🚀 Returning cached metadata for:', url);
      return res.json(cached.data);
    }

    let metadata = {};

    if (platform === 'YouTube' || platform === 'Youtube Music') {
      try {
        console.log('🎬 Extracting YouTube metadata with enhanced downloader...');

        // Use the new YouTube downloader for metadata
        const extractionResult = await YouTubeDownloader.extractRealDownloadUrls(url);

        if (!extractionResult.success) {
          throw new Error(extractionResult.error);
        }

        const { formats, title, duration, thumbnail } = extractionResult;

        // Categorize formats
        const videoFormats = formats.filter(f => f.hasVideo && f.hasAudio);
        const audioFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
        const adaptiveFormats = formats.filter(f => f.hasVideo && !f.hasAudio);

        // Quality categories
        const uhd4kFormats = formats.filter(f => f.height >= 2160);
        const qhd2kFormats = formats.filter(f => f.height >= 1440 && f.height < 2160);
        const fhdFormats = formats.filter(f => f.height >= 1080 && f.height < 1440);
        const hdFormats = formats.filter(f => f.height >= 720 && f.height < 1080);

        metadata = {
          title: title,
          uploader: 'YouTube Creator',
          description: 'Video metadata extracted successfully',
          thumbnail: thumbnail,
          duration: duration,
          duration_formatted: formatDuration(duration),
          platform: platform,
          url: url,
          video_id: extractVideoId(url),

          // Format data
          allFormats: formats.map(f => ({
            id: `real_${f.itag}_${f.container}`,
            type: f.type,
            container: f.container,
            resolution: f.quality,
            width: f.width,
            height: f.height,
            bitrate: f.bitrate,
            quality_label: f.quality,
            approx_human_size: f.filesize ? formatFileSize(f.filesize) : 'Unknown',
            has_video: f.hasVideo,
            has_audio: f.hasAudio,
            notes: 'Real YouTube format'
          })),
          videoFormats: videoFormats,
          audioFormats: audioFormats,
          adaptiveFormats: adaptiveFormats,

          // Quality categories
          uhd4kFormats: uhd4kFormats,
          qhd2kFormats: qhd2kFormats,
          fhdFormats: fhdFormats,
          hdFormats: hdFormats,

          quality_summary: {
            max_video_resolution: Math.max(...formats.map(f => f.height || 0)),
            max_audio_bitrate: Math.max(...audioFormats.map(f => f.bitrate || 0)),
            total_formats: formats.length,
            has_4k: uhd4kFormats.length > 0,
            has_2k: qhd2kFormats.length > 0,
            has_fhd: fhdFormats.length > 0,
            has_hd: hdFormats.length > 0,
            extraction_method: 'enhanced_real_data'
          }
        };

        console.log(`✅ Real YouTube metadata extracted: ${formats.length} formats`);

      } catch (error) {
        console.error('❌ YouTube metadata extraction failed:', error.message);

        // Fallback to basic metadata
        metadata = {
          title: 'YouTube Video',
          uploader: 'Unknown',
          description: 'Video available for download',
          thumbnail: `https://img.youtube.com/vi/${extractVideoId(url)}/maxresdefault.jpg`,
          platform: platform,
          url: url,
          video_id: extractVideoId(url),
          videoFormats: [
            { quality_label: '1080p', container: 'mp4', available: true },
            { quality_label: '720p', container: 'mp4', available: true },
            { quality_label: '480p', container: 'mp4', available: true },
            { quality_label: '360p', container: 'mp4', available: true }
          ],
          audioFormats: [
            { quality_label: 'Audio 128kbps', container: 'm4a', available: true }
          ],
          note: 'Extraction failed - using fallback data'
        };
      }
    } else if (platform === 'Instagram') {
      try {
        if (!InstagramExtractor.isValidInstagramUrl(url)) {
          throw new Error('Invalid Instagram URL');
        }

        const instagramData = await InstagramExtractor.extractMedia(url);

        if (instagramData && instagramData.mediaItems && instagramData.mediaItems.length > 0) {
          metadata = {
            title: instagramData.title || 'Instagram Media',
            uploader: instagramData.username || 'Unknown',
            description: instagramData.description || '',
            thumbnail: instagramData.mediaItems[0]?.thumbnail || '',
            platform: platform,
            url: url,
            videoFormats: instagramData.mediaItems.filter(item => item.type === 'video').map(item => ({
              quality_label: `${item.height}p`,
              container: 'mp4',
              width: item.width,
              height: item.height,
              available: true
            })),
            imageFormats: instagramData.mediaItems.filter(item => item.type === 'image').map(item => ({
              quality_label: `${item.width}x${item.height}`,
              container: 'jpg',
              width: item.width,
              height: item.height,
              available: true
            }))
          };
        } else {
          metadata = {
            title: 'Instagram Content',
            platform: platform,
            url: url,
            error: 'Content could not be extracted',
            note: 'This content may be private or expired'
          };
        }
      } catch (error) {
        console.error('Instagram metadata error:', error);
        metadata = {
          title: 'Instagram Content',
          platform: platform,
          url: url,
          error: error.message
        };
      }
    } else {
      metadata = {
        title: 'Media Content',
        platform: platform,
        url: url,
        error: `Platform ${platform} is not supported`,
        supportedPlatforms: ['YouTube', 'Instagram']
      };
    }

    // Cache the result
    metadataCache.set(cacheKey, { data: metadata, timestamp: Date.now() });

    res.json(metadata);
  } catch (error) {
    console.error('Metadata extraction error:', error);
    res.status(500).json({ error: error.message || 'Failed to extract metadata' });
  }
});

// Helper function to format duration
function formatDuration(seconds) {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Download video (enhanced with new YouTube downloader)
router.post('/video', async (req, res) => {
  try {
    const { url, format = 'mp4', quality = 'best' } = req.body;

    console.log('Download request received:', { url, format, quality });

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const platform = detectPlatform(url);
    
    if (platform === 'YouTube' || platform === 'Youtube Music') {
      try {
        console.log('🎬 Using enhanced YouTube downloader...');
        
        // Use the new YouTube downloader that bypasses rate limits
        const downloadResult = await YouTubeDownloader.getDownloadUrl(url, quality);
        
        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Failed to get download URL');
        }

        const { downloadUrl, format: selectedFormat, title, filesize } = downloadResult;
        
        console.log(`✅ Got real download URL for: ${title}`);
        console.log(`📊 Format: ${selectedFormat.quality} (${selectedFormat.container})`);

        // Prepare filename and content type
        const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50).trim();
        const extension = selectedFormat.container;
        const filename = `${safeTitle}_${selectedFormat.quality}.${extension}`;
        
        const contentType = getContentType(extension);

        // Track download in database (async, don't wait)
        trackDownload({
          url: url,
          title: title,
          platform: platform,
          format: extension,
          quality: selectedFormat.quality,
          fileSize: filesize ? formatFileSize(filesize) : 'Unknown'
        }).catch(err => console.log('📝 Download tracking failed:', err.message));

        // Stream the download using the new downloader
        await YouTubeDownloader.streamDownload(downloadUrl, res, filename, contentType);

      } catch (error) {
        console.error('❌ Enhanced YouTube download failed:', error.message);
        
        // Provide helpful error response
        return res.status(503).json({
          error: 'YouTube download temporarily unavailable',
          details: error.message,
          suggestion: 'YouTube has updated their protection. Please try again in a few minutes or try a different quality.',
          fallbackAction: 'extract_links',
          note: 'Use Extract Links feature as an alternative.'
        });
      }
    } else if (platform === 'Instagram') {
      try {
        if (!InstagramExtractor.isValidInstagramUrl(url)) {
          throw new Error('Invalid Instagram URL');
        }

        const instagramData = await InstagramExtractor.extractMedia(url);

        // Check if extraction was successful
        if (!instagramData || !instagramData.mediaItems || instagramData.mediaItems.length === 0) {
          return res.status(404).json({
            success: false,
            error: 'Instagram media could not be extracted',
            message: url.includes('/stories/') ? 'Story may have expired (24h limit)' : 'Content may be private or unavailable'
          });
        }

        // For Instagram, we provide direct download links
        const mediaItem = instagramData.mediaItems.find(item => {
          if (format === 'mp4' && item.type === 'video') return true;
          if (format === 'jpg' && item.type === 'image') return true;
          return false;
        }) || instagramData.mediaItems[0];

        if (!mediaItem) {
          return res.status(404).json({
            error: `No ${format} content found in this Instagram post`,
            availableTypes: instagramData.mediaItems.map(item => item.type)
          });
        }

        // Set headers for download
        const filename = mediaItem.filename || `instagram_${Date.now()}.${format}`;
        res.setHeader('Content-Type', mediaItem.type === 'video' ? 'video/mp4' : 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Stream the Instagram content
        const response = await axios({
          method: 'GET',
          url: mediaItem.url,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        response.data.pipe(res);

        response.data.on('end', () => {
          console.log(`✅ Instagram download completed: ${filename}`);
          
          // Track download
          trackDownload({
            url: url,
            title: instagramData.title || 'Instagram Media',
            platform: platform,
            format: format,
            quality: `${mediaItem.width}x${mediaItem.height}`,
            fileSize: 'Unknown'
          }).catch(err => console.log('📝 Download tracking failed:', err.message));
        });

        response.data.on('error', (error) => {
          console.error(`❌ Instagram stream error: ${error.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Instagram download stream failed' });
          }
        });

      } catch (error) {
        console.error('Instagram download error:', error);
        res.status(500).json({
          error: `Failed to download Instagram media: ${error.message}`,
          suggestion: 'This content may be private or require login.'
        });
      }
    } else {
      // For other platforms, provide a not supported response
      return res.status(400).json({
        error: `Platform ${platform} is not supported for direct downloads`,
        supportedPlatforms: ['YouTube', 'Instagram'],
        suggestion: 'Please use a supported platform URL.'
      });
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ 
      error: error.message || 'Download failed',
      suggestion: 'Please check the URL and try again.'
    });
  }
});

module.exports = router;
