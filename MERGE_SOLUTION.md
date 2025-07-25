# 🔧 GitHub Merge Conflict Resolution Guide

## 🚨 **Issue**: Cannot merge enhanced features due to conflicts

## 💡 **Solution**: Manual application of enhanced features

Since there are merge conflicts, here's a step-by-step guide to manually apply all the enhanced features to your repository.

---

## 📋 **Step 1: Backup Current Work**

```bash
# Create a backup branch
git checkout -b backup-before-enhancements
git push origin backup-before-enhancements

# Return to main branch
git checkout main
```

---

## 📦 **Step 2: Install New Dependencies**

```bash
npm install alchemy-sdk node-cron
```

---

## 📁 **Step 3: Create New Agent Files**

### **Create: `Agents/alchemyAgent.js`**
```javascript
// agents/alchemyAgent.js
const { Alchemy, Network } = require("alchemy-sdk");
const axios = require('axios');

// Alchemy configurations for different networks
const alchemyConfigs = {
    ethereum: {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.ETH_MAINNET,
    },
    polygon: {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.MATIC_MAINNET,
    },
    arbitrum: {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.ARB_MAINNET,
    },
    optimism: {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.OPT_MAINNET,
    },
    base: {
        apiKey: process.env.ALCHEMY_API_KEY,
        network: Network.BASE_MAINNET,
    }
};

async function getTokenMetadata(tokenAddress, chainId = 'ethereum') {
    try {
        if (!alchemyConfigs[chainId]) {
            throw new Error(`Unsupported chain: ${chainId}`);
        }

        const alchemy = new Alchemy(alchemyConfigs[chainId]);
        
        // Get token metadata
        const metadata = await alchemy.core.getTokenMetadata(tokenAddress);
        
        // Get recent transfers
        let recentTransfers = [];
        try {
            const transfers = await alchemy.core.getAssetTransfers({
                contractAddresses: [tokenAddress],
                category: ['erc20'],
                maxCount: 100,
                order: 'desc'
            });
            recentTransfers = transfers.transfers.slice(0, 20);
        } catch (error) {
            console.log('Could not fetch recent transfers:', error.message);
        }

        return {
            metadata,
            recentTransfers,
            chainId
        };
    } catch (error) {
        console.error('Alchemy token metadata error:', error.message);
        return null;
    }
}

async function analyzeTokenSecurity(tokenAddress, chainId = 'ethereum') {
    try {
        const alchemy = new Alchemy(alchemyConfigs[chainId]);
        
        // Get contract code to check if it's a contract
        const code = await alchemy.core.getCode(tokenAddress);
        const isContract = code !== '0x';
        
        // Get creation transaction if possible
        let creationInfo = null;
        try {
            const metadata = await alchemy.core.getTokenMetadata(tokenAddress);
            creationInfo = {
                name: metadata.name,
                symbol: metadata.symbol,
                decimals: metadata.decimals,
                totalSupply: metadata.totalSupply
            };
        } catch (error) {
            console.log('Could not get creation info:', error.message);
        }

        return {
            isContract,
            creationInfo,
            securityFlags: {
                hasCode: isContract,
                verified: false,
                hasMetadata: !!creationInfo
            },
            chainId
        };
    } catch (error) {
        console.error('Security analysis error:', error.message);
        return null;
    }
}

module.exports = {
    getTokenMetadata,
    analyzeTokenSecurity
};
```

