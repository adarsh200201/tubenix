import React, { useState, useEffect } from 'react';
import { extractVideoMetadata, extractDownloadLinks, downloadVideo } from '../services/api';
import { FiDownload, FiLink, FiCopy, FiRefreshCw } from 'react-icons/fi';
import toast from 'react-hot-toast';
import fileDownload from 'js-file-download';

const QualitySelector = ({ url, onFormatSelect }) => {
  const [formats, setFormats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [videoInfo, setVideoInfo] = useState(null);
  const [extractedLinks, setExtractedLinks] = useState(null);

  useEffect(() => {
    if (url) {
      loadFormats();
    }
  }, [url]);

  const loadFormats = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Loading real-time formats for:', url);

      // Get metadata with all formats
      const metadata = await extractVideoMetadata(url);
      setVideoInfo(metadata);
      console.log('📊 Metadata received:', {
        title: metadata.title,
        totalFormats: metadata.allFormats?.length || 0,
        videoFormats: metadata.videoFormats?.length || 0
      });

      // Get extract links for real file sizes and URLs
      const links = await extractDownloadLinks(url, 'mp4', 'best');
      setExtractedLinks(links);
      console.log('🔗 Extract links received:', {
        success: links.success,
        videoFormats: links.videoFormats?.length || 0,
        audioFormats: links.audioFormats?.length || 0,
        qualityStats: links.qualityStats
      });

      // Process ALL video formats from 144p to 8K
      const allFormats = [];

      // Add video formats with enhanced data
      if (links.videoFormats) {
        links.videoFormats.forEach(format => {
          const category = getQualityCategory(format.height);
          allFormats.push({
            quality: format.quality,
            height: format.height,
            width: format.width,
            format: format.container.toUpperCase(),
            fileSize: format.filesize_human || formatFileSize(format.filesize) || 'Calculating...',
            url: format.url,
            type: 'video',
            mimeType: format.mimeType,
            hasAudio: format.hasAudio,
            hasVideo: format.hasVideo,
            fps: format.fps,
            bitrate: format.bitrate,
            category: category.name,
            categoryEmoji: category.emoji,
            priority: category.priority,
            qualityNumber: format.qualityNumber || parseInt(format.height) || 0
          });
        });
      }

      // Add audio formats with enhanced data
      if (links.audioFormats) {
        links.audioFormats.forEach(format => {
          allFormats.push({
            quality: format.quality,
            height: 0,
            width: 0,
            format: format.container.toUpperCase(),
            fileSize: format.filesize_human || formatFileSize(format.filesize) || 'Calculating...',
            url: format.url,
            type: 'audio',
            mimeType: format.mimeType,
            hasAudio: true,
            hasVideo: false,
            bitrate: format.bitrate,
            sampleRate: format.sampleRate,
            category: 'Audio Only',
            categoryEmoji: '🎵',
            priority: 100, // Audio at the end
            qualityNumber: format.bitrate || 0
          });
        });
      }

      // Sort by priority (8K first, then 4K, 2K, 1080p, etc., audio last)
      allFormats.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.qualityNumber - a.qualityNumber; // Higher quality first within same category
      });
      
      // If no real links, use metadata formats
      if (allFormats.length === 0 && metadata.allFormats) {
        metadata.allFormats.forEach(format => {
          allFormats.push({
            quality: format.quality_label || format.resolution,
            format: format.container?.toUpperCase() || 'MP4',
            fileSize: format.approx_human_size || 'Calculating...',
            url: null,
            type: format.has_video ? 'video' : 'audio',
            mimeType: format.type,
            hasAudio: format.has_audio,
            hasVideo: format.has_video
          });
        });
      }
      
      console.log('✅ Loaded formats:', allFormats.length);
      setFormats(allFormats);
      
    } catch (error) {
      console.error('❌ Failed to load formats:', error.message);
      setError(error.message);
      toast.error('Failed to load video formats');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return null;
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getQualityColor = (quality, height) => {
    // Enhanced color coding for all qualities 144p to 8K
    if (height >= 4320 || quality.includes('8K') || quality.includes('4320')) return 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg';
    if (height >= 2160 || quality.includes('4K') || quality.includes('2160')) return 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md';
    if (height >= 1440 || quality.includes('2K') || quality.includes('1440')) return 'bg-gradient-to-r from-indigo-500 to-blue-600 text-white shadow-md';
    if (height >= 1080 || quality.includes('1080')) return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';
    if (height >= 720 || quality.includes('720')) return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
    if (height >= 480 || quality.includes('480')) return 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white';
    if (height >= 360 || quality.includes('360')) return 'bg-gradient-to-r from-orange-500 to-red-500 text-white';
    if (height >= 240 || quality.includes('240')) return 'bg-gradient-to-r from-red-500 to-pink-500 text-white';
    if (height >= 144 || quality.includes('144')) return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    if (quality.includes('kbps') || quality.includes('Audio')) return 'bg-gradient-to-r from-purple-600 to-violet-600 text-white';
    return 'bg-gray-500 text-white';
  };

  const getQualityCategory = (height) => {
    if (height >= 4320) return { name: '8K Ultra HD', emoji: '🔥', priority: 1 };
    if (height >= 2160) return { name: '4K Ultra HD', emoji: '💎', priority: 2 };
    if (height >= 1440) return { name: '2K Quad HD', emoji: '⭐', priority: 3 };
    if (height >= 1080) return { name: 'Full HD', emoji: '🎯', priority: 4 };
    if (height >= 720) return { name: 'HD Ready', emoji: '✨', priority: 5 };
    if (height >= 480) return { name: 'Standard', emoji: '📺', priority: 6 };
    if (height >= 360) return { name: 'Medium', emoji: '📱', priority: 7 };
    if (height >= 240) return { name: 'Low', emoji: '📶', priority: 8 };
    if (height >= 144) return { name: 'Basic', emoji: '📊', priority: 9 };
    return { name: 'Unknown', emoji: '❓', priority: 10 };
  };

  const handleDownload = async (format) => {
    try {
      // Check if this download will require muxing (video-only format)
      const requiresMuxing = format.hasVideo && !format.hasAudio && format.type === 'video';

      // Show appropriate loading toast
      const loadingToast = toast.loading(
        requiresMuxing
          ? '🎬 Combining video + audio streams...'
          : 'Preparing download...'
      );

      if (format.url) {
        const filename = `${videoInfo?.title || 'video'}_${format.quality}.${format.format?.toLowerCase() || 'mp4'}`
          .replace(/[^a-zA-Z0-9._-]/g, '_'); // Sanitize filename

        // Method 1: Try backend video API download (most reliable)
        try {
          console.log('🔄 Attempting backend video download...');
          const response = await downloadVideo(url, format.format?.toLowerCase() || 'mp4', format.quality, {
            directUrl: format.url || null,
            title: videoInfo?.title || 'video',
            mimeType: format.mimeType || null
          });

          if (response && response.data) {
            // Check if this was a muxed download
            const isMuxed = response.headers['x-muxed-download'] === 'true';
            const videoQuality = response.headers['x-video-quality'];
            const audioQuality = response.headers['x-audio-quality'];

            // Download the blob
            fileDownload(response.data, filename);
            toast.dismiss(loadingToast);

            if (isMuxed) {
              toast.success(
                `🎬 Muxed download completed! Combined ${videoQuality} video + ${audioQuality} audio`,
                { duration: 6000 }
              );
            } else {
              toast.success('Download completed!');
            }
            return;
          }
        } catch (backendError) {
          console.log('⚠️ Backend download failed:', backendError.message);

          // If backend is unavailable, automatically extract links and retry with progressive format
          if (
            backendError.message.includes('503') ||
            backendError.message.includes('temporarily unavailable') ||
            backendError.message.includes('Rate limit')
          ) {
            console.log('🔄 Fallback: extracting links to find progressive format...');
            try {
              const links = await extractDownloadLinks(url, format.format?.toLowerCase() || 'mp4', format.quality);

              // Prefer progressive (hasVideo && hasAudio), else nearest lower quality, else audio-only
              const isProgressive = (f) => f.hasVideo && f.hasAudio && f.url;
              const byHeightDesc = (a, b) => (b.height || 0) - (a.height || 0);

              let candidate = null;
              const requestedH = parseInt(format.quality?.replace('p','')) || 9999;

              const progressive = (links.videoFormats || []).filter(isProgressive).sort(byHeightDesc);
              candidate = progressive.find(f => f.height === requestedH) ||
                          progressive.find(f => (f.height || 0) < requestedH) ||
                          progressive[0] || null;

              if (!candidate && links.audioFormats?.length) {
                candidate = links.audioFormats[0];
              }

              if (candidate && candidate.url) {
                console.log('✅ Retrying download with extracted direct URL');
                const fallbackResp = await downloadVideo(url, (candidate.container || 'mp4'), candidate.quality || format.quality, {
                  directUrl: candidate.url,
                  title: videoInfo?.title || 'video',
                  mimeType: candidate.mimeType || null
                });
                if (fallbackResp && fallbackResp.data) {
                  fileDownload(fallbackResp.data, filename);
                  toast.dismiss(loadingToast);
                  toast.success('Download completed!');
                  return;
                }
              }
            } catch (fallbackErr) {
              console.log('⚠️ Extract-links fallback failed:', fallbackErr.message);
            }
          }
        }

        // Method 2: Create download link (works for some formats)
        try {
          console.log('🔄 Attempting download link method...');

          // Create a hidden anchor element for download
          const link = document.createElement('a');
          link.href = format.url;
          link.download = filename;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';

          // Add to DOM temporarily and click
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          toast.dismiss(loadingToast);
          toast.success('Download link opened! If download doesn\'t start, right-click the video and select "Save video as..."');
          return;

        } catch (linkError) {
          console.log('⚠️ Download link method failed:', linkError.message);

          // Method 3: Open URL in new tab with instructions
          try {
            console.log('🔄 Opening video URL in new tab...');

            // Open the video URL in a new tab
            window.open(format.url, '_blank', 'noopener,noreferrer');

            toast.dismiss(loadingToast);
            toast(
              'Video opened in new tab. To download: Right-click the video → "Save video as..."',
              {
                duration: 8000,
                icon: '💡',
                style: {
                  maxWidth: '500px'
                }
              }
            );
            return;

          } catch (openError) {
            console.log('⚠️ Failed to open URL:', openError.message);

            // Method 4: Copy URL to clipboard as fallback
            try {
              await navigator.clipboard.writeText(format.url);
              toast.dismiss(loadingToast);
              toast.error(
                'Download methods failed. Video URL copied to clipboard. You can paste it into a download manager or browser.',
                { duration: 10000 }
              );
            } catch (clipboardError) {
              toast.dismiss(loadingToast);
              toast.error(
                'All download methods failed. Please try a different quality or video.',
                { duration: 8000 }
              );
            }
          }
        }
      } else {
        // Use API download for formats without direct URLs
        toast.dismiss(loadingToast);
        if (onFormatSelect) {
          onFormatSelect(format.format.toLowerCase(), format.quality);
        } else {
          toast.error('Download method not available for this format');
        }
      }
    } catch (error) {
      console.error('❌ Download failed:', error);
      toast.error(`Download failed: ${error.message}`);
    }
  };

  const handleCopyLink = async (format) => {
    if (format.url) {
      try {
        await navigator.clipboard.writeText(format.url);
        toast.success('Download link copied!');
      } catch (error) {
        toast.error('Failed to copy link');
      }
    } else {
      toast.error('Direct link not available');
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center space-x-3">
          <FiRefreshCw className="animate-spin text-blue-500" size={24} />
          <span className="text-gray-600 dark:text-gray-300">Loading real-time formats...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center">
          <p className="text-red-500 mb-4">Failed to load formats: {error}</p>
          <button
            onClick={loadFormats}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!formats.length) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <p className="text-gray-500 text-center">No formats available</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">📽️ All Qualities (144p to 8K)</h3>
          <button
            onClick={loadFormats}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            title="Refresh formats"
          >
            <FiRefreshCw size={18} />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-sm opacity-90">
            Real-time implementation • Complete quality range working
          </p>
          {extractedLinks?.qualityStats && (
            <div className="text-xs opacity-80 flex items-center space-x-3">
              {extractedLinks.qualityStats['8K'] > 0 && <span>🔥 8K: {extractedLinks.qualityStats['8K']}</span>}
              {extractedLinks.qualityStats['4K'] > 0 && <span>💎 4K: {extractedLinks.qualityStats['4K']}</span>}
              {extractedLinks.qualityStats['2K'] > 0 && <span>⭐ 2K: {extractedLinks.qualityStats['2K']}</span>}
              {extractedLinks.qualityStats['1080p'] > 0 && <span>🎯 1080p: {extractedLinks.qualityStats['1080p']}</span>}
              <span>Total: {extractedLinks.qualityStats.total}</span>
            </div>
          )}
        </div>
        {/* Muxing Info */}
        <div className="mt-3 p-3 bg-white/10 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <span>🎬</span>
            <span className="font-semibold">Stream Muxing Enabled:</span>
            <span>High-quality formats automatically combine video + audio streams for complete downloads</span>
          </div>
          <div className="mt-1 text-xs opacity-90 flex items-center space-x-4">
            <span>✅ Direct = Ready to download</span>
            <span>🎬 Muxed = Video + Audio combined</span>
            <span>🎵 Audio Only = Audio stream only</span>
          </div>
        </div>
      </div>

      {/* Formats Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Quality
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Format
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                File Size
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Download
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {formats.map((format, index) => (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getQualityColor(format.quality, format.height)}`}>
                      {format.categoryEmoji} {format.quality}
                    </span>
                    {format.height >= 2160 && (
                      <span className="text-xs bg-gold-100 text-gold-800 px-2 py-0.5 rounded-full font-semibold animate-pulse">
                        ULTRA HD
                      </span>
                    )}
                  </div>
                  {format.category && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {format.category}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {format.format}
                  </span>
                  {format.type === 'audio' && (
                    <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">
                      Audio Only
                    </span>
                  )}
                  {format.hasVideo && !format.hasAudio && format.type === 'video' && (
                    <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900 px-2 py-0.5 rounded-full font-semibold">
                      🎬 Muxed
                    </span>
                  )}
                  {format.hasVideo && format.hasAudio && (
                    <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                      ✅ Direct
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {format.fileSize === 'Calculating...' ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <span>Calculating...</span>
                      </div>
                    ) : (
                      format.fileSize
                    )}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center space-x-2">
                    <button
                      onClick={() => handleDownload(format)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                      title="Download"
                    >
                      <FiDownload size={14} className="mr-1" />
                      Download
                    </button>
                    {format.url && (
                      <button
                        onClick={() => handleCopyLink(format)}
                        className="inline-flex items-center p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        title="Copy download link"
                      >
                        <FiLink size={14} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>{formats.length} format{formats.length !== 1 ? 's' : ''} available</span>
          <span className="flex items-center space-x-1">
            <span>🔗</span>
            <span>Real-time data</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default QualitySelector;
