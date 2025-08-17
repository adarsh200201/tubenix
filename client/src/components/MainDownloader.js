import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FaDownload, FaShare, FaTimes, FaPlay, FaLink } from 'react-icons/fa';
import { useNavigate, useLocation } from 'react-router-dom';
import { extractVideoMetadata, downloadVideo, extractDownloadLinks, shareVideo, healthCheck, detectPlatform } from '../services/api';
import DownloadOptionsPanel from './DownloadOptionsPanel';
import StreamingDownloader from './StreamingDownloader';
import BatchDownloader from './BatchDownloader';
import InstagramDownloader from './InstagramDownloader';

const MainDownloader = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Function to handle navigation with ads
  const handleNavigationWithAds = (path) => {
    // Open ads link in new tab
    window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank');
    // Navigate to the actual page
    navigate(path);
  };
  const [url, setUrl] = useState('');
  const [videoData, setVideoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState('');
  const [backendStatus, setBackendStatus] = useState('checking');
  const [downloadingFormats, setDownloadingFormats] = useState(new Set());
  const [selectedPlatform, setSelectedPlatform] = useState('YouTube');
  const [showOptions, setShowOptions] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);
  const [activeDownloadTab, setActiveDownloadTab] = useState('formats');
  const [isProcessPage, setIsProcessPage] = useState(false);


  // Handle URL parameters and auto-process like 9xbuddy
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const videoUrl = urlParams.get('url');

    if (videoUrl && location.pathname === '/process') {
      // Decode the URL parameter
      const decodedUrl = decodeURIComponent(videoUrl);
      setUrl(decodedUrl);
      setIsProcessPage(true);
      // Auto-process the URL
      setTimeout(() => {
        handleURLSubmitDirect(decodedUrl);
      }, 500);
    } else if (location.pathname === '/') {
      setIsProcessPage(false);
    }
  }, [location]);

  // Auto-switch tabs based on platform
  useEffect(() => {
    if (url) {
      const platform = detectPlatform(url);
      if (platform === 'Instagram') {
        setActiveDownloadTab('instagram');
      } else if (platform === 'YouTube') {
        setActiveDownloadTab('formats');
      } else {
        setActiveDownloadTab('formats');
      }
    }
  }, [url]);

  // Check backend connectivity on component mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        setBackendStatus('checking');
        const health = await healthCheck();
        setBackendStatus('connected');
        console.log('✅ Backend connected:', health);
      } catch (error) {
        console.error('❌ Backend disconnected:', error.message);
        setBackendStatus('disconnected');
        toast.error('Backend server is not running');
      }
    };

    checkBackend();
  }, []);

  const platforms = [
    'YouTube',
    'Instagram'
  ];

  const handleURLSubmitDirect = async (videoUrl) => {
    const urlToProcess = videoUrl || url;
    if (!urlToProcess.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);
    setLoadingStage('');
    setVideoData(null);

    try {
      // Detailed progress stages like 9xbuddy
      const progressStages = [
        { progress: 15, stage: 'Analyzing URL...', message: 'Checking video source' },
        { progress: 25, stage: 'Connecting to server...', message: 'Establishing connection' },
        { progress: 40, stage: 'Fetching video metadata...', message: 'Getting video information' },
        { progress: 55, stage: 'Loading available formats...', message: 'Finding quality options' },
        { progress: 70, stage: 'Processing video data...', message: 'Analyzing content' },
        { progress: 85, stage: 'Preparing download options...', message: 'Setting up downloads' },
        { progress: 95, stage: 'Finalizing...', message: 'Almost ready' }
      ];

      // Show progressive loading with detailed stages
      for (const stage of progressStages) {
        setLoadingProgress(stage.progress);
        setLoadingStage(stage.stage);
        toast.loading(stage.message, { id: 'loading-progress' });
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Load metadata
      const metadata = await extractVideoMetadata(urlToProcess);

      setLoadingProgress(100);
      setLoadingStage('Complete!');
      toast.dismiss('loading-progress');

      setVideoData({
        ...metadata,
        title: metadata.title || 'Video Title',
        uploader: metadata.uploader || 'Unknown',
        duration: metadata.duration || 'Unknown',
        thumbnail: metadata.thumbnail || '/api/placeholder/300/200'
      });
      toast.success('Video information loaded successfully!');
      setShowOptions(true);
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load video information. Please check the URL and try again.';
      toast.error(errorMessage);
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setLoadingProgress(0);
      setLoadingStage('');
    }
  };

  const handleURLSubmit = async (e) => {
    e.preventDefault();
    if (!url.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    // If we're on homepage and URL is entered, redirect to /process like 9xbuddy
    if (location.pathname === '/' && url.trim()) {
      const encodedUrl = encodeURIComponent(url.trim());
      navigate(`/process?url=${encodedUrl}`);
      return;
    }

    // Otherwise process directly
    await handleURLSubmitDirect();
  };

  // Helper function to extract clean quality parameter for backend
  const extractQualityParameter = (format) => {
    if (format.type === 'audio-only') {
      return format.bitrate ? `${format.bitrate}kbps` : '128kbps';
    }

    // For video formats, extract the height number (e.g., 1080 from "1080p")
    if (format.height) {
      // Use the height property directly if available
      return format.height.toString();
    } else if (format.resolution) {
      // Extract number from resolution like "1080p" -> "1080"
      const resolutionMatch = format.resolution.match(/(\d+)p?/);
      return resolutionMatch ? resolutionMatch[1] : format.resolution;
    } else if (format.quality_label) {
      // Extract number from quality_label like "1080p" -> "1080"
      const qualityMatch = format.quality_label.match(/(\d+)p?/);
      return qualityMatch ? qualityMatch[1] : 'best';
    } else {
      return 'best';
    }
  };

  const handleDownload = async (format) => {
    if (!url || !videoData) return;

    // Open ads and navigate to live downloads page
    window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank');

    // Navigate to live downloads page with video data
    navigate('/live-downloads', {
      state: {
        videoData: videoData,
        videoUrl: url,
        format: format,
        downloadStarted: true
      }
    });

    // Add this format to downloading set
    setDownloadingFormats(prev => new Set([...prev, format.id]));
    try {
      if (format.type === 'subtitle') {
        if (format.direct_url) {
          window.open(format.direct_url, '_blank');
          toast.success('Subtitle download started!');
        } else {
          toast.error('Subtitle URL not available');
        }
      } else if (format.type === 'thumbnail') {
        if (format.direct_url) {
          const link = document.createElement('a');
          link.href = format.direct_url;
          link.download = `thumbnail_${format.width}x${format.height}.jpg`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          toast.success('Thumbnail download started!');
        } else {
          toast.error('Thumbnail URL not available');
        }
      } else {
        const cleanQuality = extractQualityParameter(format);
        console.log(`🎯 Download request - Format: ${format.container}, Quality: ${cleanQuality}, Original: ${format.quality_label || format.resolution}, Height: ${format.height}`);

        const result = await downloadVideo(url, format.container.toLowerCase(), cleanQuality);
        if (result.success) {
          if (result.downloadType === 'adaptive_streams') {
            // Handle YouTube adaptive streaming response
            toast.success('YouTube streams ready!');
            if (result.videoStream?.url) {
              setTimeout(() => {
                toast.loading(`Video stream: ${result.videoStream.quality} - Click to download`, {
                  duration: 8000,
                  action: {
                    label: 'Video',
                    onClick: () => window.open(result.videoStream.url, '_blank')
                  }
                });
              }, 500);
            }
            if (result.audioStream?.url) {
              setTimeout(() => {
                toast.loading(`Audio stream: ${result.audioStream.quality} - Click to download`, {
                  duration: 8000,
                  action: {
                    label: 'Audio',
                    onClick: () => window.open(result.audioStream.url, '_blank')
                  }
                });
              }, 1000);
            }
            if (result.instructions) {
              setTimeout(() => {
                toast.loading(result.instructions, { duration: 6000 });
              }, 1500);
            }
          } else {
            toast.success(result.message || 'Download started successfully!');
          }
        } else {
          toast.error(result.message || 'Download failed');
          if (result.suggestion) {
            setTimeout(() => {
              toast.loading(result.suggestion, { duration: 6000 });
            }, 1000);
          }
          if (result.note) {
            setTimeout(() => {
              toast.loading(result.note, { duration: 4000 });
            }, 2500);
          }
          if (result.availableQualities && result.availableQualities.length > 0) {
            setTimeout(() => {
              toast.loading(`Available qualities: ${result.availableQualities.join(', ')}`, { duration: 3000 });
            }, 3500);
          }
        }
      }
    } catch (error) {
      console.error('Download error:', error);

      let errorMessage = 'Download failed. Please try again.';
      let suggestion = null;

      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        errorMessage = 'Download timeout - the video is taking too long to process';
        suggestion = 'Try downloading a lower quality (720p or 480p) or use Extract Links feature. Large files (4K/2K) may take several minutes.';
      } else if (error.response?.status === 503) {
        errorMessage = 'Service temporarily unavailable';
        suggestion = 'YouTube may be blocking requests. Try again in a few minutes or use Extract Links.';
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);

      if (suggestion) {
        setTimeout(() => {
          toast.loading(suggestion, { duration: 8000 });
        }, 1000);
      }
    } finally {
      // Remove this format from downloading set
      setDownloadingFormats(prev => {
        const newSet = new Set(prev);
        newSet.delete(format.id);
        return newSet;
      });
    }
  };

  const handleExtractLinks = async (format) => {
    if (!url || !videoData) return;

    try {
      if (format.direct_url) {
        navigator.clipboard.writeText(format.direct_url);
        toast.success('Direct download link copied to clipboard!');
        window.open(format.direct_url, '_blank');
      } else {
        const cleanQuality = extractQualityParameter(format);
        console.log(`🔗 Extract links request - Format: ${format.container}, Quality: ${cleanQuality}, Original: ${format.quality_label || format.resolution}, Height: ${format.height}`);

        const result = await extractDownloadLinks(url, format.container, cleanQuality);
        if (result.success && result.downloadUrl) {
          navigator.clipboard.writeText(result.downloadUrl);
          toast.success('Download link copied to clipboard!');
          window.open(result.downloadUrl, '_blank');
        } else {
          toast.error(result.message || 'Could not extract download link');
        }
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to extract download link';
      toast.error(errorMessage);
      console.error('Extract links error:', error);
    }
  };

  const handleShare = async () => {
    if (!url || !videoData) return;

    try {
      const result = await shareVideo(url, videoData.platform);
      if (result.success) {
        setShareData(result);
        setShareModalOpen(true);
      } else {
        toast.error('Failed to create share link');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create share link';
      toast.error(errorMessage);
      console.error('Share error:', error);
    }
  };


  return (
    <div className="min-h-screen bg-gray-100">
      {/* Simple Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <FaDownload className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-800">Tubenix</h1>
                <p className="text-sm text-gray-500">Video Downloader</p>
              </div>
            </div>

            <nav className="flex items-center space-x-6">
              <button onClick={() => navigate('/')} className="text-gray-600 hover:text-blue-600">Home</button>
              <button onClick={() => handleNavigationWithAds('/files')} className="text-gray-600 hover:text-blue-600">Files</button>
              <button onClick={() => handleNavigationWithAds('/sites')} className="text-gray-600 hover:text-blue-600">Sites</button>
              <button onClick={() => handleNavigationWithAds('/donate')} className="text-gray-600 hover:text-blue-600">Donate</button>
              <button onClick={() => handleNavigationWithAds('/support')} className="text-gray-600 hover:text-blue-600">Support</button>
              <button onClick={() => handleNavigationWithAds('/settings')} className="text-gray-600 hover:text-blue-600">Settings</button>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          
          {/* URL Input Section */}
          <div className="bg-white rounded-lg p-6 shadow-sm border">
            <form onSubmit={handleURLSubmit} className="space-y-4">
              {/* Platform Selection */}
              <div className="flex items-center space-x-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">📱</span>
                  </div>
                  <label className="text-sm font-semibold text-blue-700">Platform:</label>
                </div>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value)}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-2.5 rounded-lg border-0 shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-200 font-medium"
                >
                  {platforms.map(platform => (
                    <option key={platform} value={platform} className="bg-white text-gray-800">{platform}</option>
                  ))}
                </select>
              </div>

              {/* URL Input */}
              <div className="flex space-x-4">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                    <FaLink className="text-sm" />
                  </div>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder={selectedPlatform === 'Instagram' ?
                      "https://www.instagram.com/p/... or https://www.instagram.com/stories/..." :
                      "https://www.youtube.com/watch?v=..."}
                    className="w-full border-2 border-gray-300 pl-10 pr-10 py-3.5 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 shadow-sm hover:shadow-md text-gray-700"
                    required
                  />
                  {url && (
                    <button
                      type="button"
                      onClick={() => setUrl('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-full transition-all"
                    >
                      <FaTimes />
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-8 py-3.5 rounded-xl font-semibold flex items-center space-x-3 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <FaDownload className="text-lg" />
                      <span>Download</span>
                    </>
                  )}
                </button>
              </div>

              {/* Enhanced Progress Indicator */}
              {loading && (
                <div className="space-y-4 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                  <div className="w-full bg-gray-200 rounded-full h-4 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 h-4 rounded-full transition-all duration-500 ease-out shadow-sm relative overflow-hidden"
                      style={{ width: `${loadingProgress}%` }}
                    >
                      <div className="absolute inset-0 bg-white opacity-30 animate-pulse"></div>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      <div className="text-sm font-semibold text-blue-700">
                        {loadingStage}
                      </div>
                    </div>
                    <div className="bg-blue-100 px-3 py-1 rounded-full">
                      <span className="text-sm font-bold text-blue-800">
                        {loadingProgress}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>

          {/* Welcome Message (shown when no video is loaded and not loading and not on process page) */}
          {!videoData && !loading && !isProcessPage && (
            <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <FaDownload className="text-blue-600 text-2xl" />
                </div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Paste Video URL</h2>
                <p className="text-gray-600 mb-6">
                  Enter any video URL above to see available download formats and options
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <span>✅</span>
                    <span>YouTube</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <span>✅</span>
                    <span>Instagram</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <span>✅</span>
                    <span>Vimeo</span>
                  </div>
                  <div className="flex items-center justify-center space-x-1 text-gray-500">
                    <span>✅</span>
                    <span>More...</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Video Options (shown after URL is processed) */}
          {videoData && showOptions && (
            <div className="space-y-6">
              {/* Video Info */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-start space-x-6">
                  <div
                    className="relative w-40 h-28 cursor-pointer group rounded-xl overflow-hidden shadow-lg"
                    onClick={() => window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank')}
                    title="Play Video"
                  >
                    <img
                      src={videoData.thumbnail}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center group-hover:bg-opacity-50 transition-all duration-300">
                      <div className="bg-white bg-opacity-95 rounded-full p-4 group-hover:bg-opacity-100 transition-all shadow-xl transform group-hover:scale-110">
                        <FaPlay className="text-gray-800 text-xl ml-1" />
                      </div>
                    </div>
                    <div className="absolute top-2 right-2">
                      <span className="bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded-full">
                        HD
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="font-bold text-xl text-gray-800 leading-tight line-clamp-2">{videoData.title}</h3>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                        <p className="text-sm font-medium text-gray-600">
                          <span className="text-gray-500">Uploader:</span> {videoData.uploader}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <p className="text-sm font-medium text-gray-600">
                          <span className="text-gray-500">Duration:</span> {videoData.duration}
                        </p>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleShare}
                    className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-6 py-3 rounded-xl flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 font-semibold"
                  >
                    <FaShare className="text-lg" />
                    <span>Share</span>
                  </button>
                </div>
              </div>

              {/* Download Center */}
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                <div className="p-6 bg-gradient-to-r from-gray-50 to-blue-50 border-b">
                  <h2 className="text-2xl font-bold text-gray-800 flex items-center">
                    <div className="bg-blue-500 p-2 rounded-xl mr-4 shadow-md">
                      <FaDownload className="text-white text-lg" />
                    </div>
                    Download Options
                  </h2>
                  <p className="text-sm text-gray-600 mt-2 ml-14">Choose your preferred download method</p>
                </div>

                {/* Download Tabs */}
                <div className="bg-gray-50 border-b">
                  <div className="flex overflow-x-auto">
                    {(() => {
                      const platform = url ? detectPlatform(url) : 'Unknown';
                      const isInstagram = platform === 'Instagram';

                      const tabs = isInstagram ? [
                        { id: 'instagram', label: 'Instagram', icon: '📸', color: 'from-pink-500 to-purple-600' },
                        { id: 'formats', label: 'All Formats', icon: '🔧', color: 'from-blue-500 to-blue-600' }
                      ] : [
                        { id: 'formats', label: 'All Formats', icon: '🔧', color: 'from-blue-500 to-blue-600' },
                        { id: 'streaming', label: 'Stream', icon: '🎬', color: 'from-green-500 to-green-600' },
                        { id: 'batch', label: 'Batch', icon: '📋', color: 'from-purple-500 to-purple-600' }
                      ];

                      return tabs;
                    })().map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveDownloadTab(tab.id)}
                        className={`px-6 py-4 text-sm font-semibold border-r border-gray-200 hover:bg-white transition-all duration-200 flex items-center space-x-2 min-w-max ${
                          activeDownloadTab === tab.id
                            ? `bg-gradient-to-r ${tab.color} text-white shadow-lg transform scale-105`
                            : 'text-gray-600 hover:text-gray-800'
                        }`}
                      >
                        <span className="text-lg">{tab.icon}</span>
                        <span>{tab.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Download Content */}
                <div className="p-6">
                  {activeDownloadTab === 'instagram' && (
                    <InstagramDownloader
                      url={url}
                      videoData={videoData}
                    />
                  )}

                  {activeDownloadTab === 'formats' && (
                    <DownloadOptionsPanel
                      videoData={videoData}
                      onDownload={handleDownload}
                      onExtractLinks={handleExtractLinks}
                      downloadingFormats={downloadingFormats}
                    />
                  )}

                  {activeDownloadTab === 'streaming' && (
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 mb-4">Streaming Download</h3>
                      <StreamingDownloader
                        videoData={videoData}
                        url={url}
                      />
                    </div>
                  )}

                  {activeDownloadTab === 'batch' && (
                    <BatchDownloader />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {shareModalOpen && shareData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">Share Video</h3>
              <button
                onClick={() => setShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Share URL:</label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={shareData.shareUrl}
                    readOnly
                    className="flex-1 border border-gray-300 px-3 py-2 rounded text-sm"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(shareData.shareUrl);
                      toast.success('Share URL copied to clipboard!');
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {Object.entries(shareData.platforms || {}).map(([platform, url]) => (
                <button
                  key={platform}
                  onClick={() => window.open(url, '_blank')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded text-sm capitalize"
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default MainDownloader;
