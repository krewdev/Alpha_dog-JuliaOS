# 🔑 API Keys Guide for Alpha_dog-JuliaOS

## 🚨 **Required API Keys**

Your enhanced Alpha_dog-JuliaOS application requires multiple API keys for full functionality. Here's where to get them:

---

## 1. 🤖 **Gemini API Key** (REQUIRED)

**What it's for**: AI-powered token analysis and report generation

**How to get it**:
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click "Get API key" or "Create API key"
4. Copy your API key

**Environment variable**: `GEMINI_API_KEY=your_actual_gemini_key_here`

**Cost**: Free tier available with generous limits

---

## 2. ⛓️ **Alchemy API Key** (REQUIRED)

**What it's for**: 
- Blockchain data and metadata
- Token security analysis
- Contract verification
- Transaction history
- Multi-chain support (Ethereum, Polygon, Arbitrum, Optimism, Base)

**How to get it**:
1. Go to [Alchemy](https://www.alchemy.com/)
2. Sign up for a free account
3. Create a new app
4. Copy your API key from the dashboard

**Environment variable**: `ALCHEMY_API_KEY=your_actual_alchemy_key_here`

**Cost**: Free tier with 300M compute units/month

---

## 3. 🦎 **CoinGecko API Key** (OPTIONAL)

**What it's for**:
- Multi-chain price data
- Market capitalization
- Trading volume
- Social metrics
- Exchange listings

**How to get it**:
1. Go to [CoinGecko API](https://www.coingecko.com/en/api)
2. Sign up for a free account
3. Generate your API key
4. Copy the key

**Environment variable**: `COINGECKO_API_KEY=your_actual_coingecko_key_here`

**Default**: Demo key included (`CG-5iPgymTxfoceTmtcaKp1fBLc`)

**Cost**: Free tier with 10,000 calls/month

---

## 🛠️ **Setup Instructions**

### **Local Development**:
Create a `.env` file in your project root:
```bash
# Environment variables for Alpha_dog-JuliaOS
GEMINI_API_KEY=your_actual_gemini_key_here
ALCHEMY_API_KEY=your_actual_alchemy_key_here
COINGECKO_API_KEY=your_actual_coingecko_key_here
PORT=3001
NODE_ENV=development
```

### **Production Deployment**:
Set these environment variables on your hosting platform:
- `GEMINI_API_KEY`
- `ALCHEMY_API_KEY`
- `COINGECKO_API_KEY`

---

## 📊 **Feature Availability Matrix**

| Feature | Gemini | Alchemy | CoinGecko |
|---------|--------|---------|-----------|
| 🤖 AI Analysis | ✅ Required | ✅ Enhanced | ✅ Enhanced |
| ⚡ Arbitrage Scanner | ❌ | ❌ | ✅ Required |
| 🌐 Multi-Chain Prices | ❌ | ❌ | ✅ Required |
| 🔒 Security Analysis | ❌ | ✅ Required | ❌ |
| 📊 Basic Token Info | ❌ | ❌ | ❌ |

**Legend**:
- ✅ **Required**: Feature won't work without this key
- ✅ **Enhanced**: Feature works better with this key
- ❌ **Not needed**: Feature doesn't use this API

---

## 🎯 **Minimum Setup for Testing**

**Just want to test the app?** You need at least:
1. **GEMINI_API_KEY** - For basic AI analysis
2. **ALCHEMY_API_KEY** - For blockchain data

The CoinGecko key is optional as a demo key is included.

---

## 🆓 **Free Tier Limits**

### **Gemini (Google AI Studio)**:
- 60 requests per minute
- 1,500 requests per day
- Free forever

### **Alchemy**:
- 300M compute units per month
- 5 apps maximum
- All networks included

### **CoinGecko**:
- 10,000 API calls per month
- Rate limit: 10-50 calls/minute
- Upgrade available for higher limits

---

## 🚨 **Important Notes**

1. **Keep your API keys secure** - Never commit them to public repositories
2. **Use environment variables** - Don't hardcode keys in your code
3. **Monitor usage** - Check your API usage regularly
4. **Backup keys** - Save your keys in a secure location
5. **Rotate regularly** - Generate new keys periodically for security

---

## 🔧 **Troubleshooting**

### **"API key not valid" errors**:
- Double-check you copied the key correctly
- Ensure no extra spaces or characters
- Verify the key is active in your API provider dashboard

### **Rate limit errors**:
- Check your usage against the free tier limits
- Consider upgrading to a paid plan
- Implement request caching if needed

### **Network errors**:
- Check your internet connection
- Verify API endpoints are accessible
- Check if your firewall is blocking requests

---

## 🎉 **Ready to Go!**

Once you have all your API keys set up:

1. **Test locally**: Run `npm start` and test with a token address
2. **Deploy**: Use any of the deployment methods in `DEPLOYMENT_GUIDE.md`
3. **Monitor**: Keep an eye on your API usage
4. **Enjoy**: Discover alpha opportunities across DeFi! 🚀

**Need help?** Check the `ENHANCED_FEATURES.md` for detailed feature documentation.