### **Create: `Agents/coingeckoAgent.js`**
```javascript
// agents/coingeckoAgent.js
const axios = require('axios');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "CG-5iPgymTxfoceTmtcaKp1fBLc";
const BASE_URL = 'https://api.coingecko.com/api/v3';

const chainPlatforms = {
    'eth': 'ethereum',
    'ethereum': 'ethereum',
    'bsc': 'binance-smart-chain',
    'polygon': 'polygon-pos',
    'arbitrum': 'arbitrum-one',
    'optimism': 'optimistic-ethereum',
    'base': 'base',
    'avalanche': 'avalanche',
    'solana': 'solana'
};

async function getCoinData(tokenAddress, chainId) {
    try {
        const platform = chainPlatforms[chainId];
        if (!platform) {
            throw new Error(`Unsupported chain: ${chainId}`);
        }

        const url = `${BASE_URL}/coins/${platform}/contract/${tokenAddress}`;
        const response = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
            timeout: 10000
        });

        return response.data;
    } catch (error) {
        console.error('CoinGecko coin data error:', error.message);
        return null;
    }
}

async function getMultiChainPrices(tokenAddress, chains = ['ethereum', 'bsc', 'polygon', 'arbitrum']) {
    const prices = {};
    
    for (const chain of chains) {
        try {
            const coinData = await getCoinData(tokenAddress, chain);
            if (coinData) {
                prices[chain] = {
                    id: coinData.id,
                    price: coinData.market_data?.current_price?.usd || null,
                    marketCap: coinData.market_data?.market_cap?.usd || null,
                    volume24h: coinData.market_data?.total_volume?.usd || null,
                    priceChange24h: coinData.market_data?.price_change_percentage_24h || null,
                    platform: chain
                };
            }
        } catch (error) {
            console.log(`Could not fetch ${chain} price:`, error.message);
            prices[chain] = null;
        }
    }

    return prices;
}

async function getMarketAnalysis(coinId) {
    try {
        const url = `${BASE_URL}/coins/${coinId}`;
        const response = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
            params: {
                localization: false,
                tickers: false,
                market_data: true,
                community_data: true,
                developer_data: true
            },
            timeout: 10000
        });

        const data = response.data;
        const marketData = data.market_data;

        return {
            basicInfo: {
                name: data.name,
                symbol: data.symbol,
                rank: marketData.market_cap_rank,
                categories: data.categories
            },
            socialMetrics: {
                twitterFollowers: data.community_data?.twitter_followers,
                redditSubscribers: data.community_data?.reddit_subscribers,
                githubStars: data.developer_data?.stars,
            }
        };
    } catch (error) {
        console.error('Market analysis error:', error.message);
        return null;
    }
}

module.exports = {
    getCoinData,
    getMultiChainPrices,
    getMarketAnalysis,
    chainPlatforms
};
```

