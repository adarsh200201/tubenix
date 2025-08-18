#!/bin/bash

echo "🚀 Starting Production Deployment..."

# Step 1: Build client for production
echo "📦 Building client for production..."
cd client
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Client build failed!"
    exit 1
fi
cd ..

# Step 2: Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install --production
if [ $? -ne 0 ]; then
    echo "❌ Server dependency installation failed!"
    exit 1
fi

# Step 3: Install puppeteer browsers for production
echo "📦 Installing Puppeteer browsers..."
npx puppeteer browsers install chrome
if [ $? -ne 0 ]; then
    echo "⚠️ Puppeteer browser installation failed, continuing anyway..."
fi
cd ..

# Step 4: Copy production environment
echo "⚙️ Setting up production environment..."
cp server/.env.production server/.env

# Step 5: Test production server
echo "🧪 Testing production server..."
cd server
timeout 10s node server.js &
SERVER_PID=$!
sleep 5

# Check if server is responding
curl -f http://localhost:5000/api/health > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Production server test passed!"
    kill $SERVER_PID 2>/dev/null
else
    echo "❌ Production server test failed!"
    kill $SERVER_PID 2>/dev/null
    exit 1
fi
cd ..

echo "✅ Production deployment ready!"
echo "📋 Next steps:"
echo "  1. Push code to your git repository"
echo "  2. Deploy to Render using the git repository"
echo "  3. Set environment variables on Render dashboard"
echo "  4. The app will automatically build and start"
