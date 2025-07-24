/*
  Agents/arbitrageAgent.js
  -----------------------------------
  Updated: Now relies solely on CoinGecko to fetch prices across the top 20
  supported chains/platforms for a given token. It compares prices of wrapped
  versions on each chain to flag profitable arbitrage opportunities.
*/
const axios = require("axios");

// CoinGecko supports ~ 50 platforms; we select 20 popular ones.
const TOP_CHAINS = [
  "ethereum",
  "binance-smart-chain",
  "solana",
  "arbitrum-one",
  "polygon-pos",
  "avalanche",
  "optimism",
  "fantom",
  "base",
  "celo",
  "gnosis",
  "cronos",
  "moonriver",
  "moonbeam",
  "harmony-shard-0",
  "kava",
  "klay-token",
  "okex-chain",
  "bitgert",
  "tron",
];

function estimateFees({ fromChain, toChain }) {
  // Static estimation; you'd replace with gas + bridge quotes.
  const L1_GAS = 5; // USD
  const BRIDGE_FEE = 3; // USD
  return fromChain === toChain ? L1_GAS : L1_GAS + BRIDGE_FEE;
}

async function locateTokenAcrossChains(tokenAddress) {
  // Try each chain endpoint until we find the token; returns { id, platforms, symbol }
  for (const chain of TOP_CHAINS) {
    try {
      const url = `https://api.coingecko.com/api/v3/coins/${chain}/contract/${tokenAddress}`;
      const resp = await axios.get(url, {
        params: {
          localization: false,
          tickers: false,
          market_data: false,
          community_data: false,
          developer_data: false,
          sparkline: false,
        },
      });
      if (resp.data && resp.data.id) {
        return {
          id: resp.data.id,
          symbol: resp.data.symbol,
          platforms: resp.data.platforms || {},
        };
      }
    } catch (_) {
      /* continue */
    }
  }
  return null;
}

async function fetchPrice(chain, contractAddress) {
  try {
    const url = `https://api.coingecko.com/api/v3/simple/token_price/${chain}`;
    const resp = await axios.get(url, {
      params: {
        contract_addresses: contractAddress,
        vs_currencies: "usd",
      },
    });
    const price = resp.data[contractAddress.toLowerCase()]?.usd;
    return price ? Number(price) : null;
  } catch (err) {
    return null;
  }
}

async function findArbitrageOp(tokenAddress) {
  const tokenInfo = await locateTokenAcrossChains(tokenAddress);
  if (!tokenInfo) return [];

  const platformEntries = Object.entries(tokenInfo.platforms).filter(([chain]) => TOP_CHAINS.includes(chain));
  if (!platformEntries.length) return [];

  // Fetch prices in parallel
  const pricePromises = platformEntries.map(([chain, address]) => fetchPrice(chain, address));
  const prices = await Promise.all(pricePromises);

  const chainPrices = platformEntries.map(([chain], idx) => ({ chain, price: prices[idx] })).filter(p => p.price);

  const opportunities = [];
  for (let i = 0; i < chainPrices.length; i++) {
    for (let j = i + 1; j < chainPrices.length; j++) {
      const a = chainPrices[i];
      const b = chainPrices[j];
      if (!a.price || !b.price) continue;
      const cheaper = a.price < b.price ? a : b;
      const expensive = a.price > b.price ? a : b;
      const priceDiff = Math.abs(a.price - b.price);
      const grossPct = priceDiff / Math.min(a.price, b.price);
      const estFees = estimateFees({ fromChain: cheaper.chain, toChain: expensive.chain });
      const netPct = (priceDiff - estFees) / Math.min(a.price, b.price);

      if (netPct > 0.05) {
        opportunities.push({
          from: cheaper.chain,
          to: expensive.chain,
          buyPrice: cheaper.price,
          sellPrice: expensive.price,
          grossPct: (grossPct * 100).toFixed(2),
          netPct: (netPct * 100).toFixed(2),
          estFees,
          path: [cheaper.chain, "Bridge", expensive.chain],
        });
      }
    }
  }

  // Sort by highest netPct
  opportunities.sort((a, b) => parseFloat(b.netPct) - parseFloat(a.netPct));
  return opportunities;
}

module.exports = { findArbitrageOp };