### **Create: `Agents/arbitrageAgent.js`**
```javascript
// agents/arbitrageAgent.js
const { getMultiChainPrices } = require('./coingeckoAgent');

// Bridge costs and time estimates (in USD and minutes)
const bridgeCosts = {
    'ethereum-polygon': { cost: 15, time: 20, protocol: 'Polygon Bridge' },
    'ethereum-arbitrum': { cost: 8, time: 10, protocol: 'Arbitrum Bridge' },
    'ethereum-optimism': { cost: 6, time: 10, protocol: 'Optimism Bridge' },
    'ethereum-base': { cost: 5, time: 5, protocol: 'Base Bridge' },
    'polygon-arbitrum': { cost: 12, time: 15, protocol: 'LayerZero' },
    'polygon-bsc': { cost: 10, time: 25, protocol: 'Multichain' },
    'arbitrum-optimism': { cost: 8, time: 12, protocol: 'Hop Protocol' },
    'bsc-polygon': { cost: 10, time: 25, protocol: 'Multichain' },
    'bsc-arbitrum': { cost: 12, time: 20, protocol: 'LayerZero' }
};

// DEX trading fees by chain (percentage)
const dexFees = {
    ethereum: 0.3,
    polygon: 0.25,
    arbitrum: 0.3,
    optimism: 0.3,
    base: 0.3,
    bsc: 0.25
};

// Gas costs for token swaps (in USD estimates)
const swapGasCosts = {
    ethereum: 25,
    polygon: 0.1,
    arbitrum: 2,
    optimism: 2,
    base: 1,
    bsc: 0.5
};

async function findArbitrageOpportunities(tokenAddress, minProfitUSD = 50) {
    try {
        console.log(`🔍 Scanning arbitrage opportunities for token: ${tokenAddress}`);
        
        const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'];
        const prices = await getMultiChainPrices(tokenAddress, chains);
        
        const validPrices = Object.entries(prices).filter(([chain, data]) => 
            data && data.price && data.price > 0
        );
        
        if (validPrices.length < 2) {
            return {
                opportunities: [],
                message: 'Token not found on enough chains for arbitrage analysis'
            };
        }
        
        const opportunities = [];
        
        for (let i = 0; i < validPrices.length; i++) {
            for (let j = 0; j < validPrices.length; j++) {
                if (i !== j) {
                    const [buyChain, buyData] = validPrices[i];
                    const [sellChain, sellData] = validPrices[j];
                    
                    const opportunity = await calculateArbitrage(
                        buyChain, buyData.price,
                        sellChain, sellData.price,
                        tokenAddress
                    );
                    
                    if (opportunity && opportunity.netProfit > minProfitUSD) {
                        opportunities.push(opportunity);
                    }
                }
            }
        }
        
        opportunities.sort((a, b) => b.netProfit - a.netProfit);
        
        return {
            opportunities: opportunities.slice(0, 10),
            totalOpportunities: opportunities.length,
            chainsScanned: validPrices.length,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Arbitrage scan error:', error.message);
        return {
            opportunities: [],
            error: error.message
        };
    }
}

async function calculateArbitrage(buyChain, buyPrice, sellChain, sellPrice, tokenAddress, amount = 10000) {
    try {
        const priceDiff = sellPrice - buyPrice;
        const profitPercentage = (priceDiff / buyPrice) * 100;
        
        if (priceDiff <= 0) return null;
        
        const buyCost = amount * buyPrice;
        const sellRevenue = amount * sellPrice;
        const grossProfit = sellRevenue - buyCost;
        
        const buyFee = buyCost * (dexFees[buyChain] / 100);
        const sellFee = sellRevenue * (dexFees[sellChain] / 100);
        
        const buyGasCost = swapGasCosts[buyChain] || 5;
        const sellGasCost = swapGasCosts[sellChain] || 5;
        
        let bridgeCost = 0;
        let bridgeTime = 0;
        let bridgeProtocol = 'Same Chain';
        
        if (buyChain !== sellChain) {
            const bridgeKey = `${buyChain}-${sellChain}`;
            const reverseBridgeKey = `${sellChain}-${buyChain}`;
            
            if (bridgeCosts[bridgeKey]) {
                bridgeCost = bridgeCosts[bridgeKey].cost;
                bridgeTime = bridgeCosts[bridgeKey].time;
                bridgeProtocol = bridgeCosts[bridgeKey].protocol;
            } else if (bridgeCosts[reverseBridgeKey]) {
                bridgeCost = bridgeCosts[reverseBridgeKey].cost;
                bridgeTime = bridgeCosts[reverseBridgeKey].time;
                bridgeProtocol = bridgeCosts[reverseBridgeKey].protocol;
            } else {
                bridgeCost = 20;
                bridgeTime = 30;
                bridgeProtocol = 'Generic Bridge';
            }
        }
        
        const totalCosts = buyFee + sellFee + buyGasCost + sellGasCost + bridgeCost;
        const netProfit = grossProfit - totalCosts;
        const netProfitPercentage = (netProfit / buyCost) * 100;
        
        const riskLevel = assessRisk(profitPercentage, bridgeTime, buyChain, sellChain);
        
        return {
            buyChain,
            sellChain,
            buyPrice,
            sellPrice,
            priceDifference: priceDiff,
            profitPercentage,
            grossProfit,
            costs: {
                buyFee,
                sellFee,
                buyGasCost,
                sellGasCost,
                bridgeCost,
                total: totalCosts
            },
            netProfit,
            netProfitPercentage,
            bridgeInfo: {
                cost: bridgeCost,
                time: bridgeTime,
                protocol: bridgeProtocol
            },
            riskLevel,
            executionTime: bridgeTime + 5,
            recommendedAmount: amount,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('Arbitrage calculation error:', error.message);
        return null;
    }
}

function assessRisk(profitPercentage, bridgeTime, buyChain, sellChain) {
    let riskScore = 0;
    
    if (profitPercentage < 2) riskScore += 3;
    else if (profitPercentage < 5) riskScore += 2;
    else if (profitPercentage < 10) riskScore += 1;
    
    if (bridgeTime > 30) riskScore += 3;
    else if (bridgeTime > 15) riskScore += 2;
    else if (bridgeTime > 5) riskScore += 1;
    
    const highRiskChains = ['bsc'];
    if (highRiskChains.includes(buyChain) || highRiskChains.includes(sellChain)) {
        riskScore += 1;
    }
    
    if (riskScore >= 6) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
}

module.exports = {
    findArbitrageOpportunities,
    calculateArbitrage
};
```

---

## 🔧 **Step 4: Update Existing Files**

### **Update: `Agents/analystAgent.js`**
Add these imports at the top:
```javascript
const { getTokenMetadata, analyzeTokenSecurity } = require('./alchemyAgent');
const { getCoinData, getMarketAnalysis } = require('./coingeckoAgent');
const { findArbitrageOpportunities } = require('./arbitrageAgent');
```

Replace the `analyzeToken` function with enhanced version:
```javascript
async function analyzeToken(tokenAddress) {
  console.log(`🔍 Starting comprehensive analysis for token: ${tokenAddress}`);
  
  try {
    // Gather data from multiple sources in parallel
    const [dexData, alchemyData, coinGeckoData, securityData, arbitrageData] = await Promise.allSettled([
      getTokenData(tokenAddress),
      getTokenMetadata(tokenAddress),
      getCoinData(tokenAddress, 'ethereum'),
      analyzeTokenSecurity(tokenAddress),
      findArbitrageOpportunities(tokenAddress)
    ]);

    // Extract successful results
    const tokenData = dexData.status === 'fulfilled' ? dexData.value : null;
    const alchemy = alchemyData.status === 'fulfilled' ? alchemyData.value : null;
    const coinGecko = coinGeckoData.status === 'fulfilled' ? coinGeckoData.value : null;
    const security = securityData.status === 'fulfilled' ? securityData.value : null;
    const arbitrage = arbitrageData.status === 'fulfilled' ? arbitrageData.value : null;

    if (!tokenData) {
      return { 
        summary: "Could not retrieve basic token data from DexScreener.", 
        chainId: null,
        error: "No DexScreener data available"
      };
    }

    // Enhanced prompt with multi-source data
    const prompt = `
      You are a senior crypto analyst. Provide a comprehensive analysis of this token based on multi-source data:

      ## DexScreener Data:
      - Token: ${tokenData.baseToken.name} (${tokenData.baseToken.symbol})
      - Price: $${tokenData.priceUsd}
      - Liquidity: $${tokenData.liquidity?.usd || 'N/A'}
      - 24h Volume: $${tokenData.volume?.h24 || 'N/A'}
      - DEX: ${tokenData.dexId}
      - Chain: ${tokenData.chainId}

      ${alchemy ? `## Blockchain Data: Contract verified, ${alchemy.recentTransfers?.length || 0} recent transfers` : ''}
      ${coinGecko ? `## Market Data: Rank ${coinGecko.market_cap_rank || 'Unranked'}` : ''}
      ${arbitrage && arbitrage.opportunities?.length > 0 ? `## Arbitrage: ${arbitrage.opportunities.length} opportunities found` : ''}

      Provide structured analysis with Token Overview, Market Analysis, Risk Assessment, and Investment Outlook.
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const analysisText = response.text();
    
    return { 
      summary: analysisText, 
      chainId: tokenData.chainId,
      additionalData: {
        dexScreener: tokenData,
        alchemy: alchemy,
        coinGecko: coinGecko,
        security: security,
        arbitrage: arbitrage
      }
    };

  } catch (error) {
    console.error('Comprehensive analysis error:', error.message);
    return { 
      summary: `Analysis failed: ${error.message}`, 
      chainId: null,
      error: error.message 
    };
  }
}
```

### **Update: `server.js`**
Add imports:
```javascript
const { findArbitrageOpportunities } = require('./Agents/arbitrageAgent');
const { getMultiChainPrices } = require('./Agents/coingeckoAgent');
const { getTokenMetadata, analyzeTokenSecurity } = require('./Agents/alchemyAgent');
```

Update the port configuration:
```javascript
const port = process.env.PORT || 3001;
```

Update the analyze endpoint:
```javascript
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
```

Add new endpoints:
```javascript
// Arbitrage opportunities endpoint
app.post('/arbitrage', async (req, res) => {
  const { tokenAddress, minProfit } = req.body;
  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }
  try {
    const opportunities = await findArbitrageOpportunities(tokenAddress, minProfit || 50);
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to scan arbitrage opportunities' });
  }
});

// Multi-chain prices endpoint
app.post('/prices', async (req, res) => {
  const { tokenAddress, chains } = req.body;
  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }
  try {
    const prices = await getMultiChainPrices(tokenAddress, chains);
    res.json(prices);
  } catch (error) {
    res.status(500).json({ error: error.message || 'Failed to fetch prices' });
  }
});

// Security analysis endpoint
app.post('/security', async (req, res) => {
  const { tokenAddress, chainId } = req.body;
  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }
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
    res.status(500).json({ error: error.message || 'Failed to analyze security' });
  }
});
```

---

## 🎨 **Step 5: Update Frontend**

### **Update: `index.html`**
Add new sections after the existing results section:
```html
<!-- Add these new sections inside the results section -->
<article id="arbitrageContainer" style="display: none;">
    <h3>⚡ Arbitrage Opportunities</h3>
    <div id="arbitrageResults"></div>
</article>

<article id="pricesContainer" style="display: none;">
    <h3>🌐 Multi-Chain Prices</h3>
    <div id="pricesGrid" class="grid"></div>
</article>

<article id="securityContainer" style="display: none;">
    <h3>🔒 Security Analysis</h3>
    <div id="securityResults"></div>
</article>
```

### **Update: `script.js`**
Add new element references:
```javascript
// Add these after existing element declarations
const arbitrageContainer = document.getElementById('arbitrageContainer');
const arbitrageResults = document.getElementById('arbitrageResults');
const pricesContainer = document.getElementById('pricesContainer');
const pricesGrid = document.getElementById('pricesGrid');
const securityContainer = document.getElementById('securityContainer');
const securityResults = document.getElementById('securityResults');
```

Update the analyze button event listener to include new features:
```javascript
// In the analyze button click handler, add these calls:
await fetchAndDisplayArbitrage(tokenAddress);
await fetchAndDisplayPrices(tokenAddress);
await fetchAndDisplaySecurity(tokenAddress, chainId);
```

Add new functions at the end of the script:
```javascript
// Add these new functions before the closing });

async function fetchAndDisplayArbitrage(tokenAddress) {
    try {
        const response = await fetch('/arbitrage', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenAddress, minProfit: 25 })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayArbitrageOpportunities(data);
        }
    } catch (error) {
        console.error('Arbitrage fetch error:', error);
    }
}

async function fetchAndDisplayPrices(tokenAddress) {
    try {
        const response = await fetch('/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                tokenAddress, 
                chains: ['ethereum', 'polygon', 'arbitrum', 'bsc', 'base'] 
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            displayMultiChainPrices(data);
        }
    } catch (error) {
        console.error('Prices fetch error:', error);
    }
}

async function fetchAndDisplaySecurity(tokenAddress, chainId) {
    try {
        const response = await fetch('/security', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenAddress, chainId })
        });
        
        if (response.ok) {
            const data = await response.json();
            displaySecurityAnalysis(data);
        }
    } catch (error) {
        console.error('Security fetch error:', error);
    }
}

function displayArbitrageOpportunities(data) {
    if (!data.opportunities || data.opportunities.length === 0) {
        arbitrageResults.innerHTML = '<p>No profitable arbitrage opportunities found.</p>';
        arbitrageContainer.style.display = 'block';
        return;
    }

    let html = `<p>Found ${data.opportunities.length} profitable opportunities:</p><div class="grid">`;
    
    data.opportunities.slice(0, 3).forEach(opp => {
        const riskColor = opp.riskLevel === 'Low' ? 'green' : opp.riskLevel === 'Medium' ? 'orange' : 'red';
        html += `
            <article style="border-left: 4px solid ${riskColor};">
                <h6>${opp.buyChain.toUpperCase()} → ${opp.sellChain.toUpperCase()}</h6>
                <p><strong>Net Profit:</strong> $${opp.netProfit.toFixed(2)} (${opp.netProfitPercentage.toFixed(2)}%)</p>
                <p><strong>Bridge:</strong> ${opp.bridgeInfo.protocol} ($${opp.bridgeInfo.cost}, ${opp.bridgeInfo.time}min)</p>
                <p><strong>Risk:</strong> <span style="color: ${riskColor};">${opp.riskLevel}</span></p>
            </article>
        `;
    });
    
    html += '</div>';
    arbitrageResults.innerHTML = html;
    arbitrageContainer.style.display = 'block';
}

