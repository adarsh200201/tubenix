import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  FaInstagram,
  FaDownload,
  FaImage,
  FaVideo,
  FaCheckCircle,
  FaExclamationTriangle,
  FaSync
} from 'react-icons/fa';

const InstagramDownloader = ({ url, videoData }) => {
  const [loading, setLoading] = useState(false);
  const [instagramData, setInstagramData] = useState(null);
  const [downloading, setDownloading] = useState(false);

  // Clear data when URL changes
  useEffect(() => {
    if (!url || !url.includes('instagram.com')) {
      setInstagramData(null);
    }
  }, [url]);

  const extractInstagramMedia = async () => {
    if (!url || !url.includes('instagram.com')) {
      toast.error('Please enter a valid Instagram URL');
      return;
    }

    setLoading(true);
    setInstagramData(null);

    try {
      const response = await fetch('/api/instagram/extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url
        })
      });

      const result = await response.json();

      if (result.success) {
        setInstagramData(result);
        toast.success('Instagram media extracted successfully!');
      } else {
        throw new Error(result.message || 'Failed to extract Instagram media');
      }
    } catch (error) {
      console.error('❌ Instagram extraction error:', error);
      toast.error(`Extraction failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const downloadMedia = async (mediaUrl, filename, type) => {
    if (!mediaUrl) {
      toast.error('Media URL not available');
      return;
    }

    setDownloading(true);
    try {
      // Create a temporary link to download the media
      const link = document.createElement('a');
      link.href = mediaUrl;
      link.download = filename || `instagram_${type}_${Date.now()}`;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`${type} download started!`);
    } catch (error) {
      console.error('❌ Download error:', error);
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const renderMediaPreview = (media) => {
    if (!media) return null;

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {media.map((item, index) => (
          <div
            key={index}
            className="bg-gray-50 border border-gray-200 rounded-lg p-4 hover:bg-gray-100 transition-colors"
          >
            {/* Media Preview */}
            <div className="mb-3">
              {item.type === 'video' ? (
                <div className="relative">
                  <video
                    src={item.url}
                    className="w-full h-48 object-cover rounded"
                    controls
                    preload="metadata"
                  />
                  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs flex items-center">
                    <FaVideo className="mr-1" />
                    Video
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <img
                    src={item.url}
                    alt="Instagram media"
                    className="w-full h-48 object-cover rounded"
                  />
                  <div className="absolute top-2 left-2 bg-blue-600 text-white px-2 py-1 rounded text-xs flex items-center">
                    <FaImage className="mr-1" />
                    Image
                  </div>
                </div>
              )}
            </div>

            {/* Media Info */}
            <div className="text-sm text-gray-600 mb-3">
              <div>Type: {item.type}</div>
              {item.width && item.height && (
                <div>Size: {item.width} × {item.height}</div>
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={() => downloadMedia(item.url, item.filename, item.type)}
              disabled={downloading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 px-3 rounded flex items-center justify-center space-x-1"
            >
              <FaDownload />
              <span>{downloading ? 'Downloading...' : `Download ${item.type}`}</span>
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-3 mb-2">
          <FaInstagram className="text-pink-600 text-2xl" />
          <h3 className="text-xl font-bold text-gray-800">Instagram Downloader</h3>
        </div>
        <p className="text-gray-600">Download photos, videos, stories, and reels from Instagram</p>
      </div>

      {/* URL Display */}
      {url && url.includes('instagram.com') && (
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FaInstagram className="text-pink-600 mt-1" />
            <div className="flex-1">
              <h4 className="font-medium text-pink-900 mb-1">Instagram URL Detected</h4>
              <p className="text-sm text-pink-700 break-all">{url}</p>
            </div>
          </div>
        </div>
      )}

      {/* Extract Button */}
      {url && url.includes('instagram.com') && !instagramData && (
        <button
          onClick={extractInstagramMedia}
          disabled={loading}
          className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Extracting Instagram Media...</span>
            </>
          ) : (
            <>
              <FaSync />
              <span>Extract Instagram Media</span>
            </>
          )}
        </button>
      )}

      {/* Success Result */}
      {instagramData && instagramData.success && (
        <div className="space-y-4">
          {/* Success Message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <FaCheckCircle className="text-green-600" />
              <div>
                <h4 className="font-medium text-green-900">Extraction Successful!</h4>
                <p className="text-sm text-green-700">
                  Found {instagramData.media?.length || 0} media items
                </p>
              </div>
            </div>
          </div>

          {/* Media Grid */}
          {instagramData.media && instagramData.media.length > 0 && (
            <div>
              <h4 className="font-medium text-gray-800 mb-3">Available Media:</h4>
              {renderMediaPreview(instagramData.media)}
            </div>
          )}

          {/* Additional Info */}
          {instagramData.title && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-2">Post Information:</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Caption:</strong> {instagramData.title}</div>
                {instagramData.uploader && (
                  <div><strong>Author:</strong> {instagramData.uploader}</div>
                )}
                {instagramData.timestamp && (
                  <div><strong>Posted:</strong> {new Date(instagramData.timestamp * 1000).toLocaleDateString()}</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error Result */}
      {instagramData && !instagramData.success && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FaExclamationTriangle className="text-red-600 mt-1" />
            <div>
              <h4 className="font-medium text-red-900">Extraction Failed</h4>
              <p className="text-sm text-red-700 mt-1">
                {instagramData.message || 'Unable to extract media from this Instagram URL'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-900 mb-2">How to use:</h4>
        <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
          <li>Paste any Instagram URL (post, story, reel, or profile)</li>
          <li>Click "Extract Instagram Media" to analyze the content</li>
          <li>Download individual photos or videos</li>
          <li>All media is downloaded in original quality</li>
        </ol>
      </div>

      {/* Supported Content Types */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-3">Supported Content:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <FaImage className="text-blue-600" />
            <span>Photos</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <FaVideo className="text-red-600" />
            <span>Videos</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <FaInstagram className="text-pink-600" />
            <span>Stories</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-600">
            <FaVideo className="text-purple-600" />
            <span>Reels</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstagramDownloader;
