// agents/analystAgent.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

// Validate environment variable
if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

async function getTokenData(tokenAddress) {
  try {
    // Validate input
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      throw new Error('Invalid token address provided');
    }

    const url = `https://api.dexscreener.com/latest/dex/tokens/${tokenAddress}`;
    const response = await axios.get(url, {
      timeout: 10000, // 10 second timeout
      headers: {
        'User-Agent': 'Alpha-Swarm-AI/1.0'
      }
    });
    
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
    if (error.code === 'ECONNABORTED') {
      console.error("Request timeout when fetching token data");
    } else {
      console.error("Error fetching token data:", error.message);
    }
    return null;
  }
}

async function analyzeToken(tokenAddress) {
  try {
    // This line now correctly calls getTokenData, which is defined above.
    const tokenData = await getTokenData(tokenAddress);

    if (!tokenData) {
      return { summary: "Could not retrieve data for this token.", chainId: null };
    }
    
    const prompt = `
      You are a crypto analyst. Based on this data from DexScreener, provide a concise, one-paragraph summary of this token.
      Focus on what it is and its basic market metrics.
      Data: 
      - Token Name: ${tokenData.baseToken.name} (${tokenData.baseToken.symbol})
      - Price (USD): ${tokenData.priceUsd}
      - Liquidity (USD): ${tokenData.liquidity.usd}
      - 24h Volume: ${tokenData.volume.h24}
      - DEX: ${tokenData.dexId}
      - Chain: ${tokenData.chainId}
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    
    // Validate API response
    if (!response || !response.text) {
      throw new Error('Invalid response from Gemini API');
    }
    
    const text = response.text();
    
    // Validate that we got actual content
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from Gemini API');
    }
    
    return { summary: text, chainId: tokenData.chainId };
  } catch (error) {
    console.error('Error in analyzeToken:', error.message);
    return { 
      summary: `Analysis failed: ${error.message}. Please try again later.`, 
      chainId: null 
    };
  }
}

module.exports = { analyzeToken };