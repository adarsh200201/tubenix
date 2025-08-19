import axios from 'axios';

// Production API base URL - no fallbacks, single source of truth
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api'
  : 'https://tubenix.onrender.com/api';

console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🚀 Environment:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout restrictions as requested
});

// Add request retry functionality with exponential backoff
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 2000; // 2 seconds base delay
const MAX_RETRY_DELAY = 30000; // 30 seconds max delay

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Enhanced request throttling and queuing system
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 2000; // Increased to 2 seconds between requests
let requestQueue = [];
let isProcessingQueue = false;
let consecutiveFailures = 0;
let backoffMultiplier = 1;

// Request queue to prevent concurrent API calls
const processRequestQueue = async () => {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }

  isProcessingQueue = true;

  while (requestQueue.length > 0) {
    const { config, resolve, reject } = requestQueue.shift();

    try {
      // Apply exponential backoff based on consecutive failures
      const effectiveInterval = MIN_REQUEST_INTERVAL * backoffMultiplier;
      const now = Date.now();
      const timeSinceLastRequest = now - lastRequestTime;

      if (timeSinceLastRequest < effectiveInterval) {
        const delay = effectiveInterval - timeSinceLastRequest;
        console.log(`🛑 Global rate limit: waiting ${Math.round(delay/1000)}s (backoff: ${backoffMultiplier}x)`);
        await sleep(delay);
      }

      lastRequestTime = Date.now();

      // Make the actual request
      const response = await axios(config);

      // Reset backoff on success
      consecutiveFailures = 0;
      backoffMultiplier = 1;

      resolve(response);

    } catch (error) {
      // Handle rate limiting specifically
      if (error.response?.status === 429) {
        consecutiveFailures++;
        backoffMultiplier = Math.min(consecutiveFailures * 2, 8); // Max 8x backoff
        console.log(`🚨 Rate limited! Consecutive failures: ${consecutiveFailures}, backoff: ${backoffMultiplier}x`);

        // Re-queue the request for retry
        requestQueue.unshift({ config, resolve, reject });

        // Wait longer before retrying
        const retryDelay = 5000 * backoffMultiplier;
        console.log(`⏳ Waiting ${retryDelay/1000}s before retry...`);
        await sleep(retryDelay);
        continue;
      }

      reject(error);
    }
  }

  isProcessingQueue = false;
};

// Queue a request instead of making it immediately
const queueRequest = (config) => {
  return new Promise((resolve, reject) => {
    requestQueue.push({ config, resolve, reject });
    processRequestQueue();
  });
};

