const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ytdl = require('@distube/ytdl-core');

/**
 * Enhanced YouTube Downloader that bypasses rate limits
 * Uses multiple strategies to extract real download URLs
 */
class YouTubeDownloader {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
      'Mozilla/5.0 (iPad; CPU OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
    ];

    this.apiKeys = [
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
      'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30',
      'AIzaSyBo2-rPZma46JtZOJKgOm8AZhHQ0UNklkY',
      'AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8'
    ];

    this.lastRequestTime = 0;
    this.requestDelay = 3000; // 3 seconds between requests (increased)
    this.failureCount = 0;
    this.maxRetries = 3;
    this.baseDelay = 3000; // Base delay of 3 seconds
    this.maxDelay = 30000; // Max delay of 30 seconds
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
   * Get random API key
   */
  getRandomApiKey() {
    return this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)];
  }

  /**
   * Add exponential backoff delay between requests
   */
  async addRequestDelay() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Calculate delay with exponential backoff if we've had failures
    let effectiveDelay = this.requestDelay;
    if (this.failureCount > 0) {
      // Exponential backoff: baseDelay * (2 ^ failureCount) with jitter
      const exponentialDelay = Math.min(
        this.baseDelay * Math.pow(2, this.failureCount),
        this.maxDelay
      );
      // Add random jitter (±25%) to avoid thundering herd
      const jitter = exponentialDelay * 0.25 * (Math.random() - 0.5);
      effectiveDelay = Math.max(exponentialDelay + jitter, this.requestDelay);

      console.log(`⏳ Applying exponential backoff: ${Math.round(effectiveDelay/1000)}s (failures: ${this.failureCount})`);
    }

    if (timeSinceLastRequest < effectiveDelay) {
      const delay = effectiveDelay - timeSinceLastRequest;
      console.log(`🛑 Rate limiting: waiting ${Math.round(delay/1000)}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Handle request success - reset failure count
   */
  handleRequestSuccess() {
    if (this.failureCount > 0) {
      console.log(`✅ Request succeeded, resetting failure count (was: ${this.failureCount})`);
      this.failureCount = 0;
    }
  }

  /**
   * Handle request failure - increment failure count
   */
  handleRequestFailure(error) {
    this.failureCount++;
    console.log(`❌ Request failed (${this.failureCount}/${this.maxRetries}): ${error.message}`);

    // If we've hit the max retries, reset the counter for future requests
    if (this.failureCount >= this.maxRetries) {
      console.log(`🔄 Max retries reached, will reset counter for next request`);
    }
  }

  /**
   * Method 5: ytdl-core fallback with multiple agents
   */
  async tryYtdlCore(url) {
    try {
      console.log('🔄 Trying ytdl-core fallback method...');

      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return { success: false, error: 'Invalid video ID' };
      }

      // Multiple ytdl configurations to try
      const configs = [
        {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
          }
        },
        {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1'
            }
          }
        },
        {
          requestOptions: {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
            }
          }
        }
      ];

      for (const config of configs) {
        try {
          const info = await ytdl.getInfo(url, config);

          if (info && info.formats && info.formats.length > 0) {
            console.log('✅ ytdl-core extraction successful');

            const formats = info.formats.map(format => ({
              itag: format.itag,
              url: format.url,
              mimeType: format.mimeType,
              quality: format.qualityLabel || format.quality,
              qualityLabel: format.qualityLabel,
              width: format.width,
              height: format.height,
              fps: format.fps,
              bitrate: format.bitrate || format.averageBitrate,
              filesize: format.contentLength ? parseInt(format.contentLength) : null,
              hasVideo: format.hasVideo,
              hasAudio: format.hasAudio,
              container: format.container,
              type: format.hasVideo && format.hasAudio ? 'progressive' : 'adaptive'
            }));

            return {
              success: true,
              videoId: videoId,
              title: info.videoDetails?.title || 'YouTube Video',
              duration: info.videoDetails?.lengthSeconds ? parseInt(info.videoDetails.lengthSeconds) : null,
              thumbnail: info.videoDetails?.thumbnails?.slice(-1)[0]?.url,
              formats: formats,
              extractedAt: new Date().toISOString()
            };
          }
        } catch (configError) {
          console.log(`❌ ytdl-core config failed: ${configError.message}`);
          continue;
        }
      }

      return { success: false, error: 'ytdl-core extraction failed with all configurations' };

    } catch (error) {
      console.log(`❌ ytdl-core fallback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Extract real download URLs using multiple methods
   */
  async extractRealDownloadUrls(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    console.log(`🎯 Extracting real download URLs for video: ${videoId}`);

    // Method 1: Direct YouTube internal API
    const method1Result = await this.tryInternalApi(videoId);
    if (method1Result.success) {
      console.log('✅ Method 1 (Internal API) successful');
      return method1Result;
    }
    if (method1Result.retryAfter) {
      console.log(`🛑 Method 1 rate limited, waiting before trying other methods...`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before trying other methods
    }

    // Method 2: YouTube embed extraction
    const method2Result = await this.tryEmbedExtraction(videoId);
    if (method2Result.success) {
      console.log('✅ Method 2 (Embed) successful');
      return method2Result;
    }
    if (method2Result.retryAfter) {
      console.log(`🛑 Method 2 rate limited, waiting before trying other methods...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }

    // Method 3: Third-party API wrapper
    const method3Result = await this.tryAlternativeApi(videoId);
    if (method3Result.success) {
      console.log('✅ Method 3 (Alternative API) successful');
      return method3Result;
    }

    // Method 4: Direct page scraping with proxy rotation
    const method4Result = await this.tryDirectScraping(url);
    if (method4Result.success) {
      console.log('✅ Method 4 (Direct scraping) successful');
      return method4Result;
    }

    // Method 5: ytdl-core fallback
    const method5Result = await this.tryYtdlCore(url);
    if (method5Result.success) {
      console.log('✅ Method 5 (ytdl-core) successful');
      return method5Result;
    }

    // Check if all methods failed due to rate limiting
    const allRateLimited = [method1Result, method2Result, method3Result, method4Result, method5Result]
      .filter(result => result && result.retryAfter).length >= 3;

    if (allRateLimited) {
      throw new Error('YouTube rate limit reached. Please wait a few minutes and try again.');
    }

    throw new Error('All extraction methods failed - video may be restricted or region-blocked');
  }

  /**
   * Method 1: YouTube internal API with enhanced client configuration
   */
  async tryInternalApi(videoId) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        // Add delay between requests with exponential backoff
        await this.addRequestDelay();

      const apiKey = this.getRandomApiKey();
      const userAgent = this.getRandomUserAgent();

      // Try multiple client configurations
      const clientConfigs = [
        {
          clientName: 'WEB',
          clientVersion: '2.20250118.01.00',
          clientFormFactor: 'DESKTOP'
        },
        {
          clientName: 'ANDROID',
          clientVersion: '19.02.39',
          androidSdkVersion: 30,
          clientFormFactor: 'MOBILE'
        },
        {
          clientName: 'IOS',
          clientVersion: '19.02.3',
          deviceModel: 'iPhone16,2',
          clientFormFactor: 'MOBILE'
        }
      ];

      for (const clientConfig of clientConfigs) {
        try {
          const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;

          const payload = {
            context: {
              client: clientConfig
            },
            videoId: videoId,
            playbackContext: {
              contentPlaybackContext: {
                signatureTimestamp: Math.floor(Date.now() / 1000),
                referer: 'https://www.youtube.com/'
              }
            },
            racyCheckOk: true,
            contentCheckOk: true
          };

          const response = await axios.post(playerUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': userAgent,
              'X-YouTube-Client-Name': clientConfig.clientName === 'WEB' ? '1' : (clientConfig.clientName === 'ANDROID' ? '3' : '5'),
              'X-YouTube-Client-Version': clientConfig.clientVersion,
              'Accept': '*/*',
              'Accept-Language': 'en-US,en;q=0.9',
              'Origin': 'https://www.youtube.com',
              'Referer': 'https://www.youtube.com/'
            },
            timeout: 15000
          });

          const data = response.data;
          if (data.streamingData && (data.streamingData.formats || data.streamingData.adaptiveFormats)) {
            console.log(`✅ Internal API successful with ${clientConfig.clientName} client`);
            this.handleRequestSuccess();
            return this.processStreamingData(data, videoId);
          }

          // Check for playability errors
          if (data.playabilityStatus && data.playabilityStatus.status !== 'OK') {
            console.log(`⚠️ Playability issue with ${clientConfig.clientName}: ${data.playabilityStatus.reason || 'Unknown'}`);
            continue;
          }

        } catch (clientError) {
          // Check if it's a rate limit error
          if (clientError.response?.status === 429) {
            console.log(`🚨 Rate limited on ${clientConfig.clientName} client`);
            lastError = clientError;
            this.handleRequestFailure(clientError);
            throw clientError; // Break out of client loop to retry with backoff
          }
          console.log(`❌ ${clientConfig.clientName} client failed: ${clientError.message}`);
          lastError = clientError;
          continue;
        }
      }

        return { success: false, error: 'All client configurations failed' };

      } catch (error) {
        lastError = error;
        if (error.response?.status === 429) {
          console.log(`🚨 Rate limited, attempt ${attempt}/${this.maxRetries}`);
          this.handleRequestFailure(error);
          if (attempt === this.maxRetries) {
            return { success: false, error: 'Rate limited after all retries', retryAfter: 60 };
          }
          // Continue to next attempt with exponential backoff
          continue;
        }

        console.log(`❌ Internal API attempt ${attempt} failed: ${error.message}`);
        if (attempt === this.maxRetries) {
          return { success: false, error: lastError.message };
        }
      }
    }

    return { success: false, error: lastError?.message || 'All attempts failed' };
  }

  /**
   * Method 2: Enhanced embed extraction with multiple patterns
   */
  async tryEmbedExtraction(videoId) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.addRequestDelay();

      const embedUrl = `https://www.youtube.com/embed/${videoId}?html5=1&c=WEB&cver=2.20250118.01.00`;
      const response = await axios.get(embedUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Referer': 'https://www.youtube.com/',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 15000
      });

      // Try multiple extraction patterns
      const extractionPatterns = [
        /ytInitialPlayerResponse\s*=\s*({.+?});/,
        /var\s+ytInitialPlayerResponse\s*=\s*({.+?});/,
        /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/,
        /"ytInitialPlayerResponse"\s*:\s*({.+?}),/
      ];

      for (const pattern of extractionPatterns) {
        const match = response.data.match(pattern);
        if (match) {
          try {
            const playerData = JSON.parse(match[1]);
            if (playerData.streamingData && (playerData.streamingData.formats || playerData.streamingData.adaptiveFormats)) {
              console.log('✅ Embed extraction successful');
              this.handleRequestSuccess();
              return this.processStreamingData(playerData, videoId);
            }
          } catch (parseError) {
            console.log('⚠️ Failed to parse player data from embed');
            continue;
          }
        }
      }

      // Try to extract from script tags
      const scriptMatches = response.data.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
      for (const script of scriptMatches) {
        if (script.includes('streamingData') || script.includes('adaptiveFormats')) {
          try {
            const dataMatch = script.match(/"streamingData"\s*:\s*({[^}]+})/)
            if (dataMatch) {
              const streamingData = JSON.parse(dataMatch[1]);
              if (streamingData.formats || streamingData.adaptiveFormats) {
                console.log('✅ Embed script extraction successful');
                return this.processStreamingData({ streamingData, videoDetails: { title: 'YouTube Video' } }, videoId);
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

        return { success: false, error: 'No valid player config found in embed' };

      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`🚨 Embed extraction rate limited, attempt ${attempt}/${this.maxRetries}`);
          this.handleRequestFailure(error);
          if (attempt === this.maxRetries) {
            return { success: false, error: 'Rate limited after all retries', retryAfter: 60 };
          }
          continue;
        }

        console.log(`❌ Embed extraction attempt ${attempt} failed: ${error.message}`);
        if (attempt === this.maxRetries) {
          return { success: false, error: error.message };
        }
      }
    }

    return { success: false, error: 'All embed extraction attempts failed' };
  }

  /**
   * Method 3: Alternative extraction using mobile API
   */
  async tryAlternativeApi(videoId) {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.addRequestDelay();

      // Try mobile YouTube API endpoint
      const mobileApiUrl = `https://m.youtube.com/watch?v=${videoId}&pbj=1`;
      const response = await axios.get(mobileApiUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9',
          'X-YouTube-Client-Name': '2',
          'X-YouTube-Client-Version': '2.20250118'
        },
        timeout: 12000
      });

      if (response.data && Array.isArray(response.data)) {
        for (const item of response.data) {
          if (item.playerResponse && item.playerResponse.streamingData) {
            console.log('✅ Mobile API extraction successful');
            return this.processStreamingData(item.playerResponse, videoId);
          }
        }
      }

      // Fallback to OEmbed for basic info
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
        const oembedResponse = await axios.get(oembedUrl, {
          headers: { 'User-Agent': this.getRandomUserAgent() },
          timeout: 8000
        });

        if (oembedResponse.data && oembedResponse.data.title) {
          // Try direct scraping with the title info
          const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
          const scrapingResult = await this.tryDirectScraping(watchUrl);
          if (scrapingResult.success) {
            return scrapingResult;
          }
        }
      } catch (oembedError) {
        console.log('⚠️ OEmbed fallback failed:', oembedError.message);
      }

        return { success: false, error: 'Mobile API and fallbacks failed' };

      } catch (error) {
        if (error.response?.status === 429) {
          console.log(`🚨 Alternative API rate limited, attempt ${attempt}/${this.maxRetries}`);
          this.handleRequestFailure(error);
          if (attempt === this.maxRetries) {
            return { success: false, error: 'Rate limited after all retries', retryAfter: 60 };
          }
          continue;
        }

        console.log(`❌ Alternative API attempt ${attempt} failed: ${error.message}`);
        if (attempt === this.maxRetries) {
          return { success: false, error: error.message };
        }
      }
    }

    return { success: false, error: 'All alternative API attempts failed' };
  }

  /**
   * Method 4: Enhanced direct page scraping with multiple patterns
   */
  async tryDirectScraping(url) {
    try {
      await this.addRequestDelay();

      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 20000
      });

      // Multiple extraction patterns for better reliability
      const extractionPatterns = [
        /var ytInitialPlayerResponse = ({.+?});/,
        /ytInitialPlayerResponse\s*=\s*({.+?});/,
        /window\["ytInitialPlayerResponse"\]\s*=\s*({.+?});/,
        /"ytInitialPlayerResponse"\s*:\s*({.+?}),?\s*["\}]/,
        /ytInitialPlayerResponse":\s*({.+?}),"ytInitialData"/
      ];

      for (const pattern of extractionPatterns) {
        const match = response.data.match(pattern);
        if (match) {
          try {
            const playerData = JSON.parse(match[1]);
            if (playerData.streamingData && (playerData.streamingData.formats || playerData.streamingData.adaptiveFormats)) {
              console.log('✅ Direct scraping successful');
              return this.processStreamingData(playerData, url.match(/v=([^&]+)/)?.[1]);
            }
          } catch (parseError) {
            console.log('⚠️ Failed to parse player data from page scraping');
            continue;
          }
        }
      }

      // Try to extract from script tags with streaming data
      const scriptTags = response.data.match(/<script[^>]*>([\s\S]*?)<\/script>/g) || [];
      for (const script of scriptTags) {
        if (script.includes('"streamingData"')) {
          try {
            // Look for streaming data objects
            const streamingMatch = script.match(/"streamingData"\s*:\s*({[^}]+(?:{[^}]*}[^}]*)*})/)
            if (streamingMatch) {
              const streamingData = JSON.parse(streamingMatch[1]);
              if (streamingData.formats || streamingData.adaptiveFormats) {
                console.log('✅ Script tag extraction successful');
                return this.processStreamingData({
                  streamingData,
                  videoDetails: { title: 'YouTube Video' }
                }, url.match(/v=([^&]+)/)?.[1]);
              }
            }
          } catch (e) {
            continue;
          }
        }
      }

      return { success: false, error: 'No valid streaming data found in page source' };
    } catch (error) {
      console.log(`❌ Direct scraping failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Process streaming data into usable format
   */
  processStreamingData(data, videoId) {
    try {
      const streamingData = data.streamingData;
      const videoDetails = data.videoDetails;
      
      const formats = [];
      
      // Process regular formats (video + audio)
      if (streamingData.formats) {
        streamingData.formats.forEach(format => {
          if (format.url) {
            formats.push({
              itag: format.itag,
              url: format.url,
              mimeType: format.mimeType,
              quality: format.qualityLabel || format.quality,
              qualityLabel: format.qualityLabel,
              width: format.width,
              height: format.height,
              fps: format.fps,
              bitrate: format.bitrate,
              filesize: format.contentLength ? parseInt(format.contentLength) : null,
              hasVideo: true,
              hasAudio: true,
              container: format.mimeType?.split('/')[1]?.split(';')[0] || 'mp4',
              type: 'progressive'
            });
          }
        });
      }

      // Process adaptive formats (video-only or audio-only)
      if (streamingData.adaptiveFormats) {
        streamingData.adaptiveFormats.forEach(format => {
          if (format.url) {
            const isVideo = format.mimeType?.includes('video');
            const isAudio = format.mimeType?.includes('audio');
            
            formats.push({
              itag: format.itag,
              url: format.url,
              mimeType: format.mimeType,
              quality: isAudio ? `${Math.round(format.bitrate / 1000)}kbps` : (format.qualityLabel || format.quality),
              qualityLabel: format.qualityLabel,
              width: format.width,
              height: format.height,
              fps: format.fps,
              bitrate: format.bitrate || format.averageBitrate,
              filesize: format.contentLength ? parseInt(format.contentLength) : null,
              hasVideo: isVideo,
              hasAudio: isAudio,
              container: format.mimeType?.split('/')[1]?.split(';')[0] || (isAudio ? 'm4a' : 'mp4'),
              type: 'adaptive'
            });
          }
        });
      }

      if (formats.length === 0) {
        return { success: false, error: 'No download URLs found in streaming data' };
      }

      // Sort formats by quality (highest first)
      formats.sort((a, b) => {
        if (a.hasVideo && b.hasVideo) {
          return (b.height || 0) - (a.height || 0);
        }
        if (a.hasAudio && b.hasAudio) {
          return (b.bitrate || 0) - (a.bitrate || 0);
        }
        return 0;
      });

      return {
        success: true,
        videoId: videoId,
        title: videoDetails?.title || 'YouTube Video',
        duration: videoDetails?.lengthSeconds ? parseInt(videoDetails.lengthSeconds) : null,
        thumbnail: videoDetails?.thumbnail?.thumbnails?.slice(-1)[0]?.url,
        formats: formats,
        extractedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('Error processing streaming data:', error);
      return { success: false, error: 'Failed to process streaming data' };
    }
  }

  /**
   * Get separate video and audio streams for muxing
   */
  async getSeparateStreams(url, quality = 'highest') {
    try {
      const extractionResult = await this.extractRealDownloadUrls(url);

      if (!extractionResult.success) {
        throw new Error(extractionResult.error);
      }

      const { formats } = extractionResult;

      // Find best video stream (without audio)
      let videoStream = null;
      let audioStream = null;

      if (quality === 'highest') {
        // Get highest quality video-only stream
        const videoOnlyFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
        videoStream = videoOnlyFormats.reduce((highest, current) => {
          return (current.height || 0) > (highest.height || 0) ? current : highest;
        }, videoOnlyFormats[0]);
      } else {
        // Specific video quality
        const requestedHeight = parseInt(quality.replace('p', ''));
        console.log(`🎯 Looking for separate ${requestedHeight}p video stream`);

        // Find exact quality video-only stream
        const videoOnlyFormats = formats.filter(f => f.hasVideo && !f.hasAudio);
        videoStream = videoOnlyFormats.find(f => f.height === requestedHeight) ||
                     videoOnlyFormats.find(f => f.qualityLabel === quality) ||
                     videoOnlyFormats.find(f => f.qualityLabel === `${requestedHeight}p`);

        // If exact not found, find closest
        if (!videoStream && videoOnlyFormats.length > 0) {
          videoStream = videoOnlyFormats.reduce((closest, current) => {
            const closestDiff = Math.abs((closest.height || 0) - requestedHeight);
            const currentDiff = Math.abs((current.height || 0) - requestedHeight);
            return currentDiff < closestDiff ? current : closest;
          });
          console.log(`🔄 Using closest video quality: ${videoStream.height}p instead of ${requestedHeight}p`);
        }
      }

      // Find best audio stream
      const audioOnlyFormats = formats.filter(f => f.hasAudio && !f.hasVideo);
      if (audioOnlyFormats.length > 0) {
        // Get highest bitrate audio
        audioStream = audioOnlyFormats.reduce((highest, current) => {
          return (current.bitrate || 0) > (highest.bitrate || 0) ? current : highest;
        });
      }

      if (!videoStream) {
        throw new Error('No video-only stream found for muxing');
      }

      if (!audioStream) {
        throw new Error('No audio-only stream found for muxing');
      }

      const videoQuality = videoStream.height ? `${videoStream.height}p` : videoStream.quality;
      const audioBitrate = audioStream.bitrate ? `${Math.round(audioStream.bitrate / 1000)}kbps` : audioStream.quality;

      console.log(`✅ Found separate streams - Video: ${videoQuality}, Audio: ${audioBitrate}`);

      return {
        success: true,
        videoStream: {
          url: videoStream.url,
          quality: videoQuality,
          height: videoStream.height,
          width: videoStream.width,
          fps: videoStream.fps,
          container: videoStream.container,
          filesize: videoStream.filesize
        },
        audioStream: {
          url: audioStream.url,
          quality: audioBitrate,
          bitrate: audioStream.bitrate,
          container: audioStream.container,
          filesize: audioStream.filesize
        },
        title: extractionResult.title,
        duration: extractionResult.duration
      };

    } catch (error) {
      console.error('Separate streams extraction failed:', error);
      throw error;
    }
  }

  /**
   * Get download URL for specific quality
   */
  async getDownloadUrl(url, quality = 'highest') {
    try {
      const extractionResult = await this.extractRealDownloadUrls(url);
      
      if (!extractionResult.success) {
        throw new Error(extractionResult.error);
      }

      const { formats } = extractionResult;
      
      // Find best format for requested quality
      let selectedFormat = null;
      
      if (quality === 'highest') {
        // Priority 1: Highest quality progressive format (video + audio) with compatible codec
        const progressiveFormats = formats.filter(f => f.hasVideo && f.hasAudio);
        if (progressiveFormats.length > 0) {
          // Prefer MP4 containers for better compatibility
          const mp4Formats = progressiveFormats.filter(f => f.container === 'mp4');
          const formatsToUse = mp4Formats.length > 0 ? mp4Formats : progressiveFormats;

          selectedFormat = formatsToUse.reduce((highest, current) => {
            return (current.height || 0) > (highest.height || 0) ? current : highest;
          });
          console.log(`✅ Found highest progressive format: ${selectedFormat.height}p with audio (${selectedFormat.container})`);
        } else {
          // Priority 2: Use muxing for highest quality video + best audio
          console.log(`🎬 No progressive formats available - will use muxing for highest quality`);
          throw new Error('highest_requires_muxing');
        }
      } else if (quality.includes('kbps') || quality === 'audio') {
        // Audio format
        selectedFormat = formats.find(f => f.hasAudio && !f.hasVideo) ||
                        formats.find(f => f.hasAudio);
      } else {
        // Specific video quality - PRIORITIZE AUDIO-INCLUDED FORMATS
        const requestedHeight = parseInt(quality.replace('p', ''));
        console.log(`🎯 Enhanced downloader looking for: ${requestedHeight}p WITH AUDIO`);

        // PRIORITY 1: Exact quality WITH audio (progressive format)
        selectedFormat = formats.find(f => f.height === requestedHeight && f.hasVideo && f.hasAudio);

        if (selectedFormat) {
          console.log(`✅ Found exact ${requestedHeight}p with audio (progressive format)`);
        } else {
          console.log(`⚠️ ${requestedHeight}p progressive format not available`);

          // PRIORITY 2: Check if exact quality exists without audio - prefer muxing over lower quality
          const exactQualityNoAudio = formats.find(f => f.height === requestedHeight && f.hasVideo && !f.hasAudio);

          if (exactQualityNoAudio) {
            console.log(`🎬 ${requestedHeight}p available without audio - triggering muxing for better quality`);
            throw new Error(`${requestedHeight}p_requires_muxing`);
          }

          // PRIORITY 3: Fallback to nearest available quality with audio (prefer MP4)
          const formatsWithAudio = formats.filter(f => f.hasVideo && f.hasAudio);

          if (formatsWithAudio.length > 0) {
            // Prefer MP4 containers for better compatibility
            const mp4FormatsWithAudio = formatsWithAudio.filter(f => f.container === 'mp4');
            const formatsToUse = mp4FormatsWithAudio.length > 0 ? mp4FormatsWithAudio : formatsWithAudio;

            // Find closest quality to requested
            selectedFormat = formatsToUse.reduce((closest, current) => {
              const closestDiff = Math.abs((closest.height || 0) - requestedHeight);
              const currentDiff = Math.abs((current.height || 0) - requestedHeight);
              return currentDiff < closestDiff ? current : closest;
            });

            const actualHeight = selectedFormat.height;
            console.log(`🔄 Fallback: Using closest available quality ${actualHeight}p with audio (${selectedFormat.container}) (requested ${requestedHeight}p not available)`);
          } else {
            // No progressive formats available - use muxing
            console.log(`🎬 No progressive formats available - will use muxing for ${requestedHeight}p`);
            throw new Error(`${requestedHeight}p_requires_muxing`);
          }
        }
      }

      if (!selectedFormat) {
        throw new Error(`No suitable format found for quality: ${quality}`);
      }

      // CRITICAL CHECK: Ensure selected format has audio for video downloads
      if (selectedFormat.hasVideo && !selectedFormat.hasAudio && !quality.includes('kbps')) {
        console.log(`🚨 Selected format has no audio - triggering muxing to ensure audio is included`);
        throw new Error(`selected_format_requires_muxing`);
      }

      // Enhanced logging with audio information
      const actualQuality = selectedFormat.height ? `${selectedFormat.height}p` : selectedFormat.quality;
      const requestedQuality = quality === 'highest' ? 'highest' : quality;

      if (actualQuality !== requestedQuality && requestedQuality !== 'highest') {
        console.log(`🔄 Quality adjusted: Requested ${requestedQuality} → Selected ${actualQuality} (${selectedFormat.container}) - Has Audio: ${selectedFormat.hasAudio}`);
      } else {
        console.log(`✅ Enhanced downloader selected: ${actualQuality} (${selectedFormat.container}) - Has Audio: ${selectedFormat.hasAudio}`);
      }

      return {
        success: true,
        downloadUrl: selectedFormat.url,
        format: selectedFormat,
        title: extractionResult.title,
        filesize: selectedFormat.filesize,
        actualQuality: actualQuality,
        requestedQuality: requestedQuality
      };

    } catch (error) {
      console.error('Download URL extraction failed:', error);
      throw error;
    }
  }

  /**
   * Stream download to response
   */
  async streamDownload(downloadUrl, res, filename, contentType) {
    const maxAttempts = 3;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🚀 Starting stream download (attempt ${attempt}/${maxAttempts}): ${filename}`);

        const response = await axios({
          method: 'GET',
          url: downloadUrl,
          responseType: 'stream',
          headers: {
            'User-Agent': this.getRandomUserAgent(),
            'Referer': 'https://www.youtube.com/'
          },
          timeout: 30000
        });

        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        if (response.headers['content-length']) {
          res.setHeader('Content-Length', response.headers['content-length']);
        }

        // Pipe the stream
        response.data.pipe(res);

        // Handle stream events
        response.data.on('end', () => {
          console.log(`✅ Download completed: ${filename}`);
        });

        response.data.on('error', (error) => {
          console.error(`❌ Stream error: ${error.message}`);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Download stream failed' });
          }
        });
        return;

      } catch (error) {
        const status = error.response?.status;
        console.error(`Stream attempt ${attempt} failed${status ? ' (HTTP ' + status + ')' : ''}:`, error.message);

        // Retry on 403/429/503 with jitter
        if ([403, 429, 503].includes(status) && attempt < maxAttempts) {
          const base = 3000 * attempt;
          const jitter = Math.floor(Math.random() * 1000);
          const wait = base + jitter;
          console.log(`⏳ Retrying in ${Math.round(wait/1000)}s...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }

        // Final fallback: 302 redirect to direct URL (lets browser fetch directly)
        if (!res.headersSent) {
          console.log('↪️ Falling back to 302 redirect to direct URL');
          res.status(302).setHeader('Location', downloadUrl);
          // Expose filename hint via header (some browsers may ignore on redirect)
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.end();
        }
        return;
      }
    }
  }
}

module.exports = new YouTubeDownloader();
