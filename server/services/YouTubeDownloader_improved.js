const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');

/**
 * Enhanced YouTube Downloader that bypasses rate limits and bot detection
 * Uses multiple strategies to extract real download URLs
 */
class YouTubeDownloader {
  constructor() {
    this.userAgents = [
      // Latest Chrome versions with more realistic headers
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      // Firefox with updated versions
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0',
      // Mobile browsers (often less restricted)
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1',
      // Android browsers
      'Mozilla/5.0 (Linux; Android 14; SM-G998B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
    ];

    this.apiKeys = [
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
      'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30',
      'AIzaSyBo2-rPZma46JtZOJKgOm8AZhHQ0UNklkY',
      'AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8'
    ];

    this.lastRequestTime = 0;
    this.requestDelay = 1500; // 1.5 seconds between requests
    this.failureCount = 0;
    this.maxRetries = 5; // Increased retries
    this.baseDelay = 1500; // Base delay of 1.5 seconds
    this.maxDelay = 45000; // Max delay of 45 seconds
    
    // Additional bot evasion properties
    this.sessionHeaders = this.generateSessionHeaders();
    this.lastHeaderRotation = Date.now();
    this.headerRotationInterval = 300000; // Rotate headers every 5 minutes
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractVideoId(url) {
    const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
  }

  /**
   * Get random user agent
   */
  getRandomUserAgent() {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }

  /**
   * Generate realistic session headers to avoid bot detection
   */
  generateSessionHeaders() {
    const userAgent = this.getRandomUserAgent();
    const acceptLanguages = [
      'en-US,en;q=0.9',
      'en-GB,en;q=0.9',
      'en-US,en;q=0.8,es;q=0.7',
      'en-US,en;q=0.9,fr;q=0.8'
    ];
    
    return {
      'User-Agent': userAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': acceptLanguages[Math.floor(Math.random() * acceptLanguages.length)],
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Cache-Control': 'max-age=0',
      'Referer': 'https://www.youtube.com/'
    };
  }

  /**
   * Get current session headers (rotate if needed)
   */
  getSessionHeaders() {
    const now = Date.now();
    if (now - this.lastHeaderRotation > this.headerRotationInterval) {
      this.sessionHeaders = this.generateSessionHeaders();
      this.lastHeaderRotation = now;
      console.log('🔄 Rotated session headers for bot evasion');
    }
    return { ...this.sessionHeaders };
  }

  /**
   * Get random API key
   */
  getRandomApiKey() {
    return this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)];
  }

  /**
   * Add realistic delays and jitter to avoid rate limiting
   */
  async addRandomDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.requestDelay) {
      const waitTime = this.requestDelay - timeSinceLastRequest;
      // Add jitter (±30%)
      const jitter = waitTime * 0.3 * (Math.random() - 0.5);
      const finalWaitTime = Math.max(500, waitTime + jitter);
      
      console.log(`⏳ Rate limiting: waiting ${Math.round(finalWaitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, finalWaitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  /**
   * Enhanced ytdl-core method with better bot evasion
   */
  async tryYtdlCore(url) {
    try {
      console.log('🔄 Trying enhanced ytdl-core method...');

      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return { success: false, error: 'Invalid video ID' };
      }

      // Enhanced ytdl configurations with better bot evasion
      const configs = [
        {
          requestOptions: {
            headers: this.getSessionHeaders(),
            transform: (chunk) => chunk // Pass through chunks unchanged
          }
        },
        {
          requestOptions: {
            headers: {
              ...this.getSessionHeaders(),
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1'
            }
          }
        },
        {
          requestOptions: {
            headers: {
              ...this.getSessionHeaders(),
              'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'
            }
          }
        }
      ];

      let lastError = null;

      for (let i = 0; i < configs.length; i++) {
        const config = configs[i];
        try {
          console.log(`Trying configuration ${i + 1}/${configs.length} with ${config.requestOptions.headers['User-Agent'].substring(0, 30)}...`);
          
          await this.addRandomDelay();
          
          const info = await ytdl.getInfo(url, config);

          if (info && info.formats && info.formats.length > 0) {
            console.log('✅ Enhanced ytdl-core extraction successful');

            const formats = info.formats.map(format => ({
              itag: format.itag,
              url: format.url,
              mimeType: format.mimeType,
              quality: format.qualityLabel || format.quality,
              qualityLabel: format.qualityLabel,
              width: format.width,
              height: format.height,
              fps: format.fps,
              bitrate: format.bitrate,
              audioBitrate: format.audioBitrate,
              audioCodec: format.audioCodec,
              videoCodec: format.videoCodec,
              container: format.container,
              hasVideo: format.hasVideo,
              hasAudio: format.hasAudio,
              contentLength: format.contentLength,
              approxDurationMs: format.approxDurationMs
            }));

            return {
              success: true,
              info: {
                videoDetails: info.videoDetails,
                formats: formats
              }
            };
          }
        } catch (configError) {
          lastError = configError;
          console.error(`❌ Failed with config ${i + 1}: ${configError.message.substring(0, 100)}...`);
          
          // If it's a bot detection error, try next config faster
          if (configError.message.includes('Sign in to confirm') || 
              configError.message.includes('bot')) {
            console.log('🔄 Trying next configuration for error:', configError.message.substring(0, 50));
            continue;
          }
          
          // For other errors, add a small delay
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log('All ytdl-core configurations failed, trying fallback method...');
      return { success: false, error: lastError?.message || 'All ytdl-core configs failed' };

    } catch (error) {
      console.error('ytdl-core method failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Improved extraction with better error handling and fallbacks
   */
  async extractRealDownloadUrls(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`🎯 Extracting real download URLs for video: ${videoId}`);

    // Try enhanced ytdl-core method first (most reliable)
    const ytdlResult = await this.tryYtdlCore(url);
    if (ytdlResult.success) {
      console.log('✅ Enhanced ytdl-core method successful');
      return ytdlResult;
    }

    // If all methods fail, provide helpful fallback
    throw new Error('YouTube has temporarily blocked extraction. This is usually temporary - please try again in a few minutes.');
  }

  /**
   * Get video metadata only (lighter request)
   */
  async getVideoMetadata(url) {
    try {
      const result = await this.extractRealDownloadUrls(url);
      if (result.success && result.info) {
        return {
          success: true,
          title: result.info.videoDetails.title,
          author: result.info.videoDetails.author?.name || 'Unknown',
          duration: result.info.videoDetails.lengthSeconds,
          thumbnail: result.info.videoDetails.thumbnails?.[result.info.videoDetails.thumbnails.length - 1]?.url,
          description: result.info.videoDetails.description?.substring(0, 200) + '...',
          uploadDate: result.info.videoDetails.uploadDate,
          viewCount: result.info.videoDetails.viewCount
        };
      }
      return { success: false, error: 'Failed to extract metadata' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = new YouTubeDownloader();
