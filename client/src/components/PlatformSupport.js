import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FaYoutube, FaFacebookF, FaInstagram, FaTwitter, FaVimeo } from 'react-icons/fa';
import { SiTiktok, SiDailymotion } from 'react-icons/si';
import { getSupportedPlatforms } from '../services/api';

const PlatformSupport = () => {
  const [platforms, setPlatforms] = useState([]);

  const platformIcons = {
    'YouTube': FaYoutube,
    'Facebook': FaFacebookF,
    'Instagram': FaInstagram,
    'Twitter/X': FaTwitter,
    'TikTok': SiTiktok,
    'Vimeo': FaVimeo,
    'Dailymotion': SiDailymotion,
  };

  const platformColors = {
    'YouTube': 'text-red-500 bg-red-50 dark:bg-red-900/20',
    'Facebook': 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
    'Instagram': 'text-pink-500 bg-pink-50 dark:bg-pink-900/20',
    'Twitter/X': 'text-blue-400 bg-blue-50 dark:bg-blue-900/20',
    'TikTok': 'text-black dark:text-white bg-gray-50 dark:bg-gray-700',
    'Vimeo': 'text-blue-500 bg-blue-50 dark:bg-blue-900/20',
    'Dailymotion': 'text-orange-500 bg-orange-50 dark:bg-orange-900/20',
  };

  useEffect(() => {
    const loadPlatforms = async () => {
      try {
        const data = await getSupportedPlatforms();
        setPlatforms(data);
      } catch (error) {
        console.error('Failed to load platforms:', error);
        // Fallback data
        setPlatforms([
          { name: 'YouTube', supported: true, formats: ['MP4', 'WEBM', 'MP3'] },
          { name: 'Facebook', supported: true, formats: ['MP4', 'MP3'] },
          { name: 'Instagram', supported: true, formats: ['MP4', 'MP3', 'JPG'] },
          { name: 'Twitter/X', supported: true, formats: ['MP4', 'MP3'] },
          { name: 'TikTok', supported: true, formats: ['MP4', 'MP3'] },
          { name: 'Vimeo', supported: true, formats: ['MP4', 'MP3'] },
          { name: 'Dailymotion', supported: true, formats: ['MP4', 'MP3'] },
        ]);
      }
    };
    loadPlatforms();
  }, []);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white text-center mb-8">
        Supported Platforms
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {platforms.map((platform, index) => {
          const Icon = platformIcons[platform.name];
          const colorClass = platformColors[platform.name] || 'text-gray-500 bg-gray-50 dark:bg-gray-700';
          
          return (
            <motion.div
              key={platform.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              className={`${colorClass} p-4 rounded-xl text-center transition-all duration-200 hover:scale-105 hover:shadow-md`}
            >
              {Icon && <Icon className="w-8 h-8 mx-auto mb-2" />}
              <h3 className="font-semibold text-sm mb-2">{platform.name}</h3>
              <div className="flex flex-wrap justify-center gap-1">
                {platform.formats?.map((format) => (
                  <span
                    key={format}
                    className="text-xs px-2 py-1 bg-white dark:bg-gray-600 rounded-full opacity-75"
                  >
                    {format}
                  </span>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
        <p>
          More platforms coming soon! Missing your favorite platform?{' '}
          <a href="/contact" className="text-blue-600 dark:text-blue-400 hover:underline">
            Let us know
          </a>
        </p>
      </div>
    </div>
  );
};

export default PlatformSupport;