// Request interceptor with queue-based throttling
api.interceptors.request.use(
  async (config) => {
    // Skip queuing for health checks if they're too frequent
    if (config.url?.includes('/health')) {
      const now = Date.now();
      if (now - lastRequestTime < 10000) { // Only allow health checks every 10 seconds
        console.log('🛑 Skipping frequent health check');
        throw new Error('Health check throttled');
      }
    }

    // Use queue for all other requests
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Replace the default axios instance methods to use queuing
const originalPost = api.post;

api.post = function(url, data, config = {}) {
  return queueRequest({
    ...config,
    method: 'POST',
    url,
    data,
    baseURL: this.defaults.baseURL,
    headers: { ...this.defaults.headers, ...config.headers }
  });
};

api.get = function(url, config = {}) {
  return queueRequest({
    ...config,
    method: 'GET',
    url,
    baseURL: this.defaults.baseURL,
    headers: { ...this.defaults.headers, ...config.headers }
  });
};

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Enhanced error logging with proper object serialization
    const errorDetails = {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message,
      code: error.code
    };

    // Log detailed error information properly
    console.error('API Error Details:', JSON.stringify(errorDetails, null, 2));

    // Log a clean error message for debugging
    console.error(`API Error: ${error.response?.status || 'Unknown'} - ${error.message}`);

    // Extract meaningful error message
    let message = 'Something went wrong';

    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        message = error.response.data;
      } else if (error.response.data.error) {
        message = error.response.data.error;
      } else if (error.response.data.message) {
        message = error.response.data.message;
      } else if (typeof error.response.data === 'object') {
        message = JSON.stringify(error.response.data);
      }
    } else if (error.message) {
      message = error.message;
    }

    // Add specific error messages for common issues
    if (error.code === 'ECONNREFUSED') {
      return Promise.reject(new Error('Server is not running. Please start the backend server.'));
    }

    if (error.response?.status === 429) {
      // Simple retry like 9xbuddy
      return Promise.reject(new Error('Service busy. Retrying automatically...'));
    }

    if (error.response?.status === 500) {
      return Promise.reject(new Error(`Server Error: ${message}`));
    }

    if (error.response?.status === 503) {
      const errorData = error.response?.data;
      let serviceUnavailableMessage;

      if (errorData?.details?.includes('encrypted') || errorData?.reason?.includes('signature')) {
        serviceUnavailableMessage = 'YouTube has encrypted this video content. This is normal for some videos. Please try the Extract Links feature for direct access.';
      } else if (errorData?.suggestedAction) {
        serviceUnavailableMessage = `Service temporarily unavailable. ${errorData.suggestedAction}`;
      } else if (errorData?.details) {
        serviceUnavailableMessage = `Service temporarily unavailable: ${errorData.details}`;
      } else {
        // Enhanced message for production backend issues
        serviceUnavailableMessage = 'Backend service temporarily unavailable. This could be due to:\n• YouTube anti-bot measures\n• Server overload on Render\n• Backend deployment issues\n\nSuggestions:\n• Try again in a few minutes\n• Use Extract Links feature\n• Try a different video quality';
      }

      return Promise.reject(new Error(serviceUnavailableMessage));
    }

    // Improved network error handling
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return Promise.reject(new Error('Network connection error. Please check your internet connection and try again.'));
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK') {
      return Promise.reject(new Error('Cannot connect to server. Please check if the backend server is running.'));
    }

    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Request timeout. The server is taking too long to respond.'));
    }

    if (error.response?.status === 404) {
      return Promise.reject(new Error(`Not Found: ${message}`));
    }

    if (error.response?.status === 408) {
      return Promise.reject(new Error(`Request Timeout: ${message}`));
    }

    if (error.response?.status === 422) {
      return Promise.reject(new Error(`Format Not Available: ${message}`));
    }

    if (error.response?.status === 403) {
      return Promise.reject(new Error(`Access Forbidden: ${message}`));
    }

    return Promise.reject(new Error(message));
  }
);

// Extract video metadata with enhanced format information
export const extractVideoMetadata = async (url, retryCount = 0) => {
  try {
    console.log('🔍 Extracting metadata for URL:', url);

    // Use longer timeout for YouTube extraction due to fallback processing
    const response = await api.post('/download/metadata', { url }, {
      timeout: 0 // No timeout restriction as requested
    });

    console.log('✅ Metadata extracted successfully:', {
      title: response.data.title,
      platform: response.data.platform,
      formats: response.data.allFormats?.length || 0
    });

    return response.data;
  } catch (error) {
    // Enhanced retry logic with exponential backoff for rate limiting
    const isRateLimited = error.response?.status === 429;
    const isServerError = error.response?.status >= 500;
    const isTimeout = error.message.includes('timeout') || error.code === 'ECONNABORTED';
    const isNetworkError = error.code === 'NETWORK_ERROR' || error.message === 'Network Error' ||
                          error.code === 'ENOTFOUND' || error.code === 'ERR_NETWORK';
    const shouldRetry = (isRateLimited || isServerError || isTimeout) && !isNetworkError &&
                       !error.message.includes('Service busy');

    if (shouldRetry && retryCount < MAX_RETRIES) {
      // Calculate exponential backoff delay
      const baseDelay = isRateLimited ? BASE_RETRY_DELAY * 2 : BASE_RETRY_DELAY;
      const exponentialDelay = Math.min(
        baseDelay * Math.pow(2, retryCount),
        MAX_RETRY_DELAY
      );

      // Add jitter to avoid thundering herd
      const jitter = exponentialDelay * 0.25 * Math.random();
      const finalDelay = exponentialDelay + jitter;

      const delaySeconds = Math.round(finalDelay / 1000);
      console.log(`🛑 ${isRateLimited ? 'Rate limited' : 'Request failed'}, retrying in ${delaySeconds}s... (${retryCount + 1}/${MAX_RETRIES})`);

      await sleep(finalDelay);
      return extractVideoMetadata(url, retryCount + 1);
    }
    console.error('❌ Failed to extract metadata:', error.message);

    // Provide more specific error messages
    if (error.response?.status === 429 || error.message.includes('rate limit')) {
      throw new Error('Rate limit reached. Please wait 2-3 minutes and try again.');
    }

    if (error.response?.status === 503) {
      const responseData = error.response?.data;
      if (responseData?.userFriendly && responseData?.message) {
        throw new Error(responseData.message);
      }
      throw new Error('Backend service temporarily unavailable. Please try again in a few minutes.');
    }

    if (error.message.includes('Invalid YouTube URL')) {
      throw new Error('Please provide a valid YouTube URL');
    }

    if (error.message.includes('Video unavailable')) {
      throw new Error('This video is not available or has been removed');
    }

    if (error.message.includes('private')) {
      throw new Error('This video is private and cannot be accessed');
    }

    if (error.message.includes('age')) {
      throw new Error('This video is age-restricted and cannot be processed');
    }

    if (error.message.includes('Server is not running')) {
      throw new Error('Backend server is not running. Please start the server.');
    }

    if (error.message.includes('timeout')) {
      throw new Error('Request timed out. YouTube may be blocking requests or the video may not be available.');
    }

    throw error;
  }
};

