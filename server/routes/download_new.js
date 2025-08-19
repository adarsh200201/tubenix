const express = require('express');
const router = express.Router();
const ytdl = require('@distube/ytdl-core');
const axios = require('axios');
const cheerio = require('cheerio');
const InstagramExtractor = require('../services/InstagramExtractor');
const RealFileSizeCalculator = require('../services/RealFileSizeCalculator');
const YouTubeDownloader = require('../services/YouTubeDownloader');
const StreamMuxer = require('../services/StreamMuxer');
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
}, 5 * 60 * 1000); // Clean every 5 minutes

// Supported platforms
const SUPPORTED_PLATFORMS = {
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'music.youtube.com': 'Youtube Music',
  'instagram.com': 'Instagram',
  'www.instagram.com': 'Instagram'
};

// Download tracking array for statistics
const downloadHistory = [];

function detectPlatform(url) {
  try {
    const domain = new URL(url).hostname.toLowerCase();
    const baseDomain = domain.replace(/^(www\.|m\.|mobile\.)/, '');
    return SUPPORTED_PLATFORMS[baseDomain] || 'Unknown';
  } catch (error) {
    return 'Unknown';
  }
}

function formatFileSize(bytes) {
  if (!bytes) return 'Unknown';
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getContentType(extension) {
  const contentTypes = {
    mp4: 'video/mp4',
    mp3: 'audio/mpeg',
    webm: 'video/webm',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png'
  };
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}

const activeDownloads = new Map(); // Store active download status

// Track downloads for analytics
function trackDownload(downloadInfo) {
  return new Promise((resolve, reject) => {
    try {
      const timestamp = new Date().toISOString();
      const downloadRecord = {
        ...downloadInfo,
        timestamp: timestamp,
        id: `dl_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      };

      downloadHistory.push(downloadRecord);

      // Keep only last 1000 downloads
      if (downloadHistory.length > 1000) {
        downloadHistory.shift();
      }

      console.log(`📊 Download tracked: ${downloadInfo.title} (${downloadInfo.quality})`);
      resolve(downloadRecord);
    } catch (error) {
      console.error('❌ Track download error:', error.message);
      reject(error);
    }
  });
}

// Download status endpoint for real-time tracking
router.post('/status', async (req, res) => {
  try {
    const { downloadId, url, format, quality } = req.body;

    // Check if download is in progress
    if (activeDownloads.has(downloadId)) {
      const downloadInfo = activeDownloads.get(downloadId);
      return res.json(downloadInfo);
    }

    // If not found in active downloads, check if it was recently completed
    const recentDownload = downloadHistory.find(d =>
      d.url === url && d.format === format && d.quality === quality &&
      Date.now() - new Date(d.timestamp).getTime() < 300000 // 5 minutes
    );

    if (recentDownload) {
      return res.json({
        progress: 100,
        status: 'completed',
        speed: '0 KB/s',
        eta: 'Complete',
        fileSize: recentDownload.fileSize || 'Download ready',
        audioCodec: 'AAC',
        isMuxed: recentDownload.isMuxed || false,
        videoQuality: recentDownload.videoQuality || null,
        audioQuality: recentDownload.audioQuality || null
      });
    }

    // Default response for unknown downloads
    res.json({
      progress: 100,
      status: 'completed',
      speed: '0 KB/s',
      eta: 'Complete',
      fileSize: 'Download ready',
      audioCodec: 'AAC',
      isMuxed: false,
      videoQuality: null,
      audioQuality: null
    });

  } catch (error) {
    console.error('❌ Download status error:', error);
    res.status(500).json({
      error: 'Failed to get download status',
      details: error.message
    });
  }
});

// Get quality category for UI
function getQualityCategory(height) {
  if (!height) return 'Unknown';
  const h = parseInt(height);
  if (h >= 4320) return '8K';
  if (h >= 2160) return '4K';
  if (h >= 1440) return '2K';
  if (h >= 1080) return '1080p';
  if (h >= 720) return '720p';
  if (h >= 480) return '480p';
  if (h >= 360) return '360p';
  if (h >= 240) return '240p';
  return 'Low';
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    supportedPlatforms: Object.values(SUPPORTED_PLATFORMS),
    totalDownloads: downloadHistory.length
  });
});

// Extract video metadata
router.post('/metadata', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Check cache first
    const cacheKey = `metadata_${url}`;
    const cached = metadataCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
      console.log('📦 Returning cached metadata');
      return res.json(cached.data);
    }

    const platform = detectPlatform(url);
    console.log(`🔍 Extracting metadata for ${platform}: ${url}`);

    let metadata;

    if (platform === 'YouTube' || platform === 'Youtube Music') {
      try {
        console.log('🎬 Extracting YouTube metadata with enhanced downloader...');
        
        // Use enhanced YouTube downloader for extraction
        const extractionResult = await YouTubeDownloader.extractRealDownloadUrls(url);
        
        if (extractionResult.success) {
          // Group formats by quality
          const allFormats = extractionResult.formats;
          
          // Separate video and audio formats
          const videoFormats = allFormats.filter(f => f.hasVideo);
          const audioFormats = allFormats.filter(f => f.hasAudio && !f.hasVideo);
          
          metadata = {
            title: extractionResult.title,
            duration: extractionResult.duration,
            thumbnail: extractionResult.thumbnail,
            platform: platform,
            url: url,
            allFormats: allFormats.map(format => ({
              quality_label: format.quality,
              resolution: format.qualityLabel,
              container: format.container,
              filesize: format.filesize,
              approx_human_size: format.filesize ? formatFileSize(format.filesize) : 'Calculating...',
              type: format.mimeType,
              itag: format.itag,
              has_video: format.hasVideo,
              has_audio: format.hasAudio,
              url: format.url
            })),
            videoFormats: videoFormats.map(format => ({
              quality_label: format.quality,
              resolution: format.qualityLabel,
              container: format.container,
              width: format.width,
              height: format.height,
              fps: format.fps,
              available: true
            })),
            audioFormats: audioFormats.map(format => ({
              quality_label: format.quality,
              container: format.container,
              bitrate: format.bitrate,
              available: true
            }))
          };
        } else {
          // Fallback to ytdl-core
          console.log('⚠️ Enhanced extractor failed, using ytdl-core fallback');
          const info = await ytdl.getInfo(url);
          
          metadata = {
            title: info.videoDetails.title,
            duration: parseInt(info.videoDetails.lengthSeconds),
            thumbnail: info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url,
            platform: platform,
            url: url,
            allFormats: info.formats.map(format => ({
              quality_label: format.qualityLabel || format.quality,
              resolution: format.qualityLabel,
              container: format.container,
              filesize: format.contentLength,
              approx_human_size: format.contentLength ? formatFileSize(format.contentLength) : 'Unknown',
              type: format.mimeType,
              itag: format.itag,
              has_video: format.hasVideo,
              has_audio: format.hasAudio
            })),
            videoFormats: info.formats.filter(f => f.hasVideo).map(format => ({
              quality_label: format.qualityLabel || format.quality,
              resolution: format.qualityLabel,
              container: format.container,
              width: format.width,
              height: format.height,
              fps: format.fps,
              available: true
            })),
            audioFormats: info.formats.filter(f => f.hasAudio && !f.hasVideo).map(format => ({
              quality_label: format.audioBitrate ? `${format.audioBitrate}kbps` : 'Audio',
              container: format.container,
              bitrate: format.audioBitrate,
              available: true
            }))
          };
        }
      } catch (error) {
        console.error('YouTube metadata error:', error);
        metadata = {
          title: 'YouTube Video',
          platform: platform,
          url: url,
          error: error.message
        };
      }
    } else if (platform === 'Instagram') {
      try {
        const instagramData = await InstagramExtractor.extractMedia(url);
        
        if (instagramData && instagramData.mediaItems && instagramData.mediaItems.length > 0) {
          metadata = {
            title: instagramData.title || 'Instagram Content',
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

// Debug endpoint to check all available formats
router.post('/debug-formats', async (req, res) => {
  try {
    const { url } = req.body;
    console.log('🔍 DEBUG: Checking all formats for:', url);

    const info = await ytdl.getInfo(url);
    const allFormats = info.formats;

    const formatAnalysis = {
      total: allFormats.length,
      withVideo: allFormats.filter(f => f.hasVideo).length,
      withAudio: allFormats.filter(f => f.hasAudio).length,
      videoAndAudio: allFormats.filter(f => f.hasVideo && f.hasAudio).length,
      videoOnly: allFormats.filter(f => f.hasVideo && !f.hasAudio).length,
      audioOnly: allFormats.filter(f => f.hasAudio && !f.hasVideo).length,
      qualities: [...new Set(allFormats.filter(f => f.height).map(f => f.height))].sort((a, b) => b - a),
      containers: [...new Set(allFormats.map(f => f.container))],
      formats: allFormats.map(f => ({
        itag: f.itag,
        quality: f.qualityLabel || f.quality,
        height: f.height,
        width: f.width,
        container: f.container,
        hasVideo: f.hasVideo,
        hasAudio: f.hasAudio,
        filesize: f.contentLength,
        mimeType: f.mimeType
      }))
    };

    res.json(formatAnalysis);
  } catch (error) {
    console.error('❌ Debug formats failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Extract download links endpoint (real implementation)
router.post('/extract-links', async (req, res) => {
  try {
    const { url, format = 'mp4', quality = 'best' } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const platform = detectPlatform(url);
    console.log(`🔗 Extracting download links for ${platform}: ${url}`);

    if (platform === 'YouTube' || platform === 'Youtube Music') {
      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const duration = info.videoDetails.lengthSeconds;
        const thumbnail = info.videoDetails.thumbnails[info.videoDetails.thumbnails.length - 1]?.url;

        // Get ALL available formats (no filtering - get everything)
        const allFormats = info.formats;
        console.log(`📊 Total formats found: ${allFormats.length}`);

        // Separate ALL video formats (both progressive and adaptive)
        const videoWithAudio = allFormats.filter(f => f.hasVideo && f.hasAudio);
        const videoOnly = allFormats.filter(f => f.hasVideo && !f.hasAudio);
        const audioOnly = allFormats.filter(f => f.hasAudio && !f.hasVideo);

        // Combine ALL video formats to get complete range
        const allVideoFormats = [...videoWithAudio, ...videoOnly];
        console.log(`📊 Video formats: ${videoWithAudio.length} with audio, ${videoOnly.length} video-only, total: ${allVideoFormats.length}`);
        console.log(`📊 Audio formats: ${audioOnly.length}`);

        // Log all unique qualities found
        const uniqueQualities = [...new Set(allVideoFormats.map(f => f.height).filter(h => h))];
        console.log(`📊 Unique video qualities found: ${uniqueQualities.sort((a, b) => b - a).join(', ')}`);

        // Sort by quality (highest first) - 8K to 144p
        allVideoFormats.sort((a, b) => {
          const heightA = parseInt(a.height) || 0;
          const heightB = parseInt(b.height) || 0;
          return heightB - heightA;
        });

        // Sort audio formats by bitrate (highest first)
        audioOnly.sort((a, b) => {
          const bitrateA = parseInt(a.audioBitrate) || 0;
          const bitrateB = parseInt(b.audioBitrate) || 0;
          return bitrateB - bitrateA;
        });

        // Format the links for easy access
        const extractedLinks = {
          success: true,
          title: title,
          duration: duration,
          thumbnail: thumbnail,
          platform: platform,
          videoFormats: allVideoFormats.map(f => ({
            quality: f.qualityLabel || f.quality || `${f.height}p`,
            height: f.height,
            width: f.width,
            container: f.container,
            url: f.url,
            filesize: f.contentLength,
            filesize_human: f.contentLength ? formatFileSize(f.contentLength) : 'Calculating...',
            mimeType: f.mimeType,
            fps: f.fps,
            bitrate: f.bitrate,
            itag: f.itag,
            hasVideo: f.hasVideo,
            hasAudio: f.hasAudio,
            qualityNumber: parseInt(f.height) || 0,
            category: getQualityCategory(f.height)
          })), // Show ALL formats from 8K to 144p
          audioFormats: audioOnly.map(f => ({
            quality: f.audioBitrate ? `${f.audioBitrate}kbps` : 'Audio',
            container: f.container,
            url: f.url,
            filesize: f.contentLength,
            filesize_human: f.contentLength ? formatFileSize(f.contentLength) : 'Unknown',
            mimeType: f.mimeType,
            bitrate: f.audioBitrate,
            sampleRate: f.audioSampleRate,
            itag: f.itag
          })), // Show ALL audio formats

          // Quality statistics from 144p to 8K
          qualityStats: {
            total: allVideoFormats.length,
            '8K': allVideoFormats.filter(f => f.height >= 4320).length,
            '4K': allVideoFormats.filter(f => f.height >= 2160 && f.height < 4320).length,
            '2K': allVideoFormats.filter(f => f.height >= 1440 && f.height < 2160).length,
            '1080p': allVideoFormats.filter(f => f.height >= 1080 && f.height < 1440).length,
            '720p': allVideoFormats.filter(f => f.height >= 720 && f.height < 1080).length,
            '480p': allVideoFormats.filter(f => f.height >= 480 && f.height < 720).length,
            '360p': allVideoFormats.filter(f => f.height >= 360 && f.height < 480).length,
            '240p': allVideoFormats.filter(f => f.height >= 240 && f.height < 360).length,
            '144p': allVideoFormats.filter(f => f.height >= 144 && f.height < 240).length
          },
          message: 'All qualities extracted from 144p to 8K with real-time data',
          note: 'Complete range of YouTube qualities available for download'
        };

        console.log(`✅ Extracted ${extractedLinks.videoFormats.length} video and ${extractedLinks.audioFormats.length} audio formats`);

        res.json(extractedLinks);

      } catch (error) {
        console.error('❌ Link extraction failed:', error.message);
        res.status(503).json({
          success: false,
          error: 'Failed to extract download links',
          details: error.message,
          suggestion: 'Try again or use a different quality'
        });
      }
    } else {
      res.status(400).json({
        error: `Platform ${platform} is not supported for link extraction`,
        supportedPlatforms: ['YouTube']
      });
    }
  } catch (error) {
    console.error('Link extraction error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download status endpoint for real-time tracking
router.post('/status', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    const platform = detectPlatform(url);
    
    // Simple status check - just verify if the URL is accessible
    if (platform === 'YouTube' || platform === 'Youtube Music') {
      try {
        // Quick check using ytdl
        const info = await ytdl.getBasicInfo(url);
        
        res.json({
          status: 'ready',
          platform: platform,
          title: info.videoDetails.title,
          duration: info.videoDetails.lengthSeconds,
          available: true,
          message: 'Video is ready for download'
        });
      } catch (error) {
        res.json({
          status: 'unavailable',
          platform: platform,
          available: false,
          error: error.message,
          message: 'Video may be private, deleted, or restricted'
        });
      }
    } else if (platform === 'Instagram') {
      // For Instagram, just return ready status
      res.json({
        status: 'ready',
        platform: platform,
        available: true,
        message: 'Instagram content ready for extraction'
      });
    } else {
      res.json({
        status: 'unsupported',
        platform: platform,
        available: false,
        message: 'Platform not supported'
      });
    }
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message 
    });
  }
});

// YouTube download proxy endpoint for better CORS handling
router.post('/proxy-download', async (req, res) => {
  console.log('📥 Proxy download route hit with body:', req.body);
  try {
    const { url: downloadUrl, filename, contentType } = req.body;

    if (!downloadUrl || !filename) {
      console.log('❌ Missing required fields:', { downloadUrl: !!downloadUrl, filename: !!filename });
      return res.status(400).json({ error: 'Download URL and filename are required' });
    }

    console.log('🔄 Proxying download:', filename);

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', contentType || 'application/octet-stream');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    // Fetch and stream the content
    const response = await axios({
      method: 'GET',
      url: downloadUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Referer': 'https://www.youtube.com/',
        'Accept': '*/*'
      },
      timeout: 30000
    });

    // Set content length if available
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Pipe the stream
    response.data.pipe(res);

    response.data.on('error', (error) => {
      console.error('❌ Proxy stream error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Proxy download failed' });
      }
    });

    response.data.on('end', () => {
      console.log('✅ Proxy download completed:', filename);
    });

  } catch (error) {
    console.error('❌ Proxy download failed:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to proxy download' });
    }
  }
});

// Download video (enhanced with new YouTube downloader)
router.post('/video', async (req, res) => {
  // Set extended timeout for muxing operations
  req.setTimeout(600000, () => { // 10 minutes for high quality video muxing
    console.error('⏰ Download request timeout');
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Download took too long to process. Please try a lower quality or use Extract Links feature.'
      });
    }
  });

  try {
    const { url, format = 'mp4', quality = 'best', directUrl, title: clientTitle, mimeType } = req.body;

    console.log('Download request received:', { url, format, quality, hasDirectUrl: !!directUrl });

    // Fast path: if client already has a verified direct URL, proxy-stream it to avoid extra extraction
    if (directUrl) {
      try {
        const safeTitle = (clientTitle || 'video').replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50).trim();
        const extension = format || (mimeType?.split('/')[1]) || 'mp4';
        // Use original quality for direct URL downloads (usually already correct)
        const filename = `${safeTitle}_${quality}.${extension}`;

        // Prefer redirect to avoid long-lived server streams (reduces 503 under load)
        res.status(302).setHeader('Location', directUrl);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        return res.end();
      } catch (directErr) {
        console.log('⚠️ Direct URL redirect failed, falling back to extraction...', directErr.message);
      }
    }

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    
    const platform = detectPlatform(url);
    
    if (platform === 'YouTube' || platform === 'Youtube Music') {
      console.log('🎬 Using enhanced YouTube downloader...');
      
      try {
        // Use our enhanced YouTube downloader with timeout and better error handling
        console.log('🔄 Attempting enhanced downloader with 15s timeout...');

        const downloadResult = await Promise.race([
          YouTubeDownloader.getDownloadUrl(url, quality),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Enhanced downloader timeout after 15 seconds')), 15000)
          )
        ]);

        if (!downloadResult.success) {
          throw new Error(downloadResult.error || 'Failed to get download URL');
        }
        
        const { downloadUrl, format: selectedFormat, title, actualQuality, requestedQuality } = downloadResult;

        console.log(`✅ Enhanced downloader success: ${title}`);
        console.log(`📊 Format: ${selectedFormat.quality} (${selectedFormat.container})`);

        // Log quality selection details
        if (actualQuality && requestedQuality && actualQuality !== requestedQuality) {
          console.log(`🔄 Quality fallback applied: ${requestedQuality} → ${actualQuality}`);
        }

        // Generate download ID for tracking
        const downloadId = Date.now() + Math.random().toString(36).substr(2, 9);

        // Initialize progress tracking
        activeDownloads.set(downloadId, {
          progress: 0,
          status: 'initializing',
          speed: '0 KB/s',
          eta: 'Calculating...',
          fileSize: selectedFormat.filesize ? formatFileSize(selectedFormat.filesize) : 'Unknown',
          startTime: new Date().toISOString(),
          url: url,
          title: title
        });

        // Prepare response headers
        const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50).trim();
        const extension = format === 'mp3' ? 'mp3' : (selectedFormat.container || 'mp4');
        // Use actual quality selected (height preference over quality label for accuracy)
        const selectedQuality = selectedFormat.height ? `${selectedFormat.height}p` : selectedFormat.quality;
        const filename = `${safeTitle}_${selectedQuality}.${extension}`;

        // Set headers for download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', getContentType(extension));
        res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
        res.setHeader('X-Download-ID', downloadId.toString()); // Send download ID for tracking
        
        // Track download (safely wrapped to prevent backend crashes)
        try {
          trackDownload({
            url: url,
            title: title,
            platform: platform,
            format: extension,
            quality: selectedFormat.quality,
            fileSize: selectedFormat.filesize ? formatFileSize(selectedFormat.filesize) : 'Unknown'
          }).catch(err => console.log('📝 Download tracking failed:', err.message));
        } catch (trackErr) {
          console.log('📝 Download tracking setup failed:', trackErr.message);
        }
        
        // Stream the download directly instead of using YouTubeDownloader.streamDownload
        console.log('🚀 Starting enhanced download stream...');

        try {
          const response = await axios({
            method: 'GET',
            url: downloadUrl,
            responseType: 'stream',
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
              'Referer': 'https://www.youtube.com/'
            },
            timeout: 30000
          });

          // Track download progress
          let receivedBytes = 0;
          const expectedSize = response.headers['content-length'] ? parseInt(response.headers['content-length']) : null;
          const startTime = Date.now();

          if (expectedSize) {
            res.setHeader('Content-Length', expectedSize);
          }

          // Track progress in real-time
          response.data.on('data', (chunk) => {
            receivedBytes += chunk.length;

            if (expectedSize) {
              const progress = Math.round((receivedBytes / expectedSize) * 100);
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = receivedBytes / elapsed;
              const remaining = expectedSize - receivedBytes;
              const eta = remaining / speed;

              // Update progress tracking with audio information
              activeDownloads.set(downloadId, {
                progress: Math.min(progress, 100),
                status: 'downloading',
                speed: `${(speed / 1024 / 1024).toFixed(1)} MB/s`,
                eta: eta > 0 ? `${Math.round(eta)}s` : 'Complete',
                fileSize: formatFileSize(expectedSize),
                receivedBytes: formatFileSize(receivedBytes),
                startTime: new Date(startTime).toISOString(),
                url: url,
                title: title,
                audioCodec: selectedFormat.hasAudio ? 'AAC/Compatible' : 'No Audio',
                isMuxed: false,
                videoQuality: selectedFormat.height ? `${selectedFormat.height}p` : selectedFormat.quality,
                audioQuality: selectedFormat.hasAudio ? 'Included' : 'None'
              });
            }
          });

          // Pipe the stream
          response.data.pipe(res);

          response.data.on('end', () => {
            console.log(`✅ Enhanced download completed: ${filename}`);
            // Update status to completed
            activeDownloads.set(downloadId, {
              progress: 100,
              status: 'completed',
              speed: '0 KB/s',
              eta: 'Complete',
              fileSize: formatFileSize(receivedBytes || expectedSize)
            });

            // Clean up after 5 minutes
            setTimeout(() => {
              activeDownloads.delete(downloadId);
            }, 5 * 60 * 1000);
          });

          response.data.on('error', (error) => {
            console.error(`❌ Enhanced download stream error: ${error.message}`);
            // Update status to error
            activeDownloads.set(downloadId, {
              progress: 0,
              status: 'error',
              speed: '0 KB/s',
              eta: 'Failed',
              error: error.message
            });
            if (!res.headersSent) {
              res.status(500).json({ error: 'Download stream failed' });
            }
          });

        } catch (streamError) {
          console.error('��� Enhanced download stream setup failed:', streamError.message);
          throw streamError;
        }
        
      } catch (enhancedError) {
        console.log('❌ Enhanced downloader failed:', enhancedError.message);

        // Check if failure is due to requiring muxing for audio support
        if (enhancedError.message.includes('requires_muxing') ||
            enhancedError.message.includes('only available without audio') ||
            enhancedError.message.includes('only available as video-only') ||
            enhancedError.message.includes('will trigger muxing') ||
            enhancedError.message.includes('highest_requires_muxing') ||
            enhancedError.message.includes('selected_format_requires_muxing')) {

          console.log('🎬 Attempting stream muxing (video + audio combination)...');

          try {
            // Check if FFmpeg is available
            const ffmpegAvailable = await StreamMuxer.checkFFmpegAvailability();
            if (!ffmpegAvailable) {
              console.log('⚠️ FFmpeg not available, falling back to best available quality with audio');
              throw new Error('FFmpeg not available for stream muxing');
            }

            // Get separate video and audio streams
            const streamsResult = await YouTubeDownloader.getSeparateStreams(url, quality);

            if (!streamsResult.success) {
              throw new Error(streamsResult.error || 'Failed to get separate streams');
            }

            const { videoStream, audioStream, title } = streamsResult;

            console.log(`🎯 Muxing ${videoStream.quality} video + ${audioStream.quality} audio`);
            console.log(`⏳ High quality muxing may take 2-5 minutes - please wait...`);

            // Prepare response headers for muxed content
            const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50).trim();
            const filename = `${safeTitle}_${videoStream.quality}_muxed.mp4`;

            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            res.setHeader('Content-Type', 'video/mp4');
            res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
            res.setHeader('X-Muxed-Download', 'true'); // Indicate this is a muxed download
            res.setHeader('X-Video-Quality', videoStream.quality);
            res.setHeader('X-Audio-Quality', audioStream.quality);

            // Start muxing process with extended timeout for high quality videos
            const muxResult = await Promise.race([
              StreamMuxer.combineStreams(
                videoStream.url,
                audioStream.url,
                {
                  format: 'mp4',
                  quality: videoStream.quality,
                  filename: filename,
                  videoCodec: 'copy', // Keep video as-is for speed
                  audioCodec: 'aac' // Force AAC audio for compatibility
                }
              ),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Muxing timeout after 5 minutes')), 300000)
              )
            ]);

            console.log(`🚀 Starting muxed download stream: ${filename}`);

            // Pipe the muxed stream to response
            muxResult.stream.pipe(res);

            // Handle muxed stream events
            muxResult.stream.on('end', () => {
              console.log(`✅ Muxed download completed: ${filename}`);
            });

            muxResult.stream.on('error', (error) => {
              console.error('❌ Muxed stream error:', error.message);
              if (!res.headersSent) {
                res.status(500).json({ error: 'Muxed download stream failed' });
              }
            });

            // Cleanup on client disconnect
            req.on('close', () => {
              console.log('🧹 Client disconnected, cleaning up muxing process...');
              if (muxResult.cleanup) {
                muxResult.cleanup();
              }
            });

            // Track muxed download
            try {
              trackDownload({
                url: url,
                title: title,
                platform: platform,
                format: 'mp4',
                quality: `${videoStream.quality} (muxed)`,
                fileSize: 'Muxed stream'
              }).catch(err => console.log('📝 Muxed download tracking failed:', err.message));
            } catch (trackErr) {
              console.log('📝 Muxed download tracking setup failed:', trackErr.message);
            }

            return; // Exit here - don't fall through to ytdl-core

          } catch (muxingError) {
            console.log('❌ Stream muxing failed:', muxingError.message);

            // If response headers not sent yet, send error response
            if (!res.headersSent) {
              console.log('🔄 Muxing failed, falling back to ytdl-core...');
              // Don't return here - let it fall through to ytdl-core
            } else {
              // Response already started, can't fallback
              console.log('💥 Response already started, cannot fallback');
              return;
            }
          }
        }

        console.log('🔄 Trying ytdl-core fallback...');
        
        try {
          // Fallback to ytdl-core with better error handling
          console.log('🔄 Attempting ytdl-core fallback with enhanced format selection...');

          const info = await ytdl.getInfo(url, {
            requestOptions: {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
              }
            }
          });

          const title = info.videoDetails.title;
          console.log(`���� Video title: ${title}`);

          // Enhanced format filtering with STRICT audio priority
          let formats;
          if (format === 'mp3') {
            formats = ytdl.filterFormats(info.formats, 'audioonly');
          } else {
            // STRICT PRIORITY: Only use formats with both video and audio (progressive formats)
            formats = info.formats.filter(f => f.hasVideo && f.hasAudio);
            console.log(`📊 Progressive formats (video+audio): ${formats.length}`);

            if (formats.length === 0) {
              console.log('❌ No progressive formats available - cannot download without audio!');
              console.log('🎬 This video requires muxing to combine separate video and audio streams.');

              // Check if separate video and audio streams exist
              const videoOnlyFormats = info.formats.filter(f => f.hasVideo && !f.hasAudio);
              const audioOnlyFormats = info.formats.filter(f => f.hasAudio && !f.hasVideo);

              console.log(`📊 Video-only formats: ${videoOnlyFormats.length}`);
              console.log(`📊 Audio-only formats: ${audioOnlyFormats.length}`);

              if (videoOnlyFormats.length > 0 && audioOnlyFormats.length > 0) {
                console.log('🎬 Separate streams available - should use muxing instead');
                throw new Error('Video requires muxing - separate video and audio streams available');
              } else {
                console.log('❌ No suitable video or audio streams found');
                throw new Error('No downloadable video formats found with audio');
              }
            }
          }

          if (formats.length === 0) {
            console.error(`❌ No formats found. Total available: ${info.formats.length}`);
            throw new Error(`No suitable formats found. Available: ${info.formats.length} total formats`);
          }

          console.log(`✅ Found ${formats.length} suitable formats for download`);

          // Enhanced format selection with STRICT audio requirement
          let selectedFormat;
          console.log(`🎯 Requested quality: ${quality} (AUDIO REQUIRED)`);

          if (quality === 'best' || quality === 'highest') {
            // Get the best quality available with audio (progressive formats only), prefer MP4
            const mp4Formats = formats.filter(f => f.container === 'mp4');
            const formatsToUse = mp4Formats.length > 0 ? mp4Formats : formats;

            selectedFormat = formatsToUse.reduce((best, current) => {
              const bestHeight = best.height || 0;
              const currentHeight = current.height || 0;
              return currentHeight > bestHeight ? current : best;
            });
            console.log(`✅ Selected best quality with audio: ${selectedFormat.qualityLabel || selectedFormat.quality} (${selectedFormat.container})`);
          } else if (quality.includes('p') || !isNaN(parseInt(quality))) {
            // Specific quality requested - ONLY consider formats with audio
            const requestedHeight = parseInt(quality.replace('p', ''));
            console.log(`🎯 ytdl-core fallback looking for: ${requestedHeight}p WITH AUDIO`);

            // Find exact match with audio, prefer MP4 containers
            const mp4Formats = formats.filter(f => f.container === 'mp4');
            const formatsToUse = mp4Formats.length > 0 ? mp4Formats : formats;

            selectedFormat = formatsToUse.find(f => f.height === requestedHeight) ||
                           formatsToUse.find(f => f.qualityLabel === quality) ||
                           formatsToUse.find(f => f.qualityLabel === `${requestedHeight}p`);

            // If exact match not found, find closest quality (all formats already have audio)
            if (!selectedFormat) {
              selectedFormat = formatsToUse.reduce((closest, current) => {
                const closestDiff = Math.abs((closest.height || 0) - requestedHeight);
                const currentDiff = Math.abs((current.height || 0) - requestedHeight);
                return currentDiff < closestDiff ? current : closest;
              });
              console.log(`🔄 Using closest available quality: ${selectedFormat.height}p (${selectedFormat.container}) (requested ${requestedHeight}p)`);
            } else {
              console.log(`✅ Found exact quality: ${selectedFormat.qualityLabel || selectedFormat.quality} (${selectedFormat.container})`);
            }
          } else {
            // Fallback - first format (all formats already have audio)
            selectedFormat = formats[0];
          }

          // Final check and warning for audio
          if (selectedFormat && !selectedFormat.hasAudio && format !== 'mp3') {
            console.log('���� CRITICAL: Selected format has NO AUDIO! This will result in a silent video file.');
            console.log(`🔧 Format details: ${selectedFormat.qualityLabel || selectedFormat.quality} - ${selectedFormat.container}`);
            console.log('💡 Recommendation: Users should try lower quality (720p/480p) or use Extract Links feature');
          } else if (selectedFormat && selectedFormat.hasAudio) {
            console.log('✅ Selected format includes audio - video will have sound');
          }

          if (!selectedFormat) {
            throw new Error(`Could not select format from ${formats.length} available formats`);
          }

          // CRITICAL CHECK: Block video-only downloads for MP4 requests
          if (!selectedFormat.hasAudio && format === 'mp4') {
            console.log('❌ BLOCKING: MP4 download would result in silent video');

            // Check if there are any formats with audio available
            const formatsWithAudio = info.formats.filter(f => f.hasVideo && f.hasAudio);

            if (formatsWithAudio.length > 0) {
              const availableQualities = formatsWithAudio
                .map(f => f.qualityLabel || `${f.height}p`)
                .filter((value, index, self) => self.indexOf(value) === index)
                .sort((a, b) => {
                  const heightA = parseInt(a.replace('p', '')) || 0;
                  const heightB = parseInt(b.replace('p', '')) || 0;
                  return heightB - heightA;
                });

              return res.status(422).json({
                success: false,
                error: 'Selected quality is only available as video-only (no audio)',
                message: `${quality} is only available without audio. This would result in a silent video file.`,
                suggestion: `Please try one of these qualities that include audio: ${availableQualities.join(', ')}`,
                availableQualitiesWithAudio: availableQualities,
                alternativeAction: 'Use the "Extract Links" feature for advanced download options with separate video and audio streams.',
                userFriendly: true
              });
            } else {
              return res.status(422).json({
                success: false,
                error: 'No formats with audio available',
                message: 'This video only has video-only formats available (adaptive streaming).',
                suggestion: 'Use the "Extract Links" feature to get separate video and audio streams, then merge them using video editing software.',
                alternativeAction: 'Try downloading as audio-only (MP3) if you only need the audio.',
                userFriendly: true
              });
            }
          }

          console.log(`✅ Selected format: ${selectedFormat.qualityLabel || selectedFormat.quality} (height: ${selectedFormat.height}) - Has Audio: ${selectedFormat.hasAudio}`);

          console.log(`✅ Using ytdl-core fallback for: ${title}`);
          console.log(`📊 Format: ${selectedFormat.qualityLabel || selectedFormat.quality}`);

          // Generate download ID for tracking
          const downloadId = Date.now() + Math.random().toString(36).substr(2, 9);

          // Initialize progress tracking
          activeDownloads.set(downloadId, {
            progress: 0,
            status: 'initializing',
            speed: '0 KB/s',
            eta: 'Calculating...',
            fileSize: selectedFormat.contentLength ? formatFileSize(selectedFormat.contentLength) : 'Unknown',
            startTime: new Date().toISOString(),
            url: url,
            title: title
          });

          // Prepare response headers
          const safeTitle = title.replace(/[^a-zA-Z0-9\s\-_]/g, '').substring(0, 50).trim();
          const extension = format === 'mp3' ? 'mp3' : (selectedFormat.container || 'mp4');
          // Use actual quality selected (height preference for accuracy)
          const finalQuality = selectedFormat.height ? `${selectedFormat.height}p` : (selectedFormat.qualityLabel || selectedFormat.quality || quality);
          const filename = `${safeTitle}_${finalQuality}.${extension}`;

          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.setHeader('Content-Type', getContentType(extension));
          res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
          res.setHeader('X-Download-ID', downloadId.toString()); // Send download ID for tracking

          // Track download (safely wrapped to prevent backend crashes)
          try {
            trackDownload({
              url: url,
              title: title,
              platform: platform,
              format: extension,
              quality: selectedFormat.qualityLabel || quality,
              fileSize: selectedFormat.contentLength ? formatFileSize(selectedFormat.contentLength) : 'Unknown'
            }).catch(err => console.log('📝 Download tracking failed:', err.message));
          } catch (trackErr) {
            console.log('📝 Download tracking setup failed:', trackErr.message);
          }

          // Create download stream
          const downloadStream = ytdl(url, { format: selectedFormat });

          let receivedBytes = 0;
          const expectedSize = selectedFormat.contentLength;
          const startTime = Date.now();

          // Track progress in real-time
          downloadStream.on('data', (chunk) => {
            receivedBytes += chunk.length;

            if (expectedSize) {
              const progress = Math.round((receivedBytes / expectedSize) * 100);
              const elapsed = (Date.now() - startTime) / 1000;
              const speed = receivedBytes / elapsed;
              const remaining = expectedSize - receivedBytes;
              const eta = remaining / speed;

              // Update progress tracking
              activeDownloads.set(downloadId, {
                progress: Math.min(progress, 100),
                status: 'downloading',
                speed: `${(speed / 1024 / 1024).toFixed(1)} MB/s`,
                eta: eta > 0 ? `${Math.round(eta)}s` : 'Complete',
                fileSize: formatFileSize(expectedSize),
                receivedBytes: formatFileSize(receivedBytes),
                startTime: new Date(startTime).toISOString(),
                url: url,
                title: title
              });
            }
          });

          downloadStream.pipe(res);

          downloadStream.on('error', (error) => {
            console.error('❌ Download stream error:', error.message);
            // Update status to error
            activeDownloads.set(downloadId, {
              progress: 0,
              status: 'error',
              speed: '0 KB/s',
              eta: 'Failed',
              error: error.message
            });
            if (!res.headersSent) {
              res.status(500).json({ error: 'Download stream failed' });
            }
          });

          downloadStream.on('end', () => {
            console.log('✅ Download completed successfully');
            // Update status to completed
            activeDownloads.set(downloadId, {
              progress: 100,
              status: 'completed',
              speed: '0 KB/s',
              eta: 'Complete',
              fileSize: formatFileSize(receivedBytes)
            });

            // Clean up after 5 minutes
            setTimeout(() => {
              activeDownloads.delete(downloadId);
            }, 5 * 60 * 1000);
          });
          
        } catch (fallbackError) {
          console.error('❌ Both enhanced and fallback methods failed:', fallbackError.message);
          
          // Check if it's a rate limiting issue
          const isRateLimit = fallbackError.message.includes('rate limit') ||
                             fallbackError.message.includes('429') ||
                             fallbackError.message.includes('Too Many Requests');

          if (isRateLimit) {
            return res.status(429).json({
              success: false,
              error: 'Rate limit reached',
              message: 'YouTube rate limit reached. Please wait a few minutes and try again.',
              suggestion: 'Wait 2-3 minutes before trying again, or try a different video.',
              retryAfter: 180, // 3 minutes
              userFriendly: true
            });
          }

          // All methods failed
          return res.status(503).json({
            success: false,
            error: 'Download service temporarily unavailable',
            message: 'Unable to download this video at the moment. This could be due to YouTube protection measures or server load.',
            suggestions: [
              'Try again in a few minutes',
              'Try a different video quality',
              'Use the \"Extract Links\" feature instead',
              'Try a different video'
            ],
            userFriendly: true,
            retryRecommended: true
          });
        }
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

      } catch (error) {
        console.error('❌ Instagram download failed:', error);
        res.status(503).json({
          success: false,
          error: 'Instagram download failed',
          details: error.message,
          message: 'Content may be private, expired, or temporarily unavailable'
        });
      }
    } else {
      res.status(400).json({
        error: `Platform ${platform} is not supported`,
        supportedPlatforms: ['YouTube', 'Instagram']
      });
    }
  } catch (error) {
    console.error('❌ Download endpoint error:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Service temporarily unavailable'
      });
    }
  }
});

module.exports = router;
