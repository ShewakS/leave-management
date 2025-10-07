#!/bin/bash

# Sri Eshwar Leave Portal - Backend Deployment Script
echo "🚀 Deploying Sri Eshwar Leave Portal Backend..."

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run database migrations if needed
echo "🗄️  Setting up database..."
# Add any database setup commands here

# Build the application (if needed)
echo "🔨 Building application..."
npm run build

# Start the server
echo "🌟 Starting server..."
npm start

echo "✅ Backend deployed successfully!"
echo "📍 Server running on port 3001"
