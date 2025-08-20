import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';

const ProductionDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=hxMNYkLN7tI');
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);

  // API base URL configuration
  const API_BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000/api'
    : 'https://tubenix.onrender.com/api';

  useEffect(() => {
    fetchEnvironmentInfo();
  }, []);

  const fetchEnvironmentInfo = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/debug/environment`);
      const data = await response.json();
      setDebugInfo(data);
      console.log('Environment info:', data);
    } catch (error) {
      console.error('Failed to fetch environment info:', error);
      toast.error('Failed to connect to production API');
    }
  };

  const testPing = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/debug/ping`);
      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        ping: data
      }));
      toast.success('Ping test successful');
    } catch (error) {
      console.error('Ping test failed:', error);
      toast.error('Ping test failed');
    } finally {
      setLoading(false);
    }
  };

  const testYouTubeUrl = async () => {
    if (!testUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/debug/test-youtube`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl })
      });
      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        youtube: data
      }));
      toast.success('YouTube URL test completed');
    } catch (error) {
      console.error('YouTube test failed:', error);
      toast.error('YouTube test failed');
    } finally {
      setLoading(false);
    }
  };

  const testMetadataExtraction = async () => {
    if (!testUrl) {
      toast.error('Please enter a YouTube URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/download/metadata`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl })
      });
      const data = await response.json();
      setTestResults(prev => ({
        ...prev,
        metadata: data
      }));
      
      if (data.success) {
        toast.success('Metadata extraction successful');
      } else {
        toast.error(`Metadata extraction failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Metadata test failed:', error);
      toast.error('Metadata test failed');
    } finally {
      setLoading(false);
    }
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Hide in production
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
        🔧 Production Debug Panel
      </h2>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Environment Info */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Environment Info
          </h3>
          
          <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
            <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto">
              {debugInfo ? JSON.stringify(debugInfo, null, 2) : 'Loading...'}
            </pre>
          </div>

          <button
            onClick={fetchEnvironmentInfo}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          >
            Refresh Environment Info
          </button>
        </div>

        {/* API Tests */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            API Tests
          </h3>

          <div className="space-y-3">
            <button
              onClick={testPing}
              disabled={loading}
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              Test API Ping
            </button>

            <div className="space-y-2">
              <input
                type="text"
                value={testUrl}
                onChange={(e) => setTestUrl(e.target.value)}
                placeholder="YouTube URL to test"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              
              <button
                onClick={testYouTubeUrl}
                disabled={loading}
                className="w-full bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 transition-colors disabled:opacity-50"
              >
                Test YouTube URL
              </button>

              <button
                onClick={testMetadataExtraction}
                disabled={loading}
                className="w-full bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors disabled:opacity-50"
              >
                Test Metadata Extraction
              </button>
            </div>
          </div>

          {testResults && (
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 text-gray-900 dark:text-white">Test Results:</h4>
              <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto">
                {JSON.stringify(testResults, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> This debug panel only appears in development. 
          Use these tools to diagnose differences between local and production environments.
        </p>
      </div>
    </div>
  );
};

export default ProductionDebug;