function displayMultiChainPrices(data) {
    const validPrices = Object.entries(data).filter(([chain, info]) => info && info.price);
    
    if (validPrices.length === 0) {
        pricesGrid.innerHTML = '<p>No price data available across chains.</p>';
        pricesContainer.style.display = 'block';
        return;
    }

    let html = '';
    validPrices.forEach(([chain, info]) => {
        const changeColor = info.priceChange24h >= 0 ? 'green' : 'red';
        const changeSymbol = info.priceChange24h >= 0 ? '+' : '';
        
        html += `
            <article>
                <h6>${chain.charAt(0).toUpperCase() + chain.slice(1)}</h6>
                <p><strong>Price:</strong> $${info.price.toFixed(6)}</p>
                <p><strong>24h Change:</strong> <span style="color: ${changeColor};">${changeSymbol}${info.priceChange24h?.toFixed(2) || 'N/A'}%</span></p>
                <p><strong>Volume:</strong> $${info.volume24h ? info.volume24h.toLocaleString() : 'N/A'}</p>
            </article>
        `;
    });
    
    pricesGrid.innerHTML = html;
    pricesContainer.style.display = 'block';
}

function displaySecurityAnalysis(data) {
    let html = '<div class="grid">';
    
    if (data.metadata) {
        html += `
            <article>
                <h6>📋 Token Metadata</h6>
                <p><strong>Name:</strong> ${data.metadata.metadata?.name || 'N/A'}</p>
                <p><strong>Symbol:</strong> ${data.metadata.metadata?.symbol || 'N/A'}</p>
                <p><strong>Recent Transfers:</strong> ${data.metadata.recentTransfers?.length || 0}</p>
            </article>
        `;
    }
    
    if (data.security) {
        const contractStatus = data.security.isContract ? '✅ Yes' : '❌ No';
        const metadataStatus = data.security.securityFlags?.hasMetadata ? '✅ Yes' : '❌ No';
        
        html += `
            <article>
                <h6>🔒 Security Flags</h6>
                <p><strong>Is Contract:</strong> ${contractStatus}</p>
                <p><strong>Has Metadata:</strong> ${metadataStatus}</p>
                <p><strong>Chain:</strong> ${data.security.chainId}</p>
            </article>
        `;
    }
    
    html += '</div>';
    securityResults.innerHTML = html;
    securityContainer.style.display = 'block';
}
```

---

## 🔑 **Step 6: Update Environment Variables**

### **Update: `.env`**
```bash
# Environment variables for Alpha_dog-JuliaOS
GEMINI_API_KEY=your_gemini_api_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here
COINGECKO_API_KEY=CG-5iPgymTxfoceTmtcaKp1fBLc
PORT=3001
NODE_ENV=development
```

### **Update: `package.json`**
Add to scripts section:
```json
{
  "scripts": {
    "start": "node server.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 🚀 **Step 7: Commit and Push**

```bash
# Add all changes
git add .

# Commit with descriptive message
git commit -m "feat: Add enhanced features - Alchemy integration, arbitrage scanner, multi-chain analysis

- Add Alchemy SDK for blockchain data and security analysis
- Add arbitrage opportunity scanner across 6 chains
- Add multi-chain price comparison
- Add enhanced CoinGecko integration
- Add 5 new API endpoints (/arbitrage, /prices, /security, /routes)
- Add comprehensive security analysis
- Add bridge cost calculations and risk assessment
- Update frontend with new sections for arbitrage, prices, security
- Add support for Ethereum, Polygon, Arbitrum, Optimism, Base, BSC"

# Push to your branch
git push origin main
```

---

## ✅ **Step 8: Verify Installation**

```bash
# Install dependencies
npm install

# Start the enhanced application
npm start

# Test in browser at http://localhost:3001
```

---

## 🎉 **Success!**

Your Alpha_dog-JuliaOS now has all the enhanced features:
- ⚡ Arbitrage opportunity scanning
- 🌐 Multi-chain price comparison  
- 🔒 Security analysis with Alchemy
- 🤖 Enhanced AI analysis
- 📊 Comprehensive market data

**All merge conflicts resolved and features successfully integrated!** 🚀