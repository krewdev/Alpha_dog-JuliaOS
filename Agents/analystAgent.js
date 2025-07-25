// agents/analystAgent.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');
const { getTokenMetadata, analyzeTokenSecurity, getGasEstimates } = require('./alchemyAgent');
const { getCoinData, getMarketAnalysis, getExchangeListings } = require('./coingeckoAgent');
const { findArbitrageOpportunities } = require('./arbitrageAgent');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function getTokenData(tokenAddress) {
  try {
    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const response = await axios.get(url);
    if (!response.data.pairs || response.data.pairs.length === 0) {
        console.error("No pairs found for this token.");
        return null;
    }
    const pairsWithLiquidity = response.data.pairs.filter(p => p.liquidity && p.liquidity.usd);
    if (pairsWithLiquidity.length === 0) {
        console.error("No pairs with liquidity found for this token.");
        return null;
    }
    const mostLiquidPair = pairsWithLiquidity.sort((a,b) => b.liquidity.usd - a.liquidity.usd)[0];
    return mostLiquidPair;
  } catch (error) {
    console.error("Error fetching token data:", error.message);
    return null;
  }
}

async function analyzeToken(tokenAddress) {
  console.log(`🔍 Starting comprehensive analysis for token: ${tokenAddress}`);
  
  try {
    // Gather data from multiple sources in parallel
    const [dexData, alchemyData, coinGeckoData, securityData, arbitrageData] = await Promise.allSettled([
      getTokenData(tokenAddress),
      getTokenMetadata(tokenAddress),
      getCoinData(tokenAddress, 'ethereum'), // Default to Ethereum, will be updated based on DexScreener data
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

    console.log(`✅ Gathered data from ${[tokenData, alchemy, coinGecko, security, arbitrage].filter(Boolean).length}/5 sources`);

    // Get additional market analysis if CoinGecko data is available
    let marketAnalysis = null;
    let exchangeListings = [];
    
    if (coinGecko && coinGecko.id) {
      try {
        const [marketResult, exchangeResult] = await Promise.allSettled([
          getMarketAnalysis(coinGecko.id),
          getExchangeListings(coinGecko.id)
        ]);
        
        marketAnalysis = marketResult.status === 'fulfilled' ? marketResult.value : null;
        exchangeListings = exchangeResult.status === 'fulfilled' ? exchangeResult.value : [];
      } catch (error) {
        console.log('Could not fetch additional market data:', error.message);
      }
    }

    // Compile comprehensive analysis prompt
    const prompt = `
      You are a senior crypto analyst. Provide a comprehensive analysis of this token based on the following multi-source data:

      ## DexScreener Data:
      - Token: ${tokenData.baseToken.name} (${tokenData.baseToken.symbol})
      - Price: $${tokenData.priceUsd}
      - Liquidity: $${tokenData.liquidity?.usd || 'N/A'}
      - 24h Volume: $${tokenData.volume?.h24 || 'N/A'}
      - DEX: ${tokenData.dexId}
      - Chain: ${tokenData.chainId}
      - Price Change 24h: ${tokenData.priceChange?.h24 || 'N/A'}%

      ${alchemy ? `## Blockchain Data (Alchemy):
      - Contract Verified: ${alchemy.metadata ? 'Yes' : 'No'}
      - Token Name: ${alchemy.metadata?.name || 'N/A'}
      - Symbol: ${alchemy.metadata?.symbol || 'N/A'}
      - Decimals: ${alchemy.metadata?.decimals || 'N/A'}
      - Recent Transfers: ${alchemy.recentTransfers?.length || 0} in last 100 blocks` : ''}

      ${coinGecko ? `## Market Data (CoinGecko):
      - Market Cap Rank: ${coinGecko.market_cap_rank || 'Unranked'}
      - Market Cap: $${coinGecko.market_data?.market_cap?.usd?.toLocaleString() || 'N/A'}
      - Total Volume 24h: $${coinGecko.market_data?.total_volume?.usd?.toLocaleString() || 'N/A'}
      - All-Time High: $${coinGecko.market_data?.ath?.usd || 'N/A'}
      - Circulating Supply: ${coinGecko.market_data?.circulating_supply?.toLocaleString() || 'N/A'}` : ''}

      ${marketAnalysis ? `## Social & Development Metrics:
      - Twitter Followers: ${marketAnalysis.socialMetrics?.twitterFollowers?.toLocaleString() || 'N/A'}
      - Reddit Subscribers: ${marketAnalysis.socialMetrics?.redditSubscribers?.toLocaleString() || 'N/A'}
      - GitHub Stars: ${marketAnalysis.socialMetrics?.githubStars || 'N/A'}
      - Categories: ${marketAnalysis.basicInfo?.categories?.slice(0, 3).join(', ') || 'N/A'}` : ''}

      ${exchangeListings.length > 0 ? `## Exchange Listings:
      Top exchanges: ${exchangeListings.slice(0, 5).map(ex => ex.exchange).join(', ')}
      Total listings: ${exchangeListings.length}` : ''}

      ${security ? `## Security Analysis:
      - Is Contract: ${security.isContract ? 'Yes' : 'No'}
      - Has Metadata: ${security.securityFlags?.hasMetadata ? 'Yes' : 'No'}` : ''}

      ${arbitrage && arbitrage.opportunities?.length > 0 ? `## Arbitrage Opportunities:
      - Found ${arbitrage.opportunities.length} profitable opportunities
      - Best opportunity: ${arbitrage.opportunities[0]?.netProfit?.toFixed(2)}$ profit (${arbitrage.opportunities[0]?.buyChain} → ${arbitrage.opportunities[0]?.sellChain})
      - Chains available: ${arbitrage.chainsScanned}` : ''}

      Please provide a structured analysis with:
      1. **Token Overview** - What this token is and its basic characteristics
      2. **Market Analysis** - Price action, volume, liquidity assessment
      3. **Technical Metrics** - On-chain data, social metrics, exchange presence
      4. **Risk Assessment** - Security flags, liquidity risks, volatility
      5. **Arbitrage Potential** - Cross-chain opportunities if any
      6. **Investment Outlook** - Overall assessment and key considerations

      Keep it professional but accessible, highlighting both opportunities and risks.
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
        marketAnalysis: marketAnalysis,
        security: security,
        arbitrage: arbitrage,
        exchangeListings: exchangeListings.slice(0, 10) // Top 10 exchanges
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

module.exports = { analyzeToken };