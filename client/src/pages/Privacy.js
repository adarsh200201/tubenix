import React from 'react';
import { FaShieldAlt } from 'react-icons/fa';
import Header from '../components/Header';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-grow py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="text-center mb-8">
              <FaShieldAlt className="text-4xl text-green-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800">Privacy Policy</h1>
              <p className="text-gray-600 mt-2">Last updated: January 17, 2025</p>
            </div>

          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Information We Collect</h2>
            
            <h3 className="text-lg font-medium text-gray-800 mb-3">Information You Provide</h3>
            <p className="text-gray-600 mb-4">
              We collect information you provide directly to us, such as when you contact our support team or submit feedback.
            </p>

            <h3 className="text-lg font-medium text-gray-800 mb-3">Information We Collect Automatically</h3>
            <p className="text-gray-600 mb-4">When you use our service, we automatically collect certain information, including:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Log information (IP address, browser type, operating system)</li>
              <li>Usage information (features used, time spent on service)</li>
              <li>Device information (device type, unique device identifiers)</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">2. How We Use Your Information</h2>
            <p className="text-gray-600 mb-4">We use the information we collect to:</p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>Provide, maintain, and improve our service</li>
              <li>Process downloads and provide technical support</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, investigate, and prevent fraudulent transactions and other illegal activities</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Information Sharing and Disclosure</h2>
            <p className="text-gray-600 mb-6">
              We do not sell, trade, or otherwise transfer your personal information to third parties. We may share your information in the following circumstances:
            </p>
            <ul className="list-disc list-inside text-gray-600 mb-6 space-y-2">
              <li>With your consent</li>
              <li>For legal reasons (compliance with laws, legal process, or government requests)</li>
              <li>To protect our rights, property, or safety, or that of our users or others</li>
            </ul>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Data Security</h2>
            <p className="text-gray-600 mb-6">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no internet transmission is completely secure, and we cannot guarantee absolute security.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Data Retention</h2>
            <p className="text-gray-600 mb-6">
              We retain your information only for as long as necessary to provide our services and fulfill the purposes outlined in this privacy policy. We do not store downloaded content or maintain permanent records of user activities.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Cookies and Similar Technologies</h2>
            <p className="text-gray-600 mb-6">
              We use cookies and similar tracking technologies to track activity on our service and store certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Third-Party Services</h2>
            <p className="text-gray-600 mb-6">
              Our service may contain links to third-party websites or services. We are not responsible for the privacy practices or content of these third-party services. We encourage you to review their privacy policies.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Children's Privacy</h2>
            <p className="text-gray-600 mb-6">
              Our service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that a child has provided us with personal information, please contact us.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Changes to This Privacy Policy</h2>
            <p className="text-gray-600 mb-6">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>

            <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Contact Us</h2>
            <p className="text-gray-600 mb-6">
              If you have any questions about this Privacy Policy, please contact us at privacy@tubenix.com
            </p>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
