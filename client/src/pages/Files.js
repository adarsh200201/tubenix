import React, { useState, useEffect } from 'react';
import { FaFile, FaTrash, FaSyncAlt, FaLink, FaPlay } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import Header from '../components/Header';
import { getDownloadedFiles } from '../services/api';

const Files = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch real downloaded files
  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDownloadedFiles();
      setFiles(response.data || []);
      if (response.message) {
        toast.success(response.message);
      }
    } catch (error) {
      console.error('❌ Failed to fetch files:', error);
      setError(error.message || 'Failed to load downloaded files');
      toast.error('Failed to load downloaded files');
      // Set empty array as fallback
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleRefresh = () => {
    toast.loading('Refreshing files...', { id: 'refresh' });
    fetchFiles().finally(() => {
      toast.dismiss('refresh');
    });
  };

  const handleOpenOriginal = (file) => {
    if (file.url) {
      window.open(file.url, '_blank');
      toast.success('Opened original video link');
    } else {
      toast.error('Original URL not available');
    }
  };

  const getFileIcon = (fileName) => {
    if (fileName.includes('.mp4') || fileName.includes('.webm') || fileName.includes('.mkv')) {
      return <FaPlay className="text-red-500" />;
    } else if (fileName.includes('.mp3') || fileName.includes('.wav') || fileName.includes('.aac')) {
      return <span className="text-green-500">🎵</span>;
    }
    return <FaFile className="text-gray-400" />;
  };

  const getPlatformBadge = (platform) => {
    const colors = {
      'YouTube': 'bg-red-100 text-red-800',
      'Instagram': 'bg-pink-100 text-pink-800',
      'Unknown': 'bg-gray-100 text-gray-800'
    };

    return colors[platform] || colors['Unknown'];
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  Downloaded Files
                </h1>
                <p className="text-gray-600 mt-1">
                  {loading ? 'Loading...' : `${files.length} files found`}
                </p>
              </div>
              <button
                onClick={handleRefresh}
                disabled={loading}
                className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-3 rounded-xl font-semibold flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
              >
                <FaSyncAlt className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <span className="ml-4 text-gray-600">Loading downloaded files...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-red-500 mb-4">
                  <span className="text-4xl">⚠️</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Files</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={handleRefresh}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Try Again
                </button>
              </div>
            ) : files.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <span className="text-6xl">📁</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">No Files Yet</h3>
                <p className="text-gray-600 mb-4">Start downloading videos to see them here!</p>
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
                >
                  Start Downloading
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">File Details</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Platform</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Size</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                      <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {files.map((file) => (
                      <tr key={file.id} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {getFileIcon(file.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-gray-900 truncate" title={file.originalTitle || file.name}>
                                {file.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {file.quality} • {file.format?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPlatformBadge(file.platform)}`}>
                            {file.platform}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm font-semibold text-gray-700">
                            {file.size}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600">
                            {file.date}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                            file.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {file.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex space-x-2 justify-center">
                            <button
                              onClick={() => handleOpenOriginal(file)}
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                              title="Open original video"
                            >
                              <FaLink />
                            </button>
                            <button
                              className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                              title="Remove from list"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Files;
