#!/bin/bash

# Local deployment script for Alpha_dog-JuliaOS
echo "🚀 Alpha_dog-JuliaOS Local Deployment"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating template..."
    cat > .env << EOF
# Environment variables for Alpha_dog-JuliaOS
GEMINI_API_KEY=your_gemini_api_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc
PORT=3001
NODE_ENV=development
EOF
    echo "📝 Created .env file. Please update GEMINI_API_KEY with your actual key."
fi

# Check if API keys are set
if grep -q "your_gemini_api_key_here" .env; then
    echo "⚠️  Please update API keys in .env file:"
    echo "   GEMINI_API_KEY: Get from https://aistudio.google.com/"
    echo "   ALCHEMY_API_KEY: Get from https://www.alchemy.com/"
    echo "   COINGECKO_API_KEY: Already set with demo key (get your own from https://www.coingecko.com/en/api)"
fi

# Start the application
echo "🔥 Starting Alpha_dog-JuliaOS..."
echo "   Application will be available at: http://localhost:3001"
echo "   Press Ctrl+C to stop"
echo ""

npm start