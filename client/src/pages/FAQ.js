import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';

const FAQ = () => {
  const [openItems, setOpenItems] = useState(new Set());

  const faqs = [
    {
      question: 'Is Tubenix free to use?',
      answer: 'Yes! Tubenix is completely free to use. You can download unlimited videos without any subscription or hidden fees.'
    },
    {
      question: 'Which platforms are supported?',
      answer: 'We support YouTube, Facebook, Instagram, Twitter/X, TikTok, Vimeo, Dailymotion, and many more platforms. Our list is constantly growing.'
    },
    {
      question: 'What video qualities are available?',
      answer: 'You can download videos in various qualities including 1080p, 720p, 480p, and 360p, depending on the source video quality. We also offer audio-only downloads in MP3 format.'
    },
    {
      question: 'Do you store my downloaded videos?',
      answer: 'No, we don\'t store any videos on our servers. Videos are processed in real-time and delivered directly to you. Your privacy and security are our top priorities.'
    },
    {
      question: 'Can I download private or age-restricted videos?',
      answer: 'No, you can only download publicly available videos. Private, age-restricted, or copyright-protected content cannot be downloaded to respect content creators\' rights.'
    },
    {
      question: 'Is there a download limit?',
      answer: 'Currently, there are no strict download limits for regular users. However, we may implement fair usage policies to ensure service quality for all users.'
    },
    {
      question: 'Why is my download taking so long?',
      answer: 'Download speed depends on several factors including video size, quality, server load, and your internet connection. Higher quality videos naturally take longer to process and download.'
    },
    {
      question: 'Can I download entire playlists?',
      answer: 'Currently, we support individual video downloads. Playlist downloading is a feature we\'re considering for future updates. You can use our batch download feature for multiple individual URLs.'
    },
    {
      question: 'What browsers are supported?',
      answer: 'Tubenix works on all modern browsers including Chrome, Firefox, Safari, and Edge. For the best experience, we recommend using the latest version of your preferred browser.'
    },
    {
      question: 'Is it legal to download videos?',
      answer: 'Downloading videos for personal use is generally acceptable, but always respect copyright laws and platform terms of service. Don\'t redistribute downloaded content without permission.'
    }
  ];

  const toggleItem = (index) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
          Frequently Asked Questions
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300">
          Got questions? We've got answers. Find everything you need to know about Tubenix.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6 }}
        className="space-y-4"
      >
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden"
          >
            <button
              onClick={() => toggleItem(index)}
              className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white pr-4">
                {faq.question}
              </h3>
              <motion.div
                animate={{ rotate: openItems.has(index) ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <FaChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </motion.div>
            </button>
            
            <AnimatePresence>
              {openItems.has(index) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-t border-gray-200 dark:border-gray-700"
                >
                  <div className="px-6 py-4">
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                      {faq.answer}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.6 }}
        className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-8 mt-12 text-center"
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Still have questions?
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          Can't find the answer you're looking for? Feel free to reach out to our support team.
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200">
          Contact Support
        </button>
      </motion.div>
    </div>
  );
};

export default FAQ;
