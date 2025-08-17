import React from 'react';
import { FaHeart, FaCoffee, FaPaypal } from 'react-icons/fa';
import Header from '../components/Header';

const Donate = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <FaHeart className="text-6xl text-red-500 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-4">Support TubeNix</h1>
              <p className="text-lg text-gray-600">
                Help us keep this service free and running for everyone!
              </p>
            </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-6">
              <div className="text-center">
                <FaCoffee className="text-4xl text-blue-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Buy us a Coffee</h3>
                <p className="text-gray-600 mb-6">
                  A small donation helps us cover server costs and development time.
                </p>
                <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
                  Donate $5
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-6">
              <div className="text-center">
                <FaPaypal className="text-4xl text-green-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">PayPal Donation</h3>
                <p className="text-gray-600 mb-6">
                  Secure donation through PayPal. Any amount is appreciated!
                </p>
                <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium">
                  Donate via PayPal
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Why Donate?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <strong className="block text-gray-800 mb-2">Server Costs</strong>
                Keep our servers running 24/7 for fast downloads
              </div>
              <div>
                <strong className="block text-gray-800 mb-2">Development</strong>
                Add new features and support more platforms
              </div>
              <div>
                <strong className="block text-gray-800 mb-2">Maintenance</strong>
                Fix bugs and ensure everything works smoothly
              </div>
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Donate;
