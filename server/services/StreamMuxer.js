const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const axios = require('axios');
const stream = require('stream');
const { promisify } = require('util');

// Set FFmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

/**
 * Real-time stream muxer for combining video and audio streams
 * Combines separate YouTube video-only and audio-only streams into single file
 */
class StreamMuxer {
  constructor() {
    this.activeProcesses = new Map();
    this.maxConcurrentProcesses = 3;
  }

  /**
   * Check if FFmpeg is available
   */
  async checkFFmpegAvailability() {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('❌ FFmpeg not available:', err.message);
          resolve(false);
        } else {
          console.log('✅ FFmpeg is available and ready');
          resolve(true);
        }
      });
    });
  }

  /**
   * Combine video and audio streams in real-time
   */
  async combineStreams(videoUrl, audioUrl, outputOptions = {}) {
    const processId = Date.now() + Math.random().toString(36).substr(2, 9);
    
    try {
      // Check concurrent process limit
      if (this.activeProcesses.size >= this.maxConcurrentProcesses) {
        throw new Error('Maximum concurrent muxing processes reached. Please try again in a moment.');
      }

      const {
        format = 'mp4',
        quality = 'best',
        videoCodec = 'copy', // Use 'copy' to avoid re-encoding (faster)
        audioCodec = 'aac', // Force AAC for maximum compatibility (instead of copy)
        filename = 'video.mp4'
      } = outputOptions;

      console.log(`🎬 Starting stream muxing (ID: ${processId})`);
      console.log(`📹 Video URL: ${videoUrl.substring(0, 50)}...`);
      console.log(`🔊 Audio URL: ${audioUrl.substring(0, 50)}...`);

      // Create output stream
      const outputStream = new stream.PassThrough();

      // Configure FFmpeg command using direct URLs (more reliable than streams)
      const ffmpegCommand = ffmpeg()
        .input(videoUrl)
        .inputOptions(['-headers', `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`])
        .input(audioUrl)
        .inputOptions(['-headers', `User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36`])
        .videoCodec(videoCodec)
        .audioCodec(audioCodec)
        .format(format)
        .outputOptions([
          '-map', '0:v:0', // Map video from first input
          '-map', '1:a:0', // Map audio from second input
          '-movflags', 'frag_keyframe+empty_moov', // Enable streaming
          '-fflags', '+genpts', // Generate presentation timestamps
          '-avoid_negative_ts', 'make_zero', // Handle timing issues
          '-shortest', // End when shortest stream ends
          // Audio compatibility options for better media player support
          '-c:a', 'aac', // Force AAC audio codec
          '-b:a', '128k', // Set audio bitrate for compatibility
          '-ar', '44100', // Set standard audio sample rate
          '-ac', '2' // Force stereo audio
        ]);

      // Add to active processes
      this.activeProcesses.set(processId, {
        command: ffmpegCommand,
        startTime: Date.now(),
        filename: filename
      });

      return new Promise((resolve, reject) => {
        let hasError = false;
        let outputStarted = false;
        let resolved = false;

        // Set timeout to prevent hanging (longer for high quality videos)
        const timeout = setTimeout(() => {
          if (!resolved && !hasError) {
            hasError = true;
            console.error(`⏰ FFmpeg timeout (${processId}) after 5 minutes`);
            this.activeProcesses.delete(processId);
            this.cleanup(outputStream);

            // Kill FFmpeg process
            if (ffmpegCommand) {
              ffmpegCommand.kill('SIGKILL');
            }

            reject(new Error('Stream muxing timeout after 5 minutes - video may be too large'));
          }
        }, 300000); // 5 minute timeout for high quality videos

        // Handle FFmpeg events
        ffmpegCommand
          .on('start', (commandLine) => {
            console.log(`🚀 FFmpeg started: ${commandLine.substring(0, 100)}...`);
          })
          .on('progress', (progress) => {
            if (progress.percent) {
              console.log(`⏳ Muxing progress: ${Math.round(progress.percent)}% - Time: ${progress.timemark || 'N/A'}`);
            } else if (progress.timemark) {
              console.log(`⏳ Muxing in progress - Time: ${progress.timemark}`);
            }
          })
          .on('error', (error) => {
            if (!hasError) {
              hasError = true;
              console.error(`❌ FFmpeg error (${processId}):`, error.message);
              this.activeProcesses.delete(processId);

              // Clear timeout
              clearTimeout(timeout);

              // Cleanup output stream
              this.cleanup(outputStream);

              reject(new Error(`Stream muxing failed: ${error.message}`));
            }
          })
          .on('end', () => {
            console.log(`✅ Stream muxing completed (${processId})`);
            this.activeProcesses.delete(processId);

            // Clear timeout
            clearTimeout(timeout);

            if (!outputStarted && outputStream) {
              outputStream.end();
            }
          });

        // Pipe output to PassThrough stream
        ffmpegCommand.pipe(outputStream, { end: true });

        // Handle output stream events
        outputStream.on('pipe', () => {
          outputStarted = true;
          console.log(`📤 Output stream started (${processId})`);
        });

        outputStream.on('error', (error) => {
          if (!hasError) {
            hasError = true;
            console.error(`❌ Output stream error (${processId}):`, error.message);
            this.activeProcesses.delete(processId);
            clearTimeout(timeout);
            reject(error);
          }
        });

        // Return output stream immediately for piping to response
        if (!resolved) {
          resolved = true;
          resolve({
            stream: outputStream,
            processId: processId,
            cleanup: () => {
              clearTimeout(timeout);
              this.cleanup(outputStream);
              if (this.activeProcesses.has(processId)) {
                const process = this.activeProcesses.get(processId);
                if (process.command) {
                  process.command.kill('SIGKILL');
                }
                this.activeProcesses.delete(processId);
              }
            }
          });
        }
      });

    } catch (error) {
      console.error(`❌ Stream muxing setup failed (${processId}):`, error.message);
      this.activeProcesses.delete(processId);
      throw error;
    }
  }

  /**
   * Create input stream from URL with retry logic
   */
  async createInputStream(url, type) {
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📥 Creating ${type} input stream (attempt ${attempt}/${maxRetries})`);
        
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Referer': 'https://www.youtube.com/',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          },
          timeout: 30000
        });

        console.log(`✅ ${type} input stream created successfully`);
        return response.data;

      } catch (error) {
        console.log(`⚠️ ${type} stream attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to create ${type} input stream after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.pow(2, attempt) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Cleanup streams and resources
   */
  cleanup(...streams) {
    streams.forEach(stream => {
      if (stream && typeof stream.destroy === 'function') {
        try {
          stream.destroy();
        } catch (error) {
          console.warn('⚠️ Error cleaning up stream:', error.message);
        }
      }
    });
  }

  /**
   * Get active processes info
   */
  getActiveProcesses() {
    const processes = [];
    for (const [id, process] of this.activeProcesses.entries()) {
      processes.push({
        id: id,
        filename: process.filename,
        duration: Date.now() - process.startTime,
        startTime: new Date(process.startTime).toISOString()
      });
    }
    return processes;
  }

  /**
   * Kill all active processes (for cleanup)
   */
  killAllProcesses() {
    console.log(`🛑 Killing ${this.activeProcesses.size} active muxing processes...`);
    
    for (const [id, process] of this.activeProcesses.entries()) {
      try {
        if (process.command) {
          process.command.kill('SIGKILL');
        }
      } catch (error) {
        console.warn(`⚠️ Error killing process ${id}:`, error.message);
      }
    }
    
    this.activeProcesses.clear();
    console.log('✅ All muxing processes killed');
  }

  /**
   * Find best audio format to pair with video format
   */
  findBestAudioFormat(audioFormats, preferredBitrate = null) {
    if (!audioFormats || audioFormats.length === 0) {
      return null;
    }

    // Sort by bitrate descending (highest quality first)
    const sortedAudio = audioFormats
      .filter(f => f.hasAudio && !f.hasVideo)
      .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

    if (preferredBitrate) {
      // Try to find exact bitrate match
      const exactMatch = sortedAudio.find(f => f.bitrate === preferredBitrate);
      if (exactMatch) return exactMatch;
    }

    // Return highest quality audio format
    return sortedAudio[0] || null;
  }

  /**
   * Estimate muxing duration based on video length
   */
  estimateMuxingDuration(videoDurationSeconds) {
    // Rough estimate: muxing takes about 1/10th of video duration (very fast with copy codecs)
    const estimatedSeconds = Math.max(5, Math.ceil(videoDurationSeconds / 10));
    return estimatedSeconds;
  }
}

// Export singleton instance
module.exports = new StreamMuxer();
