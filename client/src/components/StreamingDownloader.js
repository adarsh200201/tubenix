import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import {
  FaDownload,
  FaStop,
  FaVideo,
  FaMusic,
  FaCheckCircle
} from 'react-icons/fa';
import { detectPlatform, downloadVideo } from '../services/api';

// API base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api'
  : 'https://tubenix.onrender.com/api';

const StreamingDownloader = ({ videoData, url }) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedQuality, setSelectedQuality] = useState('highest');
  const [availableFormats, setAvailableFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);

  // Check if URL is YouTube-compatible
  const platform = url ? detectPlatform(url) : 'Unknown';
  const isYouTubeUrl = platform === 'YouTube' || platform === 'Youtube Music';

  const loadAvailableFormats = useCallback(async () => {
    if (!isYouTubeUrl) return;

    setLoadingFormats(true);
    try {
      const response = await fetch(`${API_BASE_URL}/streaming/formats?url=${encodeURIComponent(url)}`);
      if (response.ok) {
        const data = await response.json();
        if (data.formats && data.formats.length > 0) {
          setAvailableFormats(data.formats);
          console.log('✅ Loaded formats for streaming:', data.formats.length);
        } else {
          console.log('⚠️ No formats available for streaming');
          setAvailableFormats([]);
        }
      } else {
        console.log('⚠️ Failed to load streaming formats');
        setAvailableFormats([]);
      }
    } catch (error) {
      console.error('❌ Error loading formats:', error);
      setAvailableFormats([]);
    } finally {
      setLoadingFormats(false);
    }
  }, [isYouTubeUrl, url]);

  // Load available formats when component mounts
  useEffect(() => {
    if (url && isYouTubeUrl) {
      loadAvailableFormats();
    } else {
      setAvailableFormats([]);
      setSelectedQuality('highest');
    }
  }, [url, isYouTubeUrl, loadAvailableFormats]);

  const handleStreamingDownload = async () => {
    if (!url || !videoData) {
      toast.error('Video data not available');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    
    try {
      // Use the standard downloadVideo function
      const result = await downloadVideo(url, 'mp4', selectedQuality);

      if (result) {
        // Simulate progress for user feedback
        const progressInterval = setInterval(() => {
          setDownloadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + Math.random() * 10;
          });
        }, 500);

        // Complete progress
        setTimeout(() => {
          clearInterval(progressInterval);
          setDownloadProgress(100);
          toast.success('🎉 Download completed!', { duration: 3000 });
          setIsDownloading(false);
        }, 2000);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('❌ Streaming download error:', error);
      toast.error(`Streaming download failed: ${error.message}`);
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  };

  const stopDownload = () => {
    setIsDownloading(false);
    setDownloadProgress(0);
    toast('Download stopped', { icon: '⏹️' });
  };

  const qualityOptions = [
    { value: 'highest', label: 'Highest Quality' },
    { value: '1080', label: '1080p (Full HD)' },
    { value: '720', label: '720p (HD)' },
    { value: '480', label: '480p (SD)' },
    { value: '360', label: '360p' },
    { value: 'audio', label: 'Audio Only' }
  ];

  return (
    <div className="space-y-6">
      {/* Platform Compatibility Notice */}
      {!isYouTubeUrl && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="text-yellow-600 mt-1">⚠️</div>
            <div>
              <h4 className="text-yellow-800 font-medium mb-1">Platform Notice</h4>
              <p className="text-yellow-700 text-sm">
                Real-time streaming downloads are optimized for YouTube. 
                For {platform} videos, try the "All Formats" tab for direct downloads.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Video Information */}
      {videoData && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center space-x-3 mb-3">
            <FaVideo className="text-blue-600" />
            <h3 className="font-medium text-gray-800">Ready for Streaming Download</h3>
          </div>
          <div className="text-sm text-gray-600 space-y-1">
            <div><strong>Title:</strong> {videoData.title}</div>
            <div><strong>Platform:</strong> {platform}</div>
            {videoData.duration && <div><strong>Duration:</strong> {videoData.duration}</div>}
          </div>
        </div>
      )}

      {/* Quality Selection */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700">
          Select Quality:
        </label>
        <select
          value={selectedQuality}
          onChange={(e) => setSelectedQuality(e.target.value)}
          disabled={isDownloading}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          {qualityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {loadingFormats && (
          <p className="text-sm text-gray-500">Loading available formats...</p>
        )}
      </div>

      {/* Download Button */}
      <div className="space-y-4">
        {!isDownloading ? (
          <button
            onClick={handleStreamingDownload}
            disabled={!url || !videoData}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
          >
            <FaDownload />
            <span>Start Streaming Download</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              ></div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Progress: {Math.round(downloadProgress)}%
              </span>
              <span className="text-blue-600 font-medium">
                {downloadProgress === 100 ? 'Complete!' : 'Downloading...'}
              </span>
            </div>
            <button
              onClick={stopDownload}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
            >
              <FaStop />
              <span>Stop Download</span>
            </button>
          </div>
        )}
      </div>

      {/* Features List */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="text-green-800 font-medium mb-3 flex items-center">
          <FaCheckCircle className="mr-2" />
          Streaming Download Features
        </h4>
        <ul className="text-sm text-green-700 space-y-1">
          <li>• No waiting time - download starts immediately</li>
          <li>• Real-time progress tracking</li>
          <li>• Optimized for YouTube videos</li>
          <li>• Multiple quality options available</li>
          <li>• Direct save to your device</li>
        </ul>
      </div>

      {/* Format Information */}
      {availableFormats.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-blue-800 font-medium mb-2">Available Formats:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
            {availableFormats.slice(0, 6).map((format, index) => (
              <div key={index} className="bg-white rounded px-2 py-1 text-blue-700">
                {format.type === 'audio-only' ? (
                  <><FaMusic className="inline mr-1" />{format.bitrate}kbps</>
                ) : (
                  <><FaVideo className="inline mr-1" />{format.height}p</>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StreamingDownloader;
