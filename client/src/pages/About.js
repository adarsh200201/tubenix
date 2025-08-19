import React from 'react';
import { motion } from 'framer-motion';
import { FaRocket, FaShieldAlt, FaGlobe, FaHeart } from 'react-icons/fa';

const About = () => {
  const features = [
    {
      icon: FaRocket,
      title: 'Lightning Fast',
      description: 'Download videos quickly with our optimized servers and advanced processing technology.'
    },
    {
      icon: FaShieldAlt,
      title: 'Safe & Secure',
      description: 'Your privacy is our priority. We don\'t store your personal data or downloaded content.'
    },
    {
      icon: FaGlobe,
      title: 'Multiple Platforms',
      description: 'Support for YouTube, Facebook, Instagram, TikTok, Twitter, Vimeo, and many more.'
    },
    {
      icon: FaHeart,
      title: 'Completely Free',
      description: 'Enjoy unlimited downloads without any hidden fees or subscription requirements.'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          About <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tubenix</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
          Tubenix is a powerful, user-friendly video downloader that helps you save your favorite videos 
          from popular social media platforms quickly and easily.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          Why Choose Tubenix?
        </h2>
        
        <div className="grid md:grid-cols-2 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.6 }}
              className="flex items-start space-x-4"
            >
              <div className="bg-blue-100 dark:bg-blue-900 p-3 rounded-full">
                <feature.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
          How It Works
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">1</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Paste URL
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Copy and paste the video URL from any supported platform
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">2</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Choose Format
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Select your preferred video quality and format (MP4, MP3, etc.)
            </p>
          </div>
          
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">3</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Download
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Click download and enjoy your video offline
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.6 }}
        className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-8 mt-8"
      >
        <h2 className="text-2xl font-bold text-amber-800 dark:text-amber-200 mb-6 text-center">
          Legal Use Notice
        </h2>

        <div className="space-y-4 text-amber-700 dark:text-amber-300">
          <p className="leading-relaxed">
            <strong>Tubenix is a legitimate tool</strong> designed for personal use, similar to other popular video downloaders like yt-dlp, youtube-dl, and browser extensions.
          </p>

          <p className="leading-relaxed">
            <strong>Personal Use:</strong> Downloading videos for personal, offline viewing is generally legal in most jurisdictions, similar to recording TV shows or saving articles for later reading.
          </p>

          <p className="leading-relaxed">
            <strong>Respect Copyright:</strong> Users are responsible for respecting copyright laws and platform terms of service. Do not redistribute downloaded content commercially without permission.
          </p>

          <p className="leading-relaxed">
            <strong>Platform Terms:</strong> While downloading may be technically possible, users should be aware of individual platform terms of service.
          </p>

          <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-4 mt-6">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              📝 Disclaimer: Tubenix provides technology for legitimate personal use. Users are responsible for complying with applicable laws and platform terms in their jurisdiction.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default About;
