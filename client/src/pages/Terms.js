import React from 'react';
import { FaFileContract } from 'react-icons/fa';
import Header from '../components/Header';

const Terms = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <FaFileContract className="text-4xl text-blue-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800">Terms and Conditions</h1>
              <p className="text-gray-600 mt-2">Last updated: January 17, 2025</p>
            </div>

          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Acceptance of Terms</h2>
            <p className="text-gray-600 mb-6">
              By accessing and using TubeNix, you accept and agree to be bound by the terms and provision of this agreement.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Use License</h2>
            <p className="text-gray-600 mb-4">
              Permission is granted to temporarily download one copy of TubeNix per device for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>modify or copy the materials</li>
              <li>use the materials for any commercial purpose or for any public display</li>
              <li>attempt to reverse engineer any software contained in TubeNix</li>
              <li>remove any copyright or other proprietary notations from the materials</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Content Responsibility</h2>
            <p className="text-gray-600 mb-6">
              Users are solely responsible for ensuring they have the right to download and use any content. TubeNix does not host, store, or distribute any content. We only provide a tool to access publicly available content.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Copyright and DMCA</h2>
            <p className="text-gray-600 mb-6">
              We respect intellectual property rights. If you believe that your copyrighted work has been copied in a way that constitutes copyright infringement, please contact us with the required DMCA information.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Disclaimer</h2>
            <p className="text-gray-600 mb-6">
              The materials on TubeNix are provided on an 'as is' basis. TubeNix makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Limitations</h2>
            <p className="text-gray-600 mb-6">
              In no event shall TubeNix or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use TubeNix, even if TubeNix or a TubeNix authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Prohibited Uses</h2>
            <p className="text-gray-600 mb-4">You may not use our service:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Contact Information</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about these Terms and Conditions, please contact us at legal@tubenix.com
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
