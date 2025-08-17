import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaDownload, FaCheck, FaSpinner, FaExclamationCircle, FaArrowLeft, FaEye } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Header from '../components/Header';

const LiveDownloads = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [downloads, setDownloads] = useState([]);
  const [adsShown, setAdsShown] = useState(false);

  // Get video URL and data from navigation state
  const videoData = location.state?.videoData;
  const videoUrl = location.state?.videoUrl;

  // Simulate real-time download progress
  const simulateDownloadProgress = useCallback((downloadId) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15; // Random progress increment

      setDownloads(prev => prev.map(download => {
        if (download.id === downloadId) {
          if (progress >= 100) {
            clearInterval(interval);
            return {
              ...download,
              progress: 100,
              status: 'completed',
              speed: '0 KB/s',
              eta: 'Complete',
              fileSize: getRandomFileSize()
            };
          }

          return {
            ...download,
            progress: Math.min(progress, 99),
            status: 'downloading',
            speed: getRandomSpeed(),
            eta: getRandomETA(progress),
            fileSize: progress > 20 ? getRandomFileSize() : 'Calculating...'
          };
        }
        return download;
      }));
    }, 800); // Update every 800ms for realistic feel
  }, []);

  useEffect(() => {
    // Show ads when page loads
    if (!adsShown) {
      window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank');
      setAdsShown(true);
      toast.success('Ads opened in new tab - Real-time downloads starting!');
    }

    // Initialize download if video data is provided
    if (videoData && videoUrl) {
      const initialDownload = {
        id: Date.now(),
        title: videoData.title || 'Unknown Video',
        url: videoUrl,
        platform: videoData.platform || 'Unknown',
        progress: 0,
        status: 'initializing',
        speed: '0 KB/s',
        eta: 'Calculating...',
        fileSize: 'Unknown',
        startTime: new Date().toLocaleTimeString(),
        thumbnail: videoData.thumbnail || '/api/placeholder/150/100'
      };
      
      setDownloads([initialDownload]);
      simulateDownloadProgress(initialDownload.id);
    }
  }, [videoData, videoUrl, adsShown, simulateDownloadProgress]);

  // Helper functions for realistic data
  const getRandomSpeed = () => {
    const speeds = ['1.2 MB/s', '850 KB/s', '2.1 MB/s', '1.8 MB/s', '950 KB/s', '1.5 MB/s'];
    return speeds[Math.floor(Math.random() * speeds.length)];
  };

  const getRandomETA = (progress) => {
    if (progress < 20) return 'Calculating...';
    const remaining = 100 - progress;
    const minutes = Math.floor(remaining / 20);
    const seconds = Math.floor((remaining % 20) * 3);
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  const getRandomFileSize = () => {
    const sizes = ['156.8 MB', '89.2 MB', '234.5 MB', '45.7 MB', '178.3 MB', '67.9 MB'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'initializing':
        return <FaSpinner className="animate-spin text-yellow-500" />;
      case 'downloading':
        return <FaDownload className="text-blue-500" />;
      case 'completed':
        return <FaCheck className="text-green-500" />;
      case 'error':
        return <FaExclamationCircle className="text-red-500" />;
      default:
        return <FaSpinner className="animate-spin text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'initializing':
        return 'bg-yellow-100 text-yellow-800';
      case 'downloading':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleOpenAds = () => {
    window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank');
    toast.success('Ads opened in new tab!');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate(-1)}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-600 p-3 rounded-xl transition-all duration-200 hover:scale-105"
                  >
                    <FaArrowLeft />
                  </button>
                  <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Live Downloads
                    </h1>
                    <p className="text-gray-600 mt-1">Real-time download monitoring</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={handleOpenAds}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                  >
                    <FaEye />
                    <span>View Ads</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Downloads List */}
            {downloads.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-12 border border-gray-200 text-center">
                <div className="text-gray-400 mb-4">
                  <FaDownload className="text-6xl mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No Active Downloads</h3>
                <p className="text-gray-600 mb-6">Start a download to see real-time progress here</p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Start Downloading
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {downloads.map((download) => (
                  <div key={download.id} className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        {/* Thumbnail */}
                        <div className="flex-shrink-0 w-24 h-16 bg-gray-200 rounded-lg overflow-hidden">
                          <img
                            src={download.thumbnail}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = '/api/placeholder/150/100';
                            }}
                          />
                        </div>

                        {/* Download Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-800 truncate mb-1">
                                {download.title}
                              </h3>
                              <div className="flex items-center space-x-4 text-sm text-gray-600">
                                <span className="flex items-center space-x-1">
                                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                  <span>{download.platform}</span>
                                </span>
                                <span>Started: {download.startTime}</span>
                                <span>Size: {download.fileSize}</span>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <span className={`px-3 py-1 text-xs font-bold rounded-full ${getStatusColor(download.status)}`}>
                                {download.status}
                              </span>
                              {getStatusIcon(download.status)}
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Progress: {Math.round(download.progress)}%</span>
                              <div className="flex space-x-4 text-gray-600">
                                <span>Speed: {download.speed}</span>
                                <span>ETA: {download.eta}</span>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  download.status === 'completed' 
                                    ? 'bg-gradient-to-r from-green-500 to-green-600' 
                                    : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                }`}
                                style={{ width: `${download.progress}%` }}
                              >
                                {download.status === 'downloading' && (
                                  <div className="h-full bg-white opacity-30 animate-pulse rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          {download.status === 'completed' && (
                            <div className="mt-4 flex space-x-3">
                              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2">
                                <FaDownload />
                                <span>Download Complete</span>
                              </button>
                              <button
                                onClick={handleOpenAds}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
                              >
                                View More Downloads
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Stats */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-blue-600 mb-2">
                  {downloads.filter(d => d.status === 'downloading').length}
                </div>
                <div className="text-gray-600">Active Downloads</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">
                  {downloads.filter(d => d.status === 'completed').length}
                </div>
                <div className="text-gray-600">Completed</div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 text-center">
                <div className="text-3xl font-bold text-orange-600 mb-2">
                  {downloads.length}
                </div>
                <div className="text-gray-600">Total Downloads</div>
              </div>
            </div>

            {/* Ads Banner */}
            <div className="mt-8 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl p-6 text-center">
              <h3 className="text-xl font-bold mb-2">Support Our Service</h3>
              <p className="mb-4">View ads to help us keep this service free for everyone!</p>
              <button
                onClick={handleOpenAds}
                className="bg-white text-orange-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors"
              >
                View Ads & Support Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDownloads;
