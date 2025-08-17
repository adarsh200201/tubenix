import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaPlay, FaClock, FaFileVideo, FaMusic } from 'react-icons/fa';

const VideoPreview = ({ data, onDownload, downloading }) => {
  const [selectedFormat, setSelectedFormat] = useState('mp4');
  const [selectedQuality, setSelectedQuality] = useState('best');

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} MB`;
  };

  const getQualityOptions = () => {
    const qualities = ['best'];
    if (data.formats) {
      const videoQualities = data.formats
        .filter(f => f.quality && f.quality !== 'unknown')
        .map(f => f.quality)
        .filter((value, index, self) => self.indexOf(value) === index);
      qualities.push(...videoQualities);
    }
    return qualities;
  };

  const handleDownloadClick = () => {
    onDownload(selectedFormat, selectedQuality);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
    >
      <div className="md:flex">
        {/* Video Thumbnail */}
        <div className="md:w-1/3">
          <div className="relative group">
            <img
              src={data.thumbnail || '/placeholder-video.jpg'}
              alt={data.title}
              className="w-full h-48 md:h-full object-cover"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIwIiBoZWlnaHQ9IjE4MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjY2NjIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxOCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5vIFRodW1ibmFpbDwvdGV4dD48L3N2Zz4=';
              }}
            />
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <FaPlay className="text-white text-3xl" />
            </div>
          </div>
        </div>

        {/* Video Details */}
        <div className="md:w-2/3 p-6">
          <div className="space-y-4">
            {/* Title */}
            <h2 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-2">
              {data.title}
            </h2>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-1">
                <span className="text-blue-500 font-medium">{data.platform}</span>
              </div>
              {data.duration && (
                <div className="flex items-center space-x-1">
                  <FaClock className="w-4 h-4" />
                  <span>{formatDuration(data.duration)}</span>
                </div>
              )}
            </div>

            {/* Format Selection */}
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Format
                </label>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="mp4">MP4 (Video)</option>
                  <option value="webm">WEBM (Video)</option>
                  <option value="mp3">MP3 (Audio Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality
                </label>
                <select
                  value={selectedQuality}
                  onChange={(e) => setSelectedQuality(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {getQualityOptions().map(quality => (
                    <option key={quality} value={quality}>
                      {quality === 'best' ? 'Best Available' : quality}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Available Formats Info */}
            {data.formats && data.formats.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Available Formats:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {data.formats.slice(0, 6).map((format, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                    >
                      {format.format === 'mp3' ? <FaMusic className="w-3 h-3 mr-1" /> : <FaFileVideo className="w-3 h-3 mr-1" />}
                      {format.quality} {format.format?.toUpperCase()}
                      {format.filesize && (
                        <span className="ml-1 text-gray-500">
                          ({formatFileSize(format.filesize)})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Download Button */}
            <motion.button
              onClick={handleDownloadClick}
              disabled={downloading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Downloading...</span>
                </>
              ) : (
                <>
                  <FaDownload className="w-5 h-5" />
                  <span>Download {selectedFormat.toUpperCase()}</span>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default VideoPreview;
