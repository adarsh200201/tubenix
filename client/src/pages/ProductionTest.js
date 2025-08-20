import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

const ProductionTest = () => {
  const [testUrl, setTestUrl] = useState('https://www.youtube.com/watch?v=dQw4w9WgXcQ'); // Use a different video
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const directApiTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing direct API call to:', 'https://tubenix.onrender.com/api/download/metadata');
      
      const response = await fetch('https://tubenix.onrender.com/api/download/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl })
      });
      
      const data = await response.json();
      
      setResults({
        status: response.status,
        success: data.success,
        data: data,
        timestamp: new Date().toISOString()
      });
      
      if (data.success) {
        toast.success('✅ Direct API call successful!');
      } else {
        toast.error(`❌ API call failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Direct API test failed:', error);
      setResults({
        error: error.message,
        timestamp: new Date().toISOString()
      });
      toast.error('❌ Direct API call failed');
    } finally {
      setLoading(false);
    }
  };

  const proxiedApiTest = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      console.log('🧪 Testing proxied API call through Netlify');
      
      const response = await fetch('/api/download/metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: testUrl })
      });
      
      const data = await response.json();
      
      setResults({
        status: response.status,
        success: data.success,
        data: data,
        timestamp: new Date().toISOString(),
        type: 'proxied'
      });
      
      if (data.success) {
        toast.success('✅ Proxied API call successful!');
      } else {
        toast.error(`❌ Proxied API call failed: ${data.error}`);
      }
      
    } catch (error) {
      console.error('Proxied API test failed:', error);
      setResults({
        error: error.message,
        timestamp: new Date().toISOString(),
        type: 'proxied'
      });
      toast.error('❌ Proxied API call failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 text-center">
          🔧 Production API Test
        </h1>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Test URL:
            </label>
            <input
              type="text"
              value={testUrl}
              onChange={(e) => setTestUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Enter YouTube URL to test"
            />
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <button
              onClick={directApiTest}
              disabled={loading}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Direct API Call'}
            </button>

            <button
              onClick={proxiedApiTest}
              disabled={loading}
              className="w-full bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Proxied API Call'}
            </button>
          </div>

          {results && (
            <div className="mt-8 bg-gray-100 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Test Results:
              </h3>
              <pre className="text-sm text-gray-800 dark:text-gray-200 overflow-auto whitespace-pre-wrap">
                {JSON.stringify(results, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-yellow-100 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Debugging Tips:
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <li>• Direct API calls bypass Netlify proxy</li>
              <li>• Proxied calls go through Netlify redirects</li>
              <li>• Check browser Network tab for detailed error info</li>
              <li>• Try different YouTube URLs (some may be rate-limited)</li>
              <li>• Wait 10-15 minutes between tests if getting 429 errors</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionTest;
