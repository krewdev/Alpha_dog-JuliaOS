// server.js
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const { analyzeToken } = require('./Agents/analystAgent');
const { generateFinalReport } = require('./Agents/synthesizerAgent');
const { findArbitrageOp } = require('./Agents/arbitrageAgent');
const { analyseSentiment } = require('./Agents/sentimentAgent');

const app = express();
const port = 3001;

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
    res.json({ report: finalReport, chainId: analysis.chainId });
  } catch (error) {
    console.error("An error occurred:", error.message);
    // Send back the specific error message for easier debugging on the frontend
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
});

app.post('/arbitrage', async (req, res) => {
  const { tokenAddress } = req.body;
  if (!tokenAddress) return res.status(400).json({ error: 'Token address is required' });

  try {
    // Basic token analysis reused
    const analysis = await analyzeToken(tokenAddress);
    const finalReport = await generateFinalReport(analysis.summary);

    // Social sentiment
    const sentiment = await analyseSentiment(tokenAddress, analysis?.symbol);

    // Arbitrage scanning
    const opportunities = await findArbitrageOp(tokenAddress);

    res.json({
      report: finalReport,
      chainId: analysis.chainId,
      sentiment,
      opportunities,
    });
  } catch (err) {
    console.error('Arbitrage route error', err.message);
    res.status(500).json({ error: err.message || 'Failed to process arbitrage' });
  }
});


// --- START SERVER ---
app.listen(port, () => {
  console.log(`✅ Alpha Swarm server listening on http://localhost:${port}`);
});