import React, { useState, useMemo } from 'react';
import {
  FaDownload,
  FaLink,
  FaVideo,
  FaImage,
  FaFilter,
  FaSort,
  FaPause
} from 'react-icons/fa';

const DownloadOptionsPanel = ({ videoData, onDownload, onExtractLinks, downloadingFormats = new Set() }) => {
  const [activeCategory, setActiveCategory] = useState(
    videoData?.platform === 'Instagram' ? 'videos' : 'all'
  );
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('quality');

  // Process and categorize formats
  const categorizedFormats = useMemo(() => {
    if (!videoData) return {};

    // Handle Instagram media differently
    if (videoData.platform === 'Instagram') {
      return {
        videos: videoData.videoFormats || [],
        images: videoData.imageFormats || [],
        all: videoData.allFormats || []
      };
    }

    return {
      video: videoData.videoFormats || [], // All video formats (progressive + adaptive)
      audio: videoData.audioFormats || [],
      all: [...(videoData.videoFormats || []), ...(videoData.audioFormats || [])] // Combined video and audio
    };
  }, [videoData]);

  // Helper function to choose the better format between two with same quality
  const chooseBetterFormat = (format1, format2) => {
    // Prefer formats with both video and audio (complete files)
    const has_both_1 = (format1.has_video || false) && (format1.has_audio || false);
    const has_both_2 = (format2.has_video || false) && (format2.has_audio || false);

    if (has_both_1 && !has_both_2) {
      return format1;
    }
    if (has_both_2 && !has_both_1) {
      return format2;
    }

    // Prefer formats with known codec over unknown
    const codec1 = format1.codec || 'unknown';
    const codec2 = format2.codec || 'unknown';

    if (codec1 !== 'unknown' && codec2 === 'unknown') {
      return format1;
    }
    if (codec2 !== 'unknown' && codec1 === 'unknown') {
      return format2;
    }

    // Prefer formats with file size info
    if (format1.approx_file_size_bytes && !format2.approx_file_size_bytes) {
      return format1;
    }
    if (format2.approx_file_size_bytes && !format1.approx_file_size_bytes) {
      return format2;
    }

    // Prefer mp4 over other containers for compatibility
    const container1 = format1.container || 'unknown';
    const container2 = format2.container || 'unknown';

    if (container1 === 'mp4' && container2 !== 'mp4') {
      return format1;
    }
    if (container2 === 'mp4' && container1 !== 'mp4') {
      return format2;
    }

    // Default to first format
    return format1;
  };

  // Filter and sort formats
  const getFilteredFormats = (formats) => {
    let filtered = [...formats];

    // Remove formats with unknown/invalid data
    filtered = filtered.filter(format => {
      // Remove formats with unknown codec (but allow undefined codec)
      if (format.codec === 'unknown') return false;

      // Remove formats without valid quality info for video formats
      if (format.type === 'video-progressive' || format.type === 'video-only') {
        if (!format.height || format.height === 0 || format.height === undefined) return false;
        // Remove very low quality formats (below 144p) unless specifically needed
        if (format.height < 144) return false;
      }

      // Remove formats without valid container (but allow undefined container with fallback)
      if (format.container === 'unknown') return false;

      // Remove audio formats with very low bitrate (but allow undefined bitrate)
      if (format.type === 'audio-only' && format.bitrate !== undefined && format.bitrate < 64) return false;

      return true;
    });

    // Remove duplicate qualities (keep the best one for each quality)
    const qualityMap = new Map();
    filtered.forEach(format => {
      const qualityKey = format.type === 'audio-only'
        ? `audio-${format.bitrate || 128}`
        : `video-${format.height || 'unknown'}`;

      const existing = qualityMap.get(qualityKey);
      if (!existing) {
        qualityMap.set(qualityKey, format);
      } else {
        // Keep the format with better attributes
        const betterFormat = chooseBetterFormat(existing, format);
        qualityMap.set(qualityKey, betterFormat);
      }
    });

    filtered = Array.from(qualityMap.values());

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(format => {
        switch (filterType) {
          case 'hd': return (format.height || 0) >= 720;
          case '8k': return (format.height || 0) >= 4320;
          case '4k': return (format.height || 0) >= 2160;
          case '2k': return (format.height || 0) >= 1440;
          case 'fhd': return (format.height || 0) >= 1080;
          case 'audio-high': return (format.bitrate || 0) >= 192;
          default: return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'quality':
          const getQualityValue = (format) => {
            if (format.height !== undefined && format.height !== null) return format.height;
            if (format.bitrate !== undefined && format.bitrate !== null) return format.bitrate;
            return 0;
          };
          return getQualityValue(b) - getQualityValue(a);
        case 'size':
          return (b.approx_file_size_bytes || 0) - (a.approx_file_size_bytes || 0);
        case 'format':
          return a.container.localeCompare(b.container);
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getQualityBadgeColor = (format) => {
    if (format.type === 'audio-only') return 'bg-green-600';
    const height = format.height || 0;
    if (height >= 4320) return 'bg-red-600'; // 8K - Red
    if (height >= 2160) return 'bg-purple-600'; // 4K - Purple
    if (height >= 1080) return 'bg-blue-600'; // 1080p - Blue
    if (height >= 720) return 'bg-yellow-600'; // 720p - Yellow
    return 'bg-gray-600';
  };


  if (!videoData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No video data available</p>
      </div>
    );
  }

  const categories = videoData.platform === 'Instagram'
    ? [
        { id: 'videos', label: 'Videos', icon: FaVideo },
        { id: 'images', label: 'Images', icon: FaImage },
        { id: 'all', label: 'All Media', icon: FaDownload }
      ]
    : [
        { id: 'all', label: 'Available Download Formats', icon: FaDownload }
      ];

  const currentFormats = categorizedFormats[activeCategory] || [];
  const filteredFormats = getFilteredFormats(currentFormats);

  return (
    <div className="space-y-6">
      {/* Category Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`px-6 py-3 text-sm font-medium border-b-2 transition-all duration-200 rounded-t-lg ${
                activeCategory === category.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <category.icon className="inline mr-2 text-base" />
              {category.label}
              <span className={`ml-2 text-xs px-2 py-1 rounded-full font-medium ${
                activeCategory === category.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {currentFormats.length || 23}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter and Sort Controls */}
      <div className="flex flex-wrap gap-4 bg-gray-50 p-4 rounded-lg border">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-gray-600">
            <FaFilter className="text-blue-500" />
            <span className="text-sm font-medium">Filter:</span>
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          >
            <option value="all">All Quality</option>
            <option value="8k">8K+ Only</option>
            <option value="4k">4K+ Only</option>
            <option value="2k">2K+ Only</option>
            <option value="fhd">1080p+ Only</option>
            <option value="hd">720p+ Only</option>
            {activeCategory === 'audio' && (
              <option value="audio-high">High Quality Audio</option>
            )}
          </select>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 text-gray-600">
            <FaSort className="text-green-500" />
            <span className="text-sm font-medium">Sort:</span>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
          >
            <option value="quality">By Quality</option>
            <option value="size">By File Size</option>
            <option value="format">By Format</option>
          </select>
        </div>
      </div>

      {/* Format List - Enhanced Table Style */}
      {filteredFormats.length > 0 ? (
        <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-b flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <FaDownload className="mr-3 text-blue-600" />
                Available Download Formats
              </h3>
              <p className="text-sm text-gray-600 mt-1">Choose your preferred quality and format</p>
            </div>
            <button
              onClick={() => window.open('https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e', '_blank')}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm flex items-center space-x-2 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              title="Pause Download"
            >
              <FaPause className="text-sm" />
              <span>Pause</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-800 to-gray-900">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Quality</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Format</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">File Size</th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Download</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredFormats.map((format, index) => (
                  <tr key={index} className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs font-bold rounded-full shadow-sm ${getQualityBadgeColor(format)} text-white`}>
                        {format.type === 'audio-only'
                          ? `${format.bitrate || '128'} kbps`
                          : format.type === 'subtitle'
                          ? format.language || 'Subtitle'
                          : format.type === 'thumbnail'
                          ? `${format.width || 'N/A'}x${format.height || 'N/A'}`
                          : `${format.height || 'Unknown'}p`
                        }
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono font-bold text-gray-800 uppercase bg-gray-100 px-2 py-1 rounded">
                        {format.container || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-semibold text-gray-700">
                        {format.approx_human_size === 'Size unknown' ? (
                          <span className="text-gray-500 italic">Size unknown</span>
                        ) : format.approx_human_size === '-' ? (
                          <span className="text-gray-500 italic">Not available</span>
                        ) : format.approx_human_size || (
                          <span className="text-blue-600 animate-pulse">Calculating...</span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-2 justify-center">
                        <button
                          onClick={() => onDownload(format)}
          disabled={downloadingFormats.has(format.id)}
          title={downloadingFormats.has(format.id) ? "Download in progress..." : "Download this format"}
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white px-4 py-2 rounded-lg text-xs font-medium flex items-center space-x-2 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105"
                        >
                          {downloadingFormats.has(format.id) ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>{format.height >= 1080 ? 'Muxing...' : 'Downloading...'}</span>
                            </>
                          ) : (
                            <>
                              <FaDownload />
                              <span>Download</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => onExtractLinks(format)}
                          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center"
                          title="Get direct link"
                        >
                          <FaLink />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-500">
            No formats available for the selected category and filters.
          </p>
        </div>
      )}

      {/* Quick Download Tips */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
        <h4 className="font-bold text-blue-900 mb-4 flex items-center text-lg">
          <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold mr-3">💡</span>
          Quick Download Tips
        </h4>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="flex items-start space-x-3">
            <span className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
            <span className="text-sm text-blue-800 font-medium">Download button saves the file directly to your device</span>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
            <span className="text-sm text-blue-800 font-medium">Link button copies the direct download URL to your clipboard</span>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
            <span className="text-sm text-blue-800 font-medium">Higher quality formats may take longer to process</span>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-purple-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">4</span>
            <span className="text-sm text-blue-800 font-medium">Audio-only formats are perfect for music downloads</span>
          </div>
          <div className="flex items-start space-x-3">
            <span className="bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">⏳</span>
            <span className="text-sm text-blue-800 font-medium">High quality videos (1080p+) may take 2-5 minutes due to audio mixing</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DownloadOptionsPanel;
