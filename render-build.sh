#!/bin/bash

echo "🚀 Starting Tubenix Render deployment..."

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install
echo "✅ Server dependencies installed"

# Install Chrome for Puppeteer
echo "🌐 Installing Chrome for Puppeteer..."
npx puppeteer browsers install chrome || echo "⚠️ Chrome installation failed but continuing..."
echo "✅ Chrome installation completed"

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install
echo "✅ Client dependencies installed"

# Build client
echo "🏗️ Building client..."
npm run build
echo "✅ Client build completed"

# Go back to root
cd ..

echo "🎉 Render build completed successfully!"
