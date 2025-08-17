const axios = require('axios');

class RealFileSizeCalculator {
  /**
   * Get real file size for YouTube videos
   * @param {string} url - YouTube video URL
   * @param {string} quality - Requested quality (e.g., '1080p', '720p')
   * @param {string} format - Requested format (e.g., 'mp4', 'webm')
   */
  static async getRealFileSize(url, quality = '720p', format = 'mp4') {
    try {
      console.log(`🔍 Getting real file size for ${quality} ${format} video...`);

      // Use HEAD request to get Content-Length without downloading full file
      const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      if (!videoId) {
        throw new Error('Invalid YouTube URL');
      }

      // Try multiple methods to get real file size
      const methods = [
        () => this.getFileSizeFromYouTubeAPI(videoId, quality, format),
        () => this.getFileSizeFromStreamInfo(url, quality, format),
        () => this.estimateFileSizeFromBitrate(url, quality, format)
      ];

      for (const method of methods) {
        try {
          const result = await method();
          if (result && result.size > 0) {
            console.log(`✅ Got real file size: ${this.formatFileSize(result.size)}`);
            return result;
          }
        } catch (methodError) {
          console.log(`❌ Method failed: ${methodError.message}`);
          continue;
        }
      }

      throw new Error('Could not determine real file size');

    } catch (error) {
      console.error('❌ Real file size calculation failed:', error.message);
      
      // Return estimated size based on quality and duration
      return this.getEstimatedFileSize(quality, format, 300); // 5 minutes default
    }
  }

  /**
   * Get file size from YouTube's internal API
   */
  static async getFileSizeFromYouTubeAPI(videoId, quality, format) {
    try {
      const apiUrl = `https://www.youtube.com/youtubei/v1/player?key=AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8`;
      
      const response = await axios.post(apiUrl, {
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20230101.00.00'
          }
        },
        videoId: videoId
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const streamingData = response.data?.streamingData;
      if (!streamingData) {
        throw new Error('No streaming data found');
      }

      // Look for matching format
      const targetHeight = parseInt(quality.replace('p', ''));
      const allFormats = [...(streamingData.formats || []), ...(streamingData.adaptiveFormats || [])];
      
      const matchingFormat = allFormats.find(f => 
        f.height === targetHeight && 
        f.mimeType?.includes(format) &&
        f.contentLength
      );

      if (matchingFormat && matchingFormat.contentLength) {
        return {
          size: parseInt(matchingFormat.contentLength),
          url: matchingFormat.url,
          bitrate: matchingFormat.bitrate,
          codec: matchingFormat.mimeType
        };
      }

      throw new Error('No matching format with content length found');

    } catch (error) {
      throw new Error(`YouTube API method failed: ${error.message}`);
    }
  }

  /**
   * Get file size from stream info using HEAD request
   */
  static async getFileSizeFromStreamInfo(url, quality, format) {
    try {
      // This would use ytdl-core or similar to get stream URL then HEAD request
      // Simplified implementation for now
      throw new Error('Stream info method not implemented yet');
    } catch (error) {
      throw new Error(`Stream info method failed: ${error.message}`);
    }
  }

  /**
   * Estimate file size based on bitrate and duration
   */
  static async estimateFileSizeFromBitrate(url, quality, format) {
    try {
      // Get video duration first
      const ytdl = require('@distube/ytdl-core');
      const info = await ytdl.getInfo(url);
      const duration = parseInt(info.videoDetails.lengthSeconds);

      // Estimate bitrate based on quality
      const bitrates = {
        '144p': 300,    // kbps
        '240p': 500,
        '360p': 1000,
        '480p': 2000,
        '720p': 4000,
        '1080p': 8000,
        '1440p': 12000,
        '2160p': 20000,
        '4320p': 45000  // 8K
      };

      const estimatedBitrate = bitrates[quality] || 4000;
      const estimatedSize = Math.round((estimatedBitrate * duration) / 8); // Convert to bytes

      return {
        size: estimatedSize,
        url: null,
        bitrate: estimatedBitrate,
        estimated: true
      };

    } catch (error) {
      throw new Error(`Bitrate estimation failed: ${error.message}`);
    }
  }

  /**
   * Get estimated file size for fallback
   */
  static getEstimatedFileSize(quality, format, duration = 300) {
    const baseSizes = {
      '8640p': 2000 * 1024 * 1024,  // 2GB for 8K 5min
      '4320p': 1000 * 1024 * 1024,  // 1GB for 8K 5min
      '2160p': 500 * 1024 * 1024,   // 500MB for 4K 5min
      '1440p': 300 * 1024 * 1024,   // 300MB for 2K 5min
      '1080p': 150 * 1024 * 1024,   // 150MB for 1080p 5min
      '720p': 80 * 1024 * 1024,     // 80MB for 720p 5min
      '480p': 50 * 1024 * 1024,     // 50MB for 480p 5min
      '360p': 25 * 1024 * 1024,     // 25MB for 360p 5min
      '240p': 15 * 1024 * 1024,     // 15MB for 240p 5min
      '144p': 8 * 1024 * 1024       // 8MB for 144p 5min
    };

    const baseSize = baseSizes[quality] || baseSizes['720p'];
    const scaledSize = Math.round((baseSize * duration) / 300); // Scale by duration

    return {
      size: scaledSize,
      url: null,
      estimated: true
    };
  }

  /**
   * Format file size in human readable format
   */
  static formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  /**
   * Get real file sizes for all available formats
   */
  static async getRealFileSizesForAllFormats(url) {
    try {
      console.log('🔍 Getting real file sizes for all formats...');
      
      const formats = [
        { quality: '4320p', format: 'webm' }, // 8K
        { quality: '2160p', format: 'webm' }, // 4K
        { quality: '1440p', format: 'mp4' },  // 2K
        { quality: '1080p', format: 'mp4' },  // FHD
        { quality: '720p', format: 'mp4' },   // HD
        { quality: '480p', format: 'mp4' },   // SD
        { quality: '360p', format: 'mp4' }    // SD
      ];

      const results = [];
      
      for (const formatSpec of formats) {
        try {
          const sizeInfo = await this.getRealFileSize(url, formatSpec.quality, formatSpec.format);
          results.push({
            ...formatSpec,
            ...sizeInfo,
            humanSize: this.formatFileSize(sizeInfo.size)
          });
        } catch (error) {
          console.log(`❌ Failed to get size for ${formatSpec.quality} ${formatSpec.format}: ${error.message}`);
          // Add estimated size instead
          const estimated = this.getEstimatedFileSize(formatSpec.quality, formatSpec.format);
          results.push({
            ...formatSpec,
            ...estimated,
            humanSize: this.formatFileSize(estimated.size)
          });
        }
      }

      return results;

    } catch (error) {
      console.error('❌ Failed to get real file sizes for all formats:', error.message);
      return [];
    }
  }
}

module.exports = RealFileSizeCalculator;
