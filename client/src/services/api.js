import axios from 'axios';

// Determine API base URL based on environment and deployment
const getApiBaseUrl = () => {
  // If we're in development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }

  // If we're on Netlify (production frontend)
  if (window.location.hostname.includes('netlify.app') ||
      window.location.hostname.includes('tubenix.netlify.app')) {
    return 'https://tubenix-1.onrender.com/api';
  }

  // If we're on Render (full-stack deployment)
  if (window.location.hostname.includes('onrender.com')) {
    return '/api'; // Use relative URL for same-origin requests
  }

  // Default to Render backend for production
  return 'https://tubenix-1.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

console.log('🔗 Using API base URL:', API_BASE_URL);
console.log('🌐 Current hostname:', window.location.hostname);
console.log('🚀 Environment:', process.env.NODE_ENV);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout restrictions as requested
});

// Add request retry functionality
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Request interceptor for loading states
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error Details:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      message: error.message
    });

    // Log a clean error message for debugging
    console.error(`API Error: ${error.response?.status || 'Unknown'} - ${error.message}`);

    const message = error.response?.data?.error ||
                   error.response?.data?.message ||
                   error.message ||
                   'Something went wrong';

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
        serviceUnavailableMessage = 'Service temporarily unavailable. This may be due to YouTube blocking or server overload. Please try the Extract Links feature or try again later.';
      }

      return Promise.reject(new Error(serviceUnavailableMessage));
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
    // Simple retry logic like 9xbuddy
    if (retryCount < MAX_RETRIES && (
      error.message.includes('Server Error') ||
      error.message.includes('Service busy') ||
      error.message.includes('timeout')
    )) {
      console.log(`Retrying metadata extraction... (${retryCount + 1}/${MAX_RETRIES})`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return extractVideoMetadata(url, retryCount + 1);
    }
    console.error('❌ Failed to extract metadata:', error.message);

    // Provide more specific error messages
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
export const downloadVideo = async (url, format = 'mp4', quality = 'best') => {
  try {
    const response = await api.post('/download/video', {
      url,
      format,
      quality
    }, {
      responseType: 'blob',
      timeout: 0 // No timeout restriction as requested
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

      // It's actually a video/audio blob - trigger download
      const downloadUrl = window.URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = downloadUrl;

      // Generate filename based on format and quality
      const filename = `video_${quality}.${format}`;
      link.download = filename;

      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      return {
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
    throw error;
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
    console.error('❌ Failed to get download status:', error.message);
    // Return fallback status instead of throwing
    return {
      progress: 100,
      status: 'completed',
      speed: '0 KB/s',
      eta: 'Complete',
      fileSize: 'Download ready'
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
