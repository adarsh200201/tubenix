import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FaPlus, 
  FaTrash, 
  FaDownload, 
  FaCheckCircle, 
  FaExclamationTriangle
} from 'react-icons/fa';

// API base URL configuration
const API_BASE_URL = process.env.NODE_ENV === 'development'
  ? 'http://localhost:5000/api'
  : 'https://tubenix.onrender.com/api';

const BatchDownloader = () => {
  const [urls, setUrls] = useState(['']);
  const [quality, setQuality] = useState('1080');
  const [batchResults, setBatchResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const addUrlField = () => {
    if (urls.length < 10) {
      setUrls([...urls, '']);
    } else {
      toast.error('Maximum 10 URLs allowed per batch');
    }
  };

  const removeUrlField = (index) => {
    if (urls.length > 1) {
      setUrls(urls.filter((_, i) => i !== index));
    }
  };

  const updateUrl = (index, value) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const startBatchDownload = async () => {
    const validUrls = urls.filter(url => url.trim() !== '');
    
    if (validUrls.length === 0) {
      toast.error('Please enter at least one URL');
      return;
    }

    setIsProcessing(true);
    setBatchResults(null);

    try {
      const results = [];
      
      // Process URLs one by one
      for (let i = 0; i < validUrls.length; i++) {
        const url = validUrls[i];
        toast(`Processing ${i + 1}/${validUrls.length}: ${url}`, { duration: 2000 });
        
        try {
          const response = await fetch(`${API_BASE_URL}/download/video`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: url,
              format: 'mp4',
              quality: quality
            })
          });

          const result = await response.json();
          
          results.push({
            url: url,
            success: result.success,
            message: result.message || (result.success ? 'Download started' : 'Download failed'),
            downloadUrl: result.downloadUrl
          });

          if (result.success) {
            toast.success(`✅ ${i + 1}/${validUrls.length} completed`);
          } else {
            toast.error(`❌ ${i + 1}/${validUrls.length} failed`);
          }
        } catch (error) {
          results.push({
            url: url,
            success: false,
            message: error.message || 'Network error',
            downloadUrl: null
          });
          toast.error(`❌ ${i + 1}/${validUrls.length} failed`);
        }

        // Add a small delay between requests
        if (i < validUrls.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      setBatchResults(results);
      
      const successCount = results.filter(r => r.success).length;
      const failCount = results.length - successCount;
      
      if (successCount > 0) {
        toast.success(`Batch completed: ${successCount} successful, ${failCount} failed`);
      } else {
        toast.error('All downloads failed. Please check your URLs.');
      }
      
    } catch (error) {
      toast.error('Batch download failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setUrls(['']);
    setBatchResults(null);
    toast('Batch cleared');
  };

  const qualityOptions = [
    { value: '2160', label: '4K (2160p)' },
    { value: '1440', label: '2K (1440p)' },
    { value: '1080', label: 'Full HD (1080p)' },
    { value: '720', label: 'HD (720p)' },
    { value: '480', label: 'SD (480p)' },
    { value: 'audio', label: 'Audio Only' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-800 mb-2">Batch Download</h3>
        <p className="text-gray-600">Download multiple videos at once (up to 10 URLs)</p>
      </div>

      {/* Quality Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Quality for all downloads:
        </label>
        <select
          value={quality}
          onChange={(e) => setQuality(e.target.value)}
          disabled={isProcessing}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          {qualityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* URL Input Fields */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-gray-700">
            Video URLs:
          </label>
          <button
            onClick={addUrlField}
            disabled={isProcessing || urls.length >= 10}
            className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
          >
            <FaPlus />
            <span>Add URL</span>
          </button>
        </div>

        {urls.map((url, index) => (
          <div key={index} className="flex space-x-2">
            <input
              type="url"
              value={url}
              onChange={(e) => updateUrl(index, e.target.value)}
              placeholder={`Enter video URL ${index + 1}`}
              disabled={isProcessing}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
            />
            {urls.length > 1 && (
              <button
                onClick={() => removeUrlField(index)}
                disabled={isProcessing}
                className="bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white px-3 py-2 rounded flex items-center"
              >
                <FaTrash />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={startBatchDownload}
          disabled={isProcessing}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2"
        >
          <FaDownload />
          <span>
            {isProcessing ? 'Processing...' : 'Start Batch Download'}
          </span>
        </button>
        <button
          onClick={clearAll}
          disabled={isProcessing}
          className="bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white py-3 px-4 rounded-lg font-medium"
        >
          Clear All
        </button>
      </div>

      {/* Processing Status */}
      {isProcessing && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            <span className="text-blue-800">Processing batch download...</span>
          </div>
        </div>
      )}

      {/* Results */}
      {batchResults && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-800">Batch Results:</h4>
          <div className="space-y-2">
            {batchResults.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-3 ${
                  result.success 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start space-x-3">
                  {result.success ? (
                    <FaCheckCircle className="text-green-600 mt-1" />
                  ) : (
                    <FaExclamationTriangle className="text-red-600 mt-1" />
                  )}
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-800 mb-1">
                      URL {index + 1}: {result.success ? 'Success' : 'Failed'}
                    </div>
                    <div className="text-xs text-gray-600 break-all mb-2">
                      {result.url}
                    </div>
                    <div className={`text-sm ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </div>
                    {result.success && result.downloadUrl && (
                      <button
                        onClick={() => window.open(result.downloadUrl, '_blank')}
                        className="mt-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded"
                      >
                        Open Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-medium text-gray-800 mb-2">Batch Download Tips:</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Each URL will be processed sequentially to avoid server overload</li>
          <li>• Maximum 10 URLs can be processed in one batch</li>
          <li>• All videos will use the same quality setting</li>
          <li>• Failed downloads won't affect successful ones</li>
          <li>• Make sure all URLs are valid and accessible</li>
        </ul>
      </div>
    </div>
  );
};

export default BatchDownloader;
