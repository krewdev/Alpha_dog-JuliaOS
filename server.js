// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { analyzeToken } = require('./Agents/analystAgent');
const { generateFinalReport } = require('./Agents/synthesizerAgent');
const { findArbitrageOpportunities, getArbitrageRoutes } = require('./Agents/arbitrageAgent');
const { getMultiChainPrices, getMarketAnalysis } = require('./Agents/coingeckoAgent');
const { getTokenMetadata, analyzeTokenSecurity } = require('./Agents/alchemyAgent');

const app = express();
const port = process.env.PORT || 3001;

// --- MIDDLEWARE SETUP ---
// In server.js
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "https://cdn.jsdelivr.net/npm/", "'unsafe-inline'"],
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
    res.json({ 
      report: finalReport, 
      chainId: analysis.chainId,
      additionalData: analysis.additionalData || null
    });
  } catch (error) {
    console.error("An error occurred:", error.message);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

// New endpoint for arbitrage opportunities
app.post('/arbitrage', async (req, res) => {
  const { tokenAddress, minProfit } = req.body;

  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  console.log(`🔍 Scanning arbitrage opportunities for: ${tokenAddress}`);

  try {
    const opportunities = await findArbitrageOpportunities(tokenAddress, minProfit || 50);
    res.json(opportunities);
  } catch (error) {
    console.error("Arbitrage scan error:", error.message);
    res.status(500).json({ error: error.message || 'Failed to scan arbitrage opportunities' });
  }
});

// New endpoint for multi-chain prices
app.post('/prices', async (req, res) => {
  const { tokenAddress, chains } = req.body;

  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  console.log(`💰 Fetching multi-chain prices for: ${tokenAddress}`);

  try {
    const prices = await getMultiChainPrices(tokenAddress, chains);
    res.json(prices);
  } catch (error) {
    console.error("Multi-chain prices error:", error.message);
    res.status(500).json({ error: error.message || 'Failed to fetch prices' });
  }
});

// New endpoint for token security analysis
app.post('/security', async (req, res) => {
  const { tokenAddress, chainId } = req.body;

  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  console.log(`🔒 Analyzing security for: ${tokenAddress}`);

  try {
    const [metadata, security] = await Promise.allSettled([
      getTokenMetadata(tokenAddress, chainId || 'ethereum'),
      analyzeTokenSecurity(tokenAddress, chainId || 'ethereum')
    ]);

    res.json({
      metadata: metadata.status === 'fulfilled' ? metadata.value : null,
      security: security.status === 'fulfilled' ? security.value : null
    });
  } catch (error) {
    console.error("Security analysis error:", error.message);
    res.status(500).json({ error: error.message || 'Failed to analyze security' });
  }
});

// New endpoint for arbitrage routes
app.post('/routes', async (req, res) => {
  const { tokenAddress } = req.body;

  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  console.log(`🛣️  Finding arbitrage routes for: ${tokenAddress}`);

  try {
    const routes = await getArbitrageRoutes(tokenAddress);
    res.json({ routes });
  } catch (error) {
    console.error("Routes error:", error.message);
    res.status(500).json({ error: error.message || 'Failed to find routes' });
  }
});


// --- START SERVER ---
app.listen(port, () => {
  console.log(`✅ Alpha Swarm server listening on http://localhost:${port}`);
});