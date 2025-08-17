import React, { useState } from 'react';
import { FaCog, FaDownload, FaVolume, FaVideo, FaSave } from 'react-icons/fa';
import Header from '../components/Header';

const Settings = () => {
  const [settings, setSettings] = useState({
    defaultQuality: '720p',
    defaultFormat: 'mp4',
    autoDownload: false,
    downloadLocation: 'Downloads',
    maxConcurrentDownloads: 3,
    enableNotifications: true,
    darkMode: false,
    language: 'en'
  });

  const handleSave = () => {
    // Save settings to localStorage or send to backend
    localStorage.setItem('tubenix-settings', JSON.stringify(settings));
    alert('Settings saved successfully!');
  };

  const handleReset = () => {
    setSettings({
      defaultQuality: '720p',
      defaultFormat: 'mp4',
      autoDownload: false,
      downloadLocation: 'Downloads',
      maxConcurrentDownloads: 3,
      enableNotifications: true,
      darkMode: false,
      language: 'en'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-6">
              <FaCog className="text-2xl text-gray-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Download Settings */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                <FaDownload className="inline mr-2 text-blue-500" />
                Download Settings
              </h2>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Quality</label>
                <select
                  value={settings.defaultQuality}
                  onChange={(e) => setSettings({...settings, defaultQuality: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="144p">144p</option>
                  <option value="240p">240p</option>
                  <option value="360p">360p</option>
                  <option value="480p">480p</option>
                  <option value="720p">720p (HD)</option>
                  <option value="1080p">1080p (Full HD)</option>
                  <option value="1440p">1440p (2K)</option>
                  <option value="2160p">2160p (4K)</option>
                  <option value="highest">Highest Available</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Format</label>
                <select
                  value={settings.defaultFormat}
                  onChange={(e) => setSettings({...settings, defaultFormat: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="mp4">MP4 (Recommended)</option>
                  <option value="webm">WebM</option>
                  <option value="mp3">MP3 (Audio Only)</option>
                  <option value="m4a">M4A (Audio Only)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Concurrent Downloads</label>
                <select
                  value={settings.maxConcurrentDownloads}
                  onChange={(e) => setSettings({...settings, maxConcurrentDownloads: parseInt(e.target.value)})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoDownload"
                  checked={settings.autoDownload}
                  onChange={(e) => setSettings({...settings, autoDownload: e.target.checked})}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="autoDownload" className="text-sm font-medium text-gray-700">
                  Start downloads automatically
                </label>
              </div>
            </div>

            {/* General Settings */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                <FaVideo className="inline mr-2 text-green-500" />
                General Settings
              </h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="pt">Português</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="notifications"
                  checked={settings.enableNotifications}
                  onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="notifications" className="text-sm font-medium text-gray-700">
                  Enable download notifications
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="darkMode"
                  checked={settings.darkMode}
                  onChange={(e) => setSettings({...settings, darkMode: e.target.checked})}
                  className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="darkMode" className="text-sm font-medium text-gray-700">
                  Dark mode (Coming soon)
                </label>
              </div>

              <div>
                <h3 className="text-md font-medium text-gray-700 mb-3">Current System Statistics</h3>
                <div className="bg-gray-100 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Video Formats:</span>
                      <span className="ml-2 text-blue-600 font-bold">23</span>
                      <div className="text-xs text-gray-500">144p to 8K support</div>
                    </div>
                    <div>
                      <span className="font-medium">Audio Formats:</span>
                      <span className="ml-2 text-green-600 font-bold">12</span>
                      <div className="text-xs text-gray-500">128kbps to 320kbps</div>
                    </div>
                    <div>
                      <span className="font-medium">Total Downloads:</span>
                      <span className="ml-2 text-purple-600 font-bold">1,247</span>
                      <div className="text-xs text-gray-500">This month</div>
                    </div>
                    <div>
                      <span className="font-medium">Active Platforms:</span>
                      <span className="ml-2 text-orange-600 font-bold">6</span>
                      <div className="text-xs text-gray-500">YouTube, Instagram...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex space-x-4">
            <button
              onClick={handleSave}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <FaSave />
              <span>Save Settings</span>
            </button>
            
            <button
              onClick={handleReset}
              className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Reset to Default
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
