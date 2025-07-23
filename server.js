// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const axios = require('axios');
const { analyzeToken } = require('./agents/analystAgent');
const { generateFinalReport } = require('./agents/synthesizerAgent');

const app = express();
const port = 3001;

// --- MIDDLEWARE SETUP ---
// In server.js
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net/npm/"],
     connectSrc: ["'self'", "https://api.coingecko.com"],
    // Add 'unsafe-inline' to allow inline styles
    styleSrc: ["'self'", "https://cdn.jsdelivr.net/npm/", "'unsafe-inline'"], 
    imgSrc: ["'self'", "data:"],
    
  },
}));


// Then, configure CORS and JSON parsing.
app.use(cors());
app.use(express.json());

// Finally, set up the static file server to serve your frontend.
app.use(express.static(path.join(__dirname)));


// --- API ROUTES ---
app.post('/analyze', async (req, res) => {
  const { tokenAddress } = req.body;

  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  console.log(`🚀 Received request to analyze: ${tokenAddress}`);

  try {
    const analysis = await analyzeToken(tokenAddress);
    const finalReport = await generateFinalReport(analysis.summary);
    res.json({ report: finalReport, chainId: analysis.chainId });
  } catch (error) {
    console.error("An error occurred:", error.message);
    // Send back the specific error message for easier debugging on the frontend
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// New endpoint to proxy CoinGecko coin ID lookup
app.get('/api/coingecko/coin/:chainId/:tokenAddress', async (req, res) => {
  const { chainId, tokenAddress } = req.params;
  
  const chainPlatform = {
    'eth': 'ethereum', 'solana': 'solana', 'base': 'base',
    'bsc': 'binance-smart-chain', 'arbitrum': 'arbitrum-one',
    'polygon': 'polygon-pos', 'avalanche': 'avalanche'
  }[chainId];
  
  if (!chainPlatform) {
    return res.status(400).json({ error: 'Unsupported chain ID' });
  }
  
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${chainPlatform}/contract/${tokenAddress}`;
    const response = await axios.get(url, {
      headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
    });
    res.json({ id: response.data.id });
  } catch (error) {
    console.error('CoinGecko coin lookup error:', error.message);
    res.status(404).json({ error: 'Coin not found' });
  }
});

// New endpoint to proxy CoinGecko chart data
app.get('/api/coingecko/chart/:coinId', async (req, res) => {
  const { coinId } = req.params;
  
  try {
    const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;
    const response = await axios.get(url, {
      headers: { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
    });
    res.json(response.data);
  } catch (error) {
    console.error('CoinGecko chart data error:', error.message);
    res.status(404).json({ error: 'Chart data not found' });
  }
});

// --- START SERVER ---
app.listen(port, () => {
  console.log(`✅ Alpha Swarm server listening on http://localhost:${port}`);
});