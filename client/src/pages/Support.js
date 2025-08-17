import React, { useState } from 'react';
import { FaQuestionCircle, FaEnvelope, FaTelegramPlane, FaDiscord } from 'react-icons/fa';
import Header from '../components/Header';

const Support = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    alert('Support request submitted! We\'ll get back to you soon.');
  };

  const faqs = [
    {
      question: "Why isn't my video downloading?",
      answer: "Check if the video is public and the URL is correct. Some private or age-restricted videos cannot be downloaded. Also ensure the video hasn't been removed by the platform."
    },
    {
      question: "What video qualities are available?",
      answer: "We support 23 different video formats from 144p to 8K (4320p) including MP4, WebM. Audio formats include MP3, M4A with bitrates from 128kbps to 320kbps."
    },
    {
      question: "Which platforms do you support?",
      answer: "Currently we support YouTube (23 formats), Instagram (12 formats), TikTok (15 formats), Facebook (8 formats), Twitter (6 formats), and Vimeo (9 formats)."
    },
    {
      question: "Is this service free?",
      answer: "Yes! Our service is completely free. You can support us through donations to help maintain the servers and add new features."
    },
    {
      question: "How long are download links valid?",
      answer: "Direct download links are typically valid for 6-24 hours depending on the platform. For best results, download immediately after generation."
    },
    {
      question: "Can I download entire playlists?",
      answer: "Yes, we support batch downloading for YouTube playlists and channels. Use our batch downloader feature for multiple videos."
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Contact Form */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">Contact Support</h1>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a subject</option>
                  <option value="download-issue">Download Issue</option>
                  <option value="feature-request">Feature Request</option>
                  <option value="bug-report">Bug Report</option>
                  <option value="general">General Question</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  rows="6"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe your issue or question..."
                  required
                ></textarea>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition-colors"
              >
                Send Message
              </button>
            </form>

            {/* Contact Methods */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Other Ways to Reach Us</h3>
              <div className="space-y-3">
                <div className="flex items-center text-gray-600">
                  <FaEnvelope className="mr-3 text-blue-500" />
                  <span>support@tubenix.com</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaTelegramPlane className="mr-3 text-blue-500" />
                  <span>@TubeNixSupport</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <FaDiscord className="mr-3 text-blue-500" />
                  <span>TubeNix#1234</span>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Section */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              <FaQuestionCircle className="inline mr-3 text-blue-500" />
              Frequently Asked Questions
            </h2>
            
            <div className="space-y-6">
              {faqs.map((faq, index) => (
                <div key={index} className="border-b border-gray-200 pb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    {faq.question}
                  </h3>
                  <p className="text-gray-600">{faq.answer}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Before contacting support:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Check if the video URL is correct and public</li>
                <li>• Try different quality options</li>
                <li>• Clear your browser cache and cookies</li>
                <li>• Make sure your internet connection is stable</li>
              </ul>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Support;
