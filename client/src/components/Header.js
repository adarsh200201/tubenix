import React from 'react';
import { FaDownload } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { shouldShowAds, openAdsAndNavigate } from '../utils/adsUtils';

const Header = () => {
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
    <header className="bg-white shadow-lg border-b border-gray-100 sticky top-0 z-50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-4 hover:scale-105 transition-all duration-200 group p-2 rounded-xl hover:bg-blue-50"
          >
            <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transform group-hover:rotate-3 transition-all duration-200">
              <FaDownload className="text-white text-lg" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Tubenix
              </h1>
              <p className="text-sm font-medium text-gray-500 group-hover:text-gray-600 transition-colors">
                Video Downloader
              </p>
            </div>
          </button>

          <nav className="flex items-center space-x-2">
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Home
            </button>
            <button
              onClick={() => handleNavigationWithAds('/files', 'files')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Files
            </button>
            <button
              onClick={() => handleNavigationWithAds('/live-downloads', 'live-downloads')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Live Downloads
            </button>
            <button
              onClick={() => handleNavigationWithAds('/sites', 'sites')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Sites
            </button>
            <button
              onClick={() => handleNavigationWithAds('/donate', 'donate')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Donate
            </button>
            <button
              onClick={() => handleNavigationWithAds('/support', 'support')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Support
            </button>
            <button
              onClick={() => handleNavigationWithAds('/settings', 'settings')}
              className="px-4 py-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-all duration-200 transform hover:scale-105"
            >
              Settings
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
