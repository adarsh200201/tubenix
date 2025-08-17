import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import MainDownloader from './components/MainDownloader';
import Footer from './components/Footer';
import Files from './pages/Files';
import LiveDownloads from './pages/LiveDownloads';
import Sites from './pages/Sites';
import Donate from './pages/Donate';
import Support from './pages/Support';
import Settings from './pages/Settings';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100 flex flex-col">
        <div className="flex-grow">
          <Routes>
            <Route path="/" element={<MainDownloader />} />
            <Route path="/process" element={<MainDownloader />} />
            <Route path="/files" element={<Files />} />
            <Route path="/live-downloads" element={<LiveDownloads />} />
            <Route path="/sites" element={<Sites />} />
            <Route path="/donate" element={<Donate />} />
            <Route path="/support" element={<Support />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
          </Routes>
        </div>
        <Footer />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#ffffff',
              color: '#000000',
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App;
