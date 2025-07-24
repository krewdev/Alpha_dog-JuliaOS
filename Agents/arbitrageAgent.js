/*
  Agents/arbitrageAgent.js
  -----------------------------------
  Purpose: Fetch prices across chains (Ethereum via Alchemy, Solana via Birdeye)
  and identify arbitrage opportunities accounting for estimated bridging + gas fees.

  NOTE: This is a lightweight PoC implementation. In production you would expand
  to many chains / DEXs and implement accurate fee estimation.
*/
const { Alchemy, Network } = require("alchemy-sdk");
const axios = require("axios");

// --- ENV VARS ---
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY; // Ethereum API key
const BIRDEYE_API_KEY = process.env.BIRDEYE_API_KEY; // Solana API key

if (!ALCHEMY_API_KEY) console.warn("⚠️  Missing ALCHEMY_API_KEY env var – Ethereum prices will not be fetched.");
if (!BIRDEYE_API_KEY) console.warn("⚠️  Missing BIRDEYE_API_KEY env var – Solana prices will not be fetched.");

// --- HELPERS ---
async function fetchEthPrice(tokenAddress) {
  if (!ALCHEMY_API_KEY) return null;
  try {
    const config = { apiKey: ALCHEMY_API_KEY, network: Network.ETH_MAINNET };
    const alchemy = new Alchemy(config);
    // Alchemy token API supports getTokenMetadata & getTokenBalances but no direct price.
    // We'll approximate using CoinGecko fallback for now.
    const cgResp = await axios.get(
      `https://api.coingecko.com/api/v3/simple/token_price/ethereum`,
      { params: { contract_addresses: tokenAddress, vs_currencies: "usd" } }
    );
    const price = cgResp.data[tokenAddress.toLowerCase()]?.usd;
    return price ? Number(price) : null;
  } catch (err) {
    console.error("[ArbitrageAgent] Error fetching ETH price:", err.message);
    return null;
  }
}

async function fetchSolPrice(tokenAddress) {
  if (!BIRDEYE_API_KEY) return null;
  try {
    const resp = await axios.get(
      `https://public-api.birdeye.so/public/price?address=${tokenAddress}`,
      { headers: { "X-API-KEY": BIRDEYE_API_KEY } }
    );
    return resp.data?.data?.value || null;
  } catch (err) {
    console.error("[ArbitrageAgent] Error fetching SOL price:", err.message);
    return null;
  }
}

function estimateFees({ fromChain, toChain }) {
  // VERY rough static estimation (USD) – replace with live gas + bridge quote APIs.
  const L1_GAS = 5;
  const BRIDGE_FEE = 3;
  return fromChain === toChain ? L1_GAS : L1_GAS + BRIDGE_FEE;
}

async function findArbitrageOp(tokenAddress) {
  const [ethPrice, solPrice] = await Promise.all([
    fetchEthPrice(tokenAddress),
    fetchSolPrice(tokenAddress),
  ]);

  const opportunities = [];
  if (ethPrice && solPrice) {
    const priceDiff = Math.abs(ethPrice - solPrice);
    const cheaperChain = ethPrice < solPrice ? "Ethereum" : "Solana";
    const expensiveChain = ethPrice > solPrice ? "Ethereum" : "Solana";

    // Simple profitability check – 5% threshold after fees
    const grossPct = priceDiff / Math.min(ethPrice, solPrice);
    const estFees = estimateFees({ fromChain: cheaperChain, toChain: expensiveChain });
    const netPct = (priceDiff - estFees) / Math.min(ethPrice, solPrice);

    if (netPct > 0.05) {
      opportunities.push({
        from: cheaperChain,
        to: expensiveChain,
        buyPrice: cheaperChain === "Ethereum" ? ethPrice : solPrice,
        sellPrice: expensiveChain === "Ethereum" ? ethPrice : solPrice,
        grossPct: (grossPct * 100).toFixed(2),
        netPct: (netPct * 100).toFixed(2),
        estFees,
        path: [cheaperChain, "Bridge", expensiveChain],
      });
    }
  }

  return opportunities;
}

module.exports = { findArbitrageOp };