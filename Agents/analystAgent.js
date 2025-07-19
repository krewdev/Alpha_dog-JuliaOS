// agents/analystAgent.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require('axios');

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
  const text = response.text();
  
  return { summary: text, chainId: tokenData.chainId };
}

module.exports = { analyzeToken };