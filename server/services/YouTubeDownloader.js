const axios = require('axios');
const fs = require('fs');
const path = require('path');

/**
 * Enhanced YouTube Downloader that bypasses rate limits
 * Uses multiple strategies to extract real download URLs
 */
class YouTubeDownloader {
  constructor() {
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/120.0'
    ];
    
    this.apiKeys = [
      'AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8',
      'AIzaSyB-63vPrdThhKuerbB2N_l7Kwwcxj6yUAc',
      'AIzaSyC9XL3ZjWddXya6X74dJoCTL-WEYFDNX30'
    ];
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

    // Method 2: YouTube embed extraction
    const method2Result = await this.tryEmbedExtraction(videoId);
    if (method2Result.success) {
      console.log('✅ Method 2 (Embed) successful');
      return method2Result;
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

    throw new Error('All extraction methods failed - video may be restricted');
  }

  /**
   * Method 1: YouTube internal API
   */
  async tryInternalApi(videoId) {
    try {
      const apiKey = this.getRandomApiKey();
      const playerUrl = `https://www.youtube.com/youtubei/v1/player?key=${apiKey}`;
      
      const payload = {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20231201.01.00',
            clientFormFactor: 'DESKTOP'
          }
        },
        videoId: videoId,
        playbackContext: {
          contentPlaybackContext: {
            signatureTimestamp: Math.floor(Date.now() / 1000)
          }
        }
      };

      const response = await axios.post(playerUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': this.getRandomUserAgent(),
          'X-YouTube-Client-Name': '1',
          'X-YouTube-Client-Version': '2.20231201.01.00'
        },
        timeout: 10000
      });

      const data = response.data;
      if (data.streamingData && (data.streamingData.formats || data.streamingData.adaptiveFormats)) {
        return this.processStreamingData(data, videoId);
      }

      return { success: false, error: 'No streaming data found' };
    } catch (error) {
      console.log(`❌ Internal API failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 2: Embed extraction
   */
  async tryEmbedExtraction(videoId) {
    try {
      const embedUrl = `https://www.youtube.com/embed/${videoId}`;
      const response = await axios.get(embedUrl, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Referer': 'https://www.youtube.com/'
        },
        timeout: 10000
      });

      // Extract player config from embed page
      const playerConfigMatch = response.data.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
      if (playerConfigMatch) {
        const playerData = JSON.parse(playerConfigMatch[1]);
        if (playerData.streamingData) {
          return this.processStreamingData(playerData, videoId);
        }
      }

      return { success: false, error: 'No player config found in embed' };
    } catch (error) {
      console.log(`❌ Embed extraction failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 3: Alternative API (using public endpoints)
   */
  async tryAlternativeApi(videoId) {
    try {
      // Use a lightweight API endpoint
      const apiUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await axios.get(apiUrl, {
        headers: { 'User-Agent': this.getRandomUserAgent() },
        timeout: 8000
      });

      // This gives us basic info, we need to get streaming data separately
      if (response.data && response.data.title) {
        // Try to get actual streams using a different approach
        const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
        return await this.tryDirectScraping(watchUrl);
      }

      return { success: false, error: 'OEmbed API failed' };
    } catch (error) {
      console.log(`❌ Alternative API failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Method 4: Direct page scraping
   */
  async tryDirectScraping(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.getRandomUserAgent(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none'
        },
        timeout: 15000
      });

      // Extract player response from page
      const playerResponseMatch = response.data.match(/var ytInitialPlayerResponse = ({.+?});/);
      if (playerResponseMatch) {
        const playerData = JSON.parse(playerResponseMatch[1]);
        if (playerData.streamingData) {
          return this.processStreamingData(playerData, url.match(/v=([^&]+)/)?.[1]);
        }
      }

      return { success: false, error: 'No streaming data in page source' };
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
        // Get highest quality progressive format (video + audio)
        selectedFormat = formats.find(f => f.hasVideo && f.hasAudio) || formats[0];
      } else if (quality.includes('kbps') || quality === 'audio') {
        // Audio format
        selectedFormat = formats.find(f => f.hasAudio && !f.hasVideo) || 
                        formats.find(f => f.hasAudio);
      } else {
        // Specific video quality
        const requestedHeight = parseInt(quality.replace('p', ''));
        selectedFormat = formats.find(f => f.height === requestedHeight && f.hasVideo && f.hasAudio) ||
                        formats.find(f => f.height === requestedHeight && f.hasVideo) ||
                        formats.find(f => f.hasVideo && f.hasAudio);
      }

      if (!selectedFormat) {
        throw new Error(`No format found for quality: ${quality}`);
      }

      console.log(`✅ Selected format: ${selectedFormat.quality} (${selectedFormat.container})`);
      
      return {
        success: true,
        downloadUrl: selectedFormat.url,
        format: selectedFormat,
        title: extractionResult.title,
        filesize: selectedFormat.filesize
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
    try {
      console.log(`🚀 Starting stream download: ${filename}`);
      
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

    } catch (error) {
      console.error('Stream download failed:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream download' });
      }
    }
  }
}

module.exports = new YouTubeDownloader();
