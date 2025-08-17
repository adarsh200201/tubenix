import React from 'react';
import { useNavigate } from 'react-router-dom';
import { shouldShowAds, openAdsAndNavigate } from '../utils/adsUtils';

const Footer = () => {
  const navigate = useNavigate();
  const adsUrl = 'https://www.profitableratecpm.com/s738fegejz?key=12ac1ed2eeb4ac73b7d41add24630c1e';

  // Function to handle navigation with smart ads
  const handleNavigationWithAds = (path, pageName) => {
    if (shouldShowAds(pageName)) {
      // Not first time, show ads
      openAdsAndNavigate(adsUrl, navigate, path);
    } else {
      // First time visiting, go directly to page
      navigate(path);
    }
  };

  return (
    <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-10 mt-16 border-t border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center space-y-6">
          {/* Logo Section */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">
              Tubenix
            </span>
          </div>

          {/* Navigation Links */}
          <div className="flex justify-center items-center space-x-8">
            <button
              onClick={() => handleNavigationWithAds('/terms', 'terms')}
              className="text-gray-300 hover:text-blue-400 transition-all duration-200 px-4 py-2 rounded-lg hover:bg-gray-700 font-medium transform hover:scale-105"
            >
              Terms and Conditions
            </button>
            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
            <button
              onClick={() => handleNavigationWithAds('/privacy', 'privacy')}
              className="text-gray-300 hover:text-blue-400 transition-all duration-200 px-4 py-2 rounded-lg hover:bg-gray-700 font-medium transform hover:scale-105"
            >
              Privacy Policy
            </button>
          </div>

          {/* Copyright */}
          <div className="text-center">
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-500 to-transparent mb-4"></div>
            <p className="text-gray-400 text-sm font-medium">
              © 2025 <span className="text-blue-400 font-semibold">TubeNix</span>. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs mt-1">
              Built with ❤️ for video enthusiasts
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
