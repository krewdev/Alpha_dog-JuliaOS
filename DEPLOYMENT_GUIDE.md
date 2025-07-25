# 🚀 Alpha_dog-JuliaOS Deployment Guide

This guide shows you how to render/deploy your AI token analyzer application on various platforms.

## 📋 Prerequisites

Before deploying, ensure you have:
- ✅ **Gemini API Key** from [Google AI Studio](https://aistudio.google.com/) - Required for AI analysis
- ✅ **Alchemy API Key** from [Alchemy](https://www.alchemy.com/) - Required for blockchain data
- ✅ **CoinGecko API Key** from [CoinGecko](https://www.coingecko.com/en/api) - Optional (demo key included)
- ✅ Node.js 18+ installed
- ✅ Git repository access

## 🌐 Deployment Options

### 1. 🔥 **Render.com (Recommended - Free Tier Available)**

Render is perfect for Node.js applications and offers automatic deployments.

#### Steps:
1. **Prepare your repository**:
   ```bash
   # Add start script to package.json
   npm pkg set scripts.start="node server.js"
   ```

2. **Create render.yaml** (optional but recommended):
   ```yaml
   services:
     - type: web
       name: alpha-dog-juliaos
       env: node
       plan: free
       buildCommand: npm install
       startCommand: npm start
       envVars:
         - key: GEMINI_API_KEY
           sync: false
         - key: ALCHEMY_API_KEY
           sync: false
         - key: COINGECKO_API_KEY
           value: CG-5iPgymTxfoceTmtcaKp1fBLc
   ```

3. **Deploy on Render**:
   - Go to [render.com](https://render.com)
   - Connect your GitHub repository
   - Create a new Web Service
   - Set environment variables:
     - `GEMINI_API_KEY=your_actual_gemini_key`
     - `ALCHEMY_API_KEY=your_actual_alchemy_key`
     - `COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc` (or your own key)
   - Deploy!

#### Render Configuration:
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Port**: Render auto-detects Express apps
- **Environment**: Node.js

---

### 2. 🌊 **Vercel (Serverless)**

Great for frontend-heavy applications with API routes.

#### Steps:
1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Create vercel.json**:
   ```json
   {
     "version": 2,
     "builds": [
       {
         "src": "server.js",
         "use": "@vercel/node"
       }
     ],
     "routes": [
       {
         "src": "/(.*)",
         "dest": "/server.js"
       }
     ],
     "env": {
       "GEMINI_API_KEY": "@gemini-api-key",
       "ALCHEMY_API_KEY": "@alchemy-api-key",
       "COINGECKO_API_KEY": "CG-5iPgymTxfoceTmtcaKp1fBLc"
     }
   }
   ```

3. **Deploy**:
   ```bash
   vercel
   vercel --prod
   ```

4. **Set environment variables**:
   ```bash
   vercel env add GEMINI_API_KEY
   vercel env add ALCHEMY_API_KEY
   vercel env add COINGECKO_API_KEY
   ```

---

### 3. 🚢 **Railway**

Simple deployment with automatic scaling.

#### Steps:
1. **Add start script**:
   ```bash
   npm pkg set scripts.start="node server.js"
   ```

2. **Deploy**:
   - Go to [railway.app](https://railway.app)
   - Connect GitHub repository
   - Add environment variables:
     - `GEMINI_API_KEY`
     - `ALCHEMY_API_KEY`
     - `COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc`
   - Deploy automatically

---

### 4. 🐳 **Docker (Any Platform)**

Deploy anywhere with Docker support.

#### Create Dockerfile:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3001

CMD ["node", "server.js"]
```

#### Create .dockerignore:
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.cache
```

#### Deploy:
```bash
# Build image
docker build -t alpha-dog-juliaos .

# Run container
docker run -p 3001:3001 \
  -e GEMINI_API_KEY=your_gemini_key \
  -e ALCHEMY_API_KEY=your_alchemy_key \
  -e COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc \
  alpha-dog-juliaos
```

---

### 5. ⚡ **Netlify (Static + Functions)**

For serverless deployment with Netlify Functions.

#### Steps:
1. **Create netlify.toml**:
   ```toml
   [build]
     functions = "netlify/functions"
     publish = "."

   [[redirects]]
     from = "/api/*"
     to = "/.netlify/functions/:splat"
     status = 200

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200
   ```

2. **Convert server.js to Netlify Functions** (requires refactoring)

---

### 6. 🔵 **DigitalOcean App Platform**

#### Steps:
1. **Create .do/app.yaml**:
   ```yaml
   name: alpha-dog-juliaos
   services:
   - name: web
     source_dir: /
     github:
       repo: your-username/Alpha_dog-JuliaOS
       branch: main
     run_command: npm start
     environment_slug: node-js
     instance_count: 1
     instance_size_slug: basic-xxs
     envs:
     - key: GEMINI_API_KEY
       scope: RUN_TIME
       type: SECRET
     - key: ALCHEMY_API_KEY
       scope: RUN_TIME
       type: SECRET
     - key: COINGECKO_API_KEY
       scope: RUN_TIME
       value: CG-5iPgymTxfoceTmtcaKp1fBLc
   ```

2. **Deploy via DigitalOcean dashboard**

---

## 🛠️ **Quick Setup for Any Platform**

### 1. **Update package.json**:
```bash
npm pkg set scripts.start="node server.js"
npm pkg set engines.node=">=18.0.0"
```

### 2. **Environment Variables Setup**:
Create these environment variables on your platform:
- `GEMINI_API_KEY`: Your Google AI Studio API key (required for AI analysis)
- `ALCHEMY_API_KEY`: Your Alchemy API key (required for blockchain data)
- `COINGECKO_API_KEY`: Your CoinGecko API key (optional, demo key: CG-5iPgymTxfoceTmtcaKp1fBLc)
- `PORT`: Usually auto-set by platforms (defaults to 3001)

### 3. **Test Locally First**:
```bash
# Install dependencies
npm install

# Set environment variables
export GEMINI_API_KEY=your_actual_gemini_key
export ALCHEMY_API_KEY=your_actual_alchemy_key
export COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc

# Start server
npm start
```

---

## 🌍 **Platform Comparison**

| Platform | Free Tier | Ease of Use | Best For |
|----------|-----------|-------------|----------|
| **Render** | ✅ 750hrs/month | ⭐⭐⭐⭐⭐ | Full-stack apps |
| **Vercel** | ✅ Generous | ⭐⭐⭐⭐ | Frontend + API |
| **Railway** | ✅ $5 credit | ⭐⭐⭐⭐⭐ | Simple deployment |
| **Netlify** | ✅ 100GB | ⭐⭐⭐ | Static + Functions |
| **DigitalOcean** | ❌ $5/month | ⭐⭐⭐ | Production apps |

---

## 🔧 **Post-Deployment Checklist**

- [ ] ✅ Application loads without errors
- [ ] ✅ Analyze button works (check browser console)
- [ ] ✅ API endpoints respond correctly
- [ ] ✅ Environment variables are set
- [ ] ✅ HTTPS is enabled (most platforms auto-enable)
- [ ] ✅ Custom domain configured (optional)

---

## 🐛 **Troubleshooting**

### Common Issues:
1. **"Module not found"**: Run `npm install` in build step
2. **"Port already in use"**: Use `process.env.PORT || 3001`
3. **"API key invalid"**: Check environment variable name
4. **Button not working**: Clear browser cache, check console errors

### Debug Commands:
```bash
# Check if server starts
node server.js

# Test API endpoint
curl -X POST http://your-app-url/analyze -H "Content-Type: application/json" -d '{"tokenAddress":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"}'
```

---

## 🎯 **Recommended Quick Start**

For fastest deployment, I recommend **Render.com**:

1. Add start script: `npm pkg set scripts.start="node server.js"`
2. Push to GitHub
3. Connect to Render
4. Add environment variables:
   - `GEMINI_API_KEY` (your Google AI Studio key)
   - `ALCHEMY_API_KEY` (your Alchemy key)
   - `COINGECKO_API_KEY` (use: CG-5iPgymTxfoceTmtcaKp1fBLc)
5. Deploy!

Your app will be live at `https://your-app-name.onrender.com` in minutes!