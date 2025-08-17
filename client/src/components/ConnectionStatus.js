import React, { useState, useEffect } from 'react';
import { testConnection } from '../services/api';

const ConnectionStatus = () => {
  const [status, setStatus] = useState({
    testing: true,
    connected: false,
    error: null,
    backendUrl: null
  });

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const result = await testConnection();
        setStatus({
          testing: false,
          connected: result.connected,
          error: result.error || null,
          backendUrl: result.backendUrl,
          ...result
        });
      } catch (error) {
        setStatus({
          testing: false,
          connected: false,
          error: error.message,
          backendUrl: null
        });
      }
    };

    checkConnection();
  }, []);

  if (status.testing) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600 mr-2"></div>
          <span className="text-yellow-800 text-sm">Testing backend connection...</span>
        </div>
      </div>
    );
  }

  if (status.connected) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-green-800 text-sm">
            ✅ Backend connected: {status.backendUrl}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
      <div className="text-red-800">
        <div className="flex items-center mb-2">
          <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
          <span className="font-medium">❌ Backend Connection Failed</span>
        </div>
        <div className="text-sm space-y-1">
          <p><strong>Backend URL:</strong> {status.backendUrl}</p>
          <p><strong>Error:</strong> {status.error}</p>
          <p><strong>Suggestion:</strong> {status.suggestion}</p>
        </div>
        <div className="mt-3 text-xs bg-red-100 p-2 rounded">
          <strong>For developers:</strong>
          <br />
          • Make sure the backend is deployed on Render
          <br />
          • Check if https://tubenix-1.onrender.com/api/health responds
          <br />
          • Verify CORS settings allow Netlify domain
        </div>
      </div>
    </div>
  );
};

export default ConnectionStatus;
