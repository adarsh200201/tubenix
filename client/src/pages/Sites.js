import React from 'react';
import { FaYoutube, FaInstagram, FaFacebook, FaTiktok, FaTwitter, FaVimeo } from 'react-icons/fa';
import Header from '../components/Header';

const Sites = () => {
  const supportedSites = [
    { name: 'YouTube', icon: FaYoutube, color: 'text-red-600', formats: ['MP4 (144p-8K)', 'WebM (720p-4K)', 'MP3 (128-320kbps)', 'M4A (256kbps)'], count: '23' },
    { name: 'Instagram', icon: FaInstagram, color: 'text-pink-600', formats: ['MP4 (Stories/Reels)', 'JPG (Posts)', 'MP4 (IGTV)'], count: '12' },
    { name: 'Facebook', icon: FaFacebook, color: 'text-blue-600', formats: ['MP4 (720p-1080p)', 'MP3 (Audio)'], count: '8' },
    { name: 'TikTok', icon: FaTiktok, color: 'text-black', formats: ['MP4 (720p-1080p)', 'MP3 (Audio)', 'WebM'], count: '15' },
    { name: 'Twitter', icon: FaTwitter, color: 'text-blue-400', formats: ['MP4 (480p-1080p)', 'GIF'], count: '6' },
    { name: 'Vimeo', icon: FaVimeo, color: 'text-blue-500', formats: ['MP4 (360p-4K)', 'WebM (HD)', 'MP3'], count: '9' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Supported Sites</h1>
            <p className="text-gray-600 mb-8">Download videos and audio from these popular platforms with real format support</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {supportedSites.map((site, index) => (
              <div key={index} className="bg-white border rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-4">
                  <site.icon className={`text-3xl ${site.color} mr-4`} />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{site.name}</h3>
                    <p className="text-sm text-gray-500">{site.count} formats available</p>
                  </div>
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Supported Formats:</h4>
                  <div className="flex flex-wrap gap-2">
                    {site.formats.map((format, idx) => (
                      <span key={idx} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-mono">
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="text-xs text-gray-500">
                  ✓ High quality downloads
                  <br />
                  ✓ Multiple format options
                  <br />
                  ✓ Fast processing
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">How to Use:</h3>
            <ol className="text-sm text-blue-800 space-y-1">
              <li>1. Copy the video URL from any supported site</li>
              <li>2. Paste it into the download box on the home page</li>
              <li>3. Choose your preferred quality and format</li>
              <li>4. Click download and enjoy!</li>
            </ol>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sites;