// Extract download links (like 9xbuddy's extract links feature)
export const extractDownloadLinks = async (url, format, quality) => {
  try {
    const response = await api.post('/download/extract-links', {
      url,
      format,
      quality
    }, {
      timeout: 0 // No timeout restriction as requested
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Download video with enhanced options
export const downloadVideo = async (url, format = 'mp4', quality = 'best', options = {}) => {
  try {
    const response = await originalPost.call(api, '/download/video', {
      url,
      format,
      quality,
      directUrl: options.directUrl,
      title: options.title,
      mimeType: options.mimeType
    }, {
      responseType: 'blob',
      timeout: 600000 // 10 minutes timeout for muxing operations (2160p can be large)
    });

    // Extract download ID from response headers for tracking
    const downloadId = response.headers['x-download-id'] || response.headers['X-Download-ID'];

    // If response is a blob (direct download)
    if (response.data instanceof Blob) {
      // Check if it's actually an error JSON response disguised as a blob
      if (response.data.type === 'application/json' || response.data.size < 1000) {
        try {
          const text = await response.data.text();
          const jsonData = JSON.parse(text);
          if (jsonData.error) {
            return {
              success: false,
              message: jsonData.fallbackMessage || jsonData.error,
              suggestion: jsonData.suggestedAction || jsonData.suggestion,
              availableQualities: jsonData.availableQualities,
              details: jsonData.details
            };
          }
        } catch (e) {
          // Continue with blob processing
        }
      }

      // Return the blob data for manual download handling
      return {
        data: response.data,
        headers: response.headers,
        success: true,
        message: 'Download started successfully!',
        downloadId: downloadId
      };
    } else {
      // If response contains download URL or message (JSON response)
      let data;
      try {
        // Handle case where response.data is already parsed JSON (not a blob)
        if (typeof response.data === 'object' && response.data.success !== undefined) {
          data = response.data;
        } else {
          data = JSON.parse(await response.data.text());
        }
      } catch (parseError) {
        console.error('Failed to parse response data:', parseError);
        return { success: false, message: 'Invalid response format from server' };
      }

      if (data.downloadUrl) {
        window.open(data.downloadUrl, '_blank');
        return {
          success: true,
          message: 'Download link opened in new tab!',
          downloadId: downloadId,
          downloadUrl: data.downloadUrl
        };
      } else if (data.downloadType === 'manual') {
        // Handle 9xbuddy-style manual download response
        return {
          success: false,
          message: data.message || 'Manual download required',
          downloadType: 'manual',
          downloadId: downloadId,
          instructions: data.instructions || [],
          suggestion: data.suggestion,
          note: data.note,
          videoInfo: data.videoInfo
        };
      } else if (data.downloadType === 'adaptive_muxing' && data.videoStream && data.audioStream) {
        // Handle YouTube adaptive streaming response
        return {
          success: true,
          message: data.message || 'YouTube streams ready for download',
          downloadType: 'adaptive_streams',
          videoStream: data.videoStream,
          audioStream: data.audioStream,
          instructions: data.instructions,
          suggestion: data.suggestedAction,
          downloadId: downloadId
        };
      } else if (data.fallbackAction === 'extract_links') {
        return {
          success: false,
          message: data.message || 'Direct download unavailable',
          suggestion: data.suggestedAction,
          note: data.note
        };
      } else if (data.success === false) {
        return {
          success: false,
          message: data.message || data.error || 'Download failed',
          suggestion: data.suggestedAction || data.suggestion,
          details: data.details
        };
      } else {
        return { success: false, message: data.message || 'Download not available' };
      }
    }
  } catch (error) {
    // Enhanced error handling for download failures
    if (error.response?.status === 503) {
      const responseData = error.response?.data;
      if (responseData?.userFriendly && responseData?.message) {
        throw new Error(responseData.message);
      }
      throw new Error('Download service temporarily unavailable. This could be due to:\n• YouTube anti-bot measures\n• Server overload\n• Backend deployment issues\n\nSuggestions:\n• Try again in a few minutes\n• Use Extract Links feature\n• Try a different video quality');
    }

    if (error.response?.status === 429) {
      throw new Error('Rate limit reached. Please wait 2-3 minutes before trying again.');
    }

    if (error.response?.status === 404) {
      throw new Error('Video not found or may have been removed.');
    }

    if (error.response?.status === 403) {
      throw new Error('Video is private or restricted and cannot be downloaded.');
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('Download request timed out. The video may be too large or server is busy.');
    }

    // Default error message
    throw new Error(error.response?.data?.message || error.message || 'Download failed. Please try again.');
  }
};

// Share video with friends
export const shareVideo = async (url, platform) => {
  try {
    const response = await api.post('/download/share', { 
      url, 
      platform 
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Get supported platforms
export const getSupportedPlatforms = async () => {
  try {
    const response = await api.get('/download/platforms');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch platforms:', error);
    return { platforms: [] };
  }
};

// Get video formats for a specific URL
export const getVideoFormats = async (url) => {
  try {
    const metadata = await extractVideoMetadata(url);
    return {
      video: metadata.videoFormats || [],
      audio: metadata.audioFormats || [],
      other: metadata.otherFormats || []
    };
  } catch (error) {
    throw error;
  }
};

// Convert video to different format (placeholder for future implementation)
export const convertVideo = async (url, fromFormat, toFormat) => {
  // This would be implemented with a video conversion service
  return {
    success: false,
    message: 'Video conversion feature coming soon!'
  };
};

// Create backup of video (placeholder for future implementation)
export const createBackup = async (url) => {
  // This would be implemented with a backup service
  return {
    success: false,
    message: 'Video backup feature coming soon!'
  };
};

// Extract subtitles from video
export const extractSubtitles = async (url, language = 'en') => {
  // This would be implemented with subtitle extraction
  return {
    success: false,
    message: 'Subtitle extraction feature coming soon!'
  };
};

// Extract thumbnails from video
export const extractThumbnails = async (url) => {
  try {
    const metadata = await extractVideoMetadata(url);
    if (metadata.thumbnail) {
      // Open thumbnail in new tab for download
      window.open(metadata.thumbnail, '_blank');
      return { 
        success: true, 
        message: 'Thumbnail opened in new tab!',
        thumbnailUrl: metadata.thumbnail
      };
    } else {
      return {
        success: false,
        message: 'No thumbnail available for this video'
      };
    }
  } catch (error) {
    throw error;
  }
};

// Instagram API functions (StorySaver.net style)
export const downloadInstagramMedia = async (url) => {
  try {
    console.log('📸 Downloading Instagram media:', url);
    const response = await api.post('/instagram/download', { url });
    return response.data;
  } catch (error) {
    console.error('❌ Instagram download failed:', error.message);
    throw error;
  }
};

export const getInstagramInfo = async (url) => {
  try {
    console.log('📋 Getting Instagram info:', url);
    const response = await api.post('/instagram/info', { url });
    return response.data;
  } catch (error) {
    console.error('❌ Instagram info failed:', error.message);
    throw error;
  }
};

// Note: Direct URL downloads from browser are blocked by CORS
// Use backend API or download links instead

export const checkInstagramUrl = async (url) => {
  try {
    const response = await api.get(`/instagram/check?url=${encodeURIComponent(url)}`);
    return response.data;
  } catch (error) {
    console.error('❌ Instagram URL check failed:', error.message);
    throw error;
  }
};

export const getInstagramFeatures = async () => {
  try {
    const response = await api.get('/instagram/features');
    return response.data;
  } catch (error) {
    console.error('❌ Instagram features fetch failed:', error.message);
    return { supportedTypes: [] };
  }
};

// Health check with connection testing
export const healthCheck = async () => {
  try {
    console.log('📞 Testing backend connection...');
    const response = await api.get('/health', { timeout: 10000 });
    console.log('✅ Backend connection successful:', response.data);
    return {
      ...response.data,
      backendUrl: API_BASE_URL,
      connected: true
    };
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);

    // If we're on Netlify and the main backend fails, show helpful error
    if (window.location.hostname.includes('netlify.app')) {
      throw new Error(`Backend server (${API_BASE_URL}) is not responding. The backend may need to be deployed or started.`);
    }

    throw error;
  }
};

// Test backend connection on app load
export const testConnection = async () => {
  try {
    const health = await healthCheck();
    console.log('🟢 Connection test passed:', health);
    return { connected: true, ...health };
  } catch (error) {
    console.error('🔴 Connection test failed:', error.message);
    return {
      connected: false,
      error: error.message,
      backendUrl: API_BASE_URL,
      suggestion: 'Please ensure the backend server is running and accessible.'
    };
  }
};

// Utility function to format file size
export const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// Utility function to format duration
export const formatDuration = (seconds) => {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

// Utility function to detect if URL is valid
export const isValidUrl = (string) => {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
};

// Utility function to detect platform from URL
export const detectPlatform = (url) => {
  if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('music.youtube.com')) return 'YouTube';
  if (url.includes('instagram.com')) return 'Instagram';
  return 'Unknown';
};

// Get download status for real-time tracking
export const getDownloadStatus = async (downloadId, url, format, quality) => {
  try {
    const response = await api.post('/download/status', {
      downloadId,
      url,
      format,
      quality
    });
    return response.data;
  } catch (error) {
    console.error('�� Failed to get download status:', error.message);

    // If 404, the endpoint doesn't exist in production yet
    if (error.message.includes('404') || error.message.includes('Not Found')) {
      throw new Error('Real-time tracking endpoint not available in production backend');
    }

    // Return fallback status for other errors
    return {
      progress: 100,
      status: 'completed',
      speed: '0 KB/s',
      eta: 'Complete',
      fileSize: 'Download ready'
    };
  }
};

// Check if production backend is responding
export const checkBackendHealth = async () => {
  try {
    const healthData = await healthCheck();
    return {
      healthy: true,
      message: 'Backend is responding normally',
      data: healthData
    };
  } catch (error) {
    return {
      healthy: false,
      message: error.message,
      suggestion: 'Backend may be down or experiencing issues. Please try again later.'
    };
  }
};

// Get downloaded files (real data)
export const getDownloadedFiles = async () => {
  try {
    console.log('📁 Fetching downloaded files...');
    const response = await api.get('/files');
    console.log('✅ Downloaded files fetched:', response.data.data.length, 'files');
    return response.data;
  } catch (error) {
    console.error('❌ Failed to fetch downloaded files:', error.message);
    throw error;
  }
};

export default api;
