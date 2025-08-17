import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaDownload, FaPaste } from 'react-icons/fa';

const URLInput = ({ onSubmit, loading }) => {
  const [inputUrl, setInputUrl] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(inputUrl);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputUrl(text);
      }
    } catch (err) {
      console.error('Failed to read clipboard contents: ', err);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* URL Input */}
        <div>
          <label className="block text-lg font-medium text-gray-700 mb-4 text-center">
            Paste your video URL here
          </label>
          <div className="relative">
            <input
              type="url"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="w-full px-6 py-4 text-lg border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors duration-200"
              required
            />
            <button
              type="button"
              onClick={handlePaste}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-blue-500 transition-colors duration-200"
              title="Paste from clipboard"
            >
              <FaPaste className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Download Button */}
        <motion.button
          type="submit"
          disabled={loading || !inputUrl.trim()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold text-lg py-4 px-8 rounded-lg transition-all duration-200 flex items-center justify-center space-x-3 disabled:cursor-not-allowed shadow-lg"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              <span>Processing...</span>
            </>
          ) : (
            <>
              <FaDownload className="w-6 h-6" />
              <span>Download Video</span>
            </>
          )}
        </motion.button>
      </form>

      {/* Supported Formats */}
      <div className="mt-6 text-center text-gray-600">
        <p>Supports: MP4, MP3, WEBM • All qualities available</p>
      </div>
    </div>
  );
};

export default URLInput;
