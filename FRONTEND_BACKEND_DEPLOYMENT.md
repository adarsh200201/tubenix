# Tubenix Frontend-Backend Deployment Guide

## Current Issue Analysis

The Tubenix application is experiencing a **frontend-backend connection issue**:

- **Frontend**: Deployed on Netlify (https://tubenix.netlify.app/)
- **Backend**: Expected on Render (https://tubenix.onrender.com/)
- **Problem**: Backend not responding to frontend requests

## Quick Fix Steps

### 1. Deploy Backend to Render

The backend needs to be deployed to Render for the Netlify frontend to work:

```bash
# From the project root
git add .
git commit -m "Fix backend deployment configuration"
git push origin main
```

Then deploy to Render:
1. Connect your GitHub repo to Render
2. Create a new Web Service
3. Use these settings:
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`

### 2. Environment Variables for Render

Set these environment variables in your Render dashboard:

```
NODE_ENV=production
RENDER=true
MONGODB_URI=your_mongodb_connection_string
CORS_ORIGIN=https://tubenix.netlify.app
MAX_BROWSERS=1
MAX_PAGES_PER_BROWSER=2
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
```

### 3. Test the Connection

After deployment, visit:
- Frontend: https://tubenix.netlify.app/
- Backend Health: https://tubenix.onrender.com/api/health

The frontend will show a connection status indicator.

## Deployment Architecture

### Option 1: Split Deployment (Current)
```
┌─────────────────┐    HTTP/HTTPS    ┌─────────────────┐
│   Netlify       │ ───────────────► │   Render        │
│   (Frontend)    │                  │   (Backend)     │
│   React App     │                  │   Node.js API   │
└─────────────────┘                  └─────────────────┘
```

**Pros**: 
- Separate scaling
- CDN for frontend
- Cost effective

**Cons**: 
- CORS complexity
- Two deployments to manage

### Option 2: Single Deployment on Render
```
┌─────────────────────────────────────┐
│           Render                    │
│  ┌─────────────┐ ┌─────────────────┐│
│  │  Frontend   │ │    Backend      ││
│  │  (Static)   │ │  (Node.js API)  ││
│  └─────────────┘ └─────────────────┘│
└─────────────────────────────────────┘
```

**Pros**: 
- Simpler deployment
- No CORS issues
- Single domain

**Cons**: 
- Higher resource usage
- No CDN benefits

## Current Configuration

### Frontend (client/src/services/api.js)
```javascript
const getApiBaseUrl = () => {
  // Development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }
  
  // Netlify deployment (production frontend)
  if (window.location.hostname.includes('netlify.app')) {
    return 'https://tubenix.onrender.com/api';
  }
  
  // Render deployment (full-stack)
  if (window.location.hostname.includes('onrender.com')) {
    return '/api'; // Same-origin requests
  }
  
  // Default fallback
  return 'https://tubenix.onrender.com/api';
};
```

### Backend CORS (server/server.js)
```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://tubenix.netlify.app',
    'https://tubenix.onrender.com',
    'https://main--tubenix.netlify.app',
    // ... other origins
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
```

## Troubleshooting

### Issue: "Backend Connection Failed"

**Symptoms**: Red error banner on frontend showing backend connection failed

**Causes & Solutions**:

1. **Backend not deployed**
   ```bash
   # Check if backend responds
   curl https://tubenix.onrender.com/api/health
   
   # If 404 or no response, deploy backend to Render
   ```

2. **CORS errors in browser console**
   ```javascript
   // Browser console shows: "Access to fetch at ... has been blocked by CORS policy"
   // Fix: Update CORS origins in server/server.js
   ```

3. **Environment variables missing**
   ```bash
   # Check Render dashboard for required env vars:
   # NODE_ENV, MONGODB_URI, CORS_ORIGIN, etc.
   ```

### Issue: "Rate Limiting" or YouTube 429 Errors

**Symptoms**: YouTube downloads fail with rate limit errors

**Solutions**:
1. Use the new enhanced YouTube downloader (already implemented)
2. Try different video URLs
3. Use "Extract Links" feature as fallback

### Issue: Puppeteer/Chrome Errors

**Symptoms**: Instagram downloads fail, Chrome not found errors

**Solutions**:
1. Ensure Render has enough memory (512MB+)
2. Check browser installation in logs
3. Reduce MAX_BROWSERS to 1 for free tier

## Deployment Scripts

### For Render Backend
```bash
# render-deploy.sh
#!/bin/bash
echo "🚀 Deploying to Render..."
npm run build
echo "✅ Build complete"
```

### For Netlify Frontend
```bash
# netlify-deploy.sh
#!/bin/bash
echo "🌐 Building for Netlify..."
cd client
npm run build
echo "✅ Frontend build complete"
```

## File Structure for Deployment

```
tubenix/
├── client/                 # Frontend (deploys to Netlify)
│   ├── src/
│   ├── public/
│   ├── netlify.toml       # Netlify configuration
│   └── package.json
├── server/                 # Backend (deploys to Render)
│   ├── routes/
│   ├── services/
│   ├── models/
│   └── package.json
├── package.json           # Root package (for Render)
├── render.yaml            # Render configuration
└── Dockerfile             # Docker deployment
```

## Environment Variables Reference

### Backend (Render)
```env
NODE_ENV=production
RENDER=true
PORT=5000
MONGODB_URI=mongodb+srv://...
CORS_ORIGIN=https://tubenix.netlify.app
MAX_BROWSERS=1
MAX_PAGES_PER_BROWSER=2
BROWSER_TIMEOUT=30000
PAGE_TIMEOUT=20000
PUPPETEER_CACHE_DIR=/opt/render/.cache/puppeteer
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=50
HELMET_ENABLED=true
```

### Frontend (Netlify)
```env
# Built into the React app
REACT_APP_API_URL=https://tubenix.onrender.com/api
```

## Testing Deployment

### 1. Backend Health Check
```bash
curl https://tubenix.onrender.com/api/health
# Should return: {"status":"Server is running","port":5000,...}
```

### 2. Frontend Connection Test
Visit https://tubenix.netlify.app/
- Look for green "✅ Backend connected" banner
- Or red "❌ Backend Connection Failed" banner with details

### 3. Full Flow Test
1. Open https://tubenix.netlify.app/
2. Paste YouTube URL: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
3. Click "Download" button
4. Should see video metadata and download options

## Cost Optimization

### Render Free Tier Limits
- 512 MB RAM
- 0.1 CPU cores  
- 500 build minutes/month
- Sleeps after 15 min inactivity

### Netlify Free Tier Limits
- 100 GB bandwidth/month
- 300 build minutes/month
- Deploy from Git

### Recommendations
1. Use Render free tier for backend
2. Use Netlify free tier for frontend
3. Optimize images and assets
4. Enable compression and caching

## Monitoring

### Health Endpoints
- Backend: `https://tubenix.onrender.com/api/health`
- Frontend: Built-in connection status component

### Logs
- Render: Dashboard > Logs
- Netlify: Dashboard > Deploy logs

### Alerts
Set up monitoring for:
- Backend response time
- Error rates
- Download success rates

## Next Steps

1. **Deploy backend to Render** - Highest priority
2. **Verify CORS configuration** - Check browser console
3. **Test video downloads** - Ensure functionality works
4. **Monitor performance** - Watch for rate limits and errors
5. **Optimize costs** - Use free tiers efficiently

## Support

If issues persist:
1. Check browser console for errors
2. Test backend health endpoint directly  
3. Verify environment variables are set
4. Review deployment logs on both platforms
