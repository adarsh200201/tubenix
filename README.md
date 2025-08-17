# Tubenix - Advanced Video Downloader

![Tubenix Logo](client/public/logo192.png)

Tubenix is a modern, full-stack video downloader application built with the MERN stack (MongoDB, Express.js, React.js, Node.js). It allows users to download videos from multiple platforms including YouTube, Facebook, Instagram, TikTok, Twitter, and more.

## ✨ Features

### Core Features
- **Multi-Platform Support**: YouTube, Facebook, Instagram, Twitter/X, TikTok, Vimeo, Dailymotion
- **Multiple Formats**: MP4, WEBM, MP3 downloads
- **Quality Options**: Various video qualities (1080p, 720p, 480p, 360p)
- **Batch Downloads**: Process multiple URLs simultaneously
- **Real-time Processing**: Instant video metadata extraction

### Advanced Features
- **Dark Mode**: Toggle between light and dark themes
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile
- **Drag & Drop**: Drop text files with URLs for batch processing
- **Progressive Web App**: Can be installed on devices
- **SEO Optimized**: Meta tags and social sharing ready

### Technical Features
- **Modern UI**: Built with React 18 and TailwindCSS
- **Animations**: Smooth transitions with Framer Motion
- **API Integration**: RESTful backend with Express.js
- **Error Handling**: Comprehensive error handling and user feedback
- **Toast Notifications**: Real-time user feedback

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/tubenix.git
   cd tubenix
   ```

2. **Install dependencies**
   ```bash
   # Install both server and client dependencies
   npm run install-all
   
   # Or install separately
   npm install              # Server dependencies
   cd client && npm install # Client dependencies
   ```

3. **Environment Configuration**
   ```bash
   # Copy environment files
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   
   # Edit the .env files with your configuration
   ```

4. **Start the development servers**
   ```bash
   # Start both client and server (if you have concurrently set up)
   npm run dev
   
   # Or start separately
   npm run server  # Backend on port 5000
   npm run client  # Frontend on port 3000
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000` to see the application.

## 📁 Project Structure

```
tubenix/
├── client/                 # React frontend
│   ├── public/            # Static files
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   ├── context/       # React contexts
│   │   └── styles/        # CSS files
│   └── package.json
├── server/                # Node.js backend
│   ├── routes/           # API routes
│   ├── middleware/       # Express middleware
│   ├── models/           # Database models (if using MongoDB)
│   └── server.js         # Main server file
├── package.json          # Root package.json
└── README.md
```

## 🔧 Configuration

### Environment Variables

**Server (.env)**
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

**Client (.env)**
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_APP_NAME=Tubenix
```

## 📱 Supported Platforms

| Platform | Status | Formats |
|----------|--------|---------|
| YouTube | ✅ Fully Supported | MP4, WEBM, MP3 |
| Facebook | 🔄 Coming Soon | MP4, MP3 |
| Instagram | 🔄 Coming Soon | MP4, MP3 |
| Twitter/X | 🔄 Coming Soon | MP4, MP3 |
| TikTok | 🔄 Coming Soon | MP4, MP3 |
| Vimeo | 🔄 Coming Soon | MP4, MP3 |
| Dailymotion | 🔄 Coming Soon | MP4, MP3 |

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **TailwindCSS** - Utility-first CSS framework
- **Framer Motion** - Animations and transitions
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **React Hot Toast** - Notifications

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **ytdl-core** - YouTube video extraction
- **Cheerio** - Web scraping
- **Helmet** - Security middleware
- **CORS** - Cross-origin resource sharing

### Development Tools
- **Create React App** - Frontend tooling
- **Nodemon** - Development server
- **Concurrently** - Run multiple scripts
- **ESLint** - Code linting

## 🚀 Deployment

### Frontend (Vercel/Netlify)
```bash
cd client
npm run build
# Deploy the build folder
```

### Backend (Heroku/Railway/Render)
```bash
# Set environment variables
# Deploy server folder
```

### Full Stack (Docker)
```bash
# Build and run with Docker
docker-compose up --build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Adarsh Kumar** - *Initial work* - [GitHub](https://github.com/your-username)

## 🙏 Acknowledgments

- [ytdl-core](https://github.com/fent/node-ytdl-core) for YouTube video extraction
- [React](https://reactjs.org/) for the amazing UI framework
- [TailwindCSS](https://tailwindcss.com/) for the utility-first CSS framework
- [Framer Motion](https://framer.com/motion/) for smooth animations

## 📞 Support

If you have any questions or need help, please:
- Open an issue on GitHub
- Contact us at: support@tubenix.com
- Join our Discord community

## 🔮 Roadmap

- [ ] User authentication and accounts
- [ ] Download history and favorites
- [ ] Premium features (faster downloads, no ads)
- [ ] Mobile apps (React Native)
- [ ] Desktop app (Electron)
- [ ] API for developers
- [ ] Playlist download support
- [ ] More platform integrations

---

**Made with ❤️ by Adarsh Kumar**
