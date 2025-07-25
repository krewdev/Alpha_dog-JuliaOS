// agents/coingeckoAgent.js
const axios = require('axios');

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY || "CG-5iPgymTxfoceTmtcaKp1fBLc";
const BASE_URL = 'https://api.coingecko.com/api/v3';

// Chain platform mappings for CoinGecko
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

async function getExchangeListings(coinId) {
    try {
        const url = `${BASE_URL}/coins/${coinId}/tickers`;
        const response = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
            params: {
                include_exchange_logo: true,
                page: 1,
                order: 'volume_desc'
            },
            timeout: 10000
        });

        return response.data.tickers.map(ticker => ({
            exchange: ticker.market.name,
            pair: `${ticker.base}/${ticker.target}`,
            price: ticker.last,
            volume: ticker.volume,
            spread: ticker.bid_ask_spread_percentage,
            trustScore: ticker.trust_score,
            lastTraded: ticker.last_traded_at
        }));
    } catch (error) {
        console.error('Exchange listings error:', error.message);
        return [];
    }
}

async function getHistoricalData(coinId, days = 30) {
    try {
        const url = `${BASE_URL}/coins/${coinId}/market_chart`;
        const response = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
            params: {
                vs_currency: 'usd',
                days: days,
                interval: days > 30 ? 'daily' : 'hourly'
            },
            timeout: 15000
        });

        return {
            prices: response.data.prices,
            volumes: response.data.total_volumes,
            marketCaps: response.data.market_caps
        };
    } catch (error) {
        console.error('Historical data error:', error.message);
        return null;
    }
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
            priceMetrics: {
                currentPrice: marketData.current_price?.usd,
                ath: marketData.ath?.usd,
                athDate: marketData.ath_date?.usd,
                atl: marketData.atl?.usd,
                atlDate: marketData.atl_date?.usd,
                priceChange24h: marketData.price_change_percentage_24h,
                priceChange7d: marketData.price_change_percentage_7d,
                priceChange30d: marketData.price_change_percentage_30d
            },
            marketMetrics: {
                marketCap: marketData.market_cap?.usd,
                volume24h: marketData.total_volume?.usd,
                circulatingSupply: marketData.circulating_supply,
                totalSupply: marketData.total_supply,
                maxSupply: marketData.max_supply,
                fdv: marketData.fully_diluted_valuation?.usd
            },
            socialMetrics: {
                twitterFollowers: data.community_data?.twitter_followers,
                telegramUsers: data.community_data?.telegram_channel_user_count,
                redditSubscribers: data.community_data?.reddit_subscribers,
                githubStars: data.developer_data?.stars,
                githubForks: data.developer_data?.forks
            }
        };
    } catch (error) {
        console.error('Market analysis error:', error.message);
        return null;
    }
}

async function getGlobalMarketData() {
    try {
        const url = `${BASE_URL}/global`;
        const response = await axios.get(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY },
            timeout: 10000
        });

        return {
            totalMarketCap: response.data.data.total_market_cap.usd,
            total24hVolume: response.data.data.total_volume.usd,
            marketCapPercentage: response.data.data.market_cap_percentage,
            activeCoins: response.data.data.active_cryptocurrencies,
            markets: response.data.data.markets,
            marketCapChange24h: response.data.data.market_cap_change_percentage_24h_usd
        };
    } catch (error) {
        console.error('Global market data error:', error.message);
        return null;
    }
}

module.exports = {
    getCoinData,
    getMultiChainPrices,
    getExchangeListings,
    getHistoricalData,
    getMarketAnalysis,
    getGlobalMarketData,
    chainPlatforms
};