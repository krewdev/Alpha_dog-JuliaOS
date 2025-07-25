// agents/arbitrageAgent.js
const axios = require('axios');
const { getMultiChainPrices } = require('./coingeckoAgent');
const { getGasEstimates } = require('./alchemyAgent');

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
    ethereum: 0.3, // Uniswap V3 average
    polygon: 0.25, // QuickSwap
    arbitrum: 0.3, // Uniswap V3
    optimism: 0.3, // Uniswap V3
    base: 0.3, // Uniswap V3
    bsc: 0.25 // PancakeSwap
};

// Gas costs for token swaps (in USD estimates)
const swapGasCosts = {
    ethereum: 25, // High gas
    polygon: 0.1, // Very low
    arbitrum: 2, // Low
    optimism: 2, // Low
    base: 1, // Very low
    bsc: 0.5 // Low
};

async function findArbitrageOpportunities(tokenAddress, minProfitUSD = 50) {
    try {
        console.log(`🔍 Scanning arbitrage opportunities for token: ${tokenAddress}`);
        
        // Get prices across multiple chains
        const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'];
        const prices = await getMultiChainPrices(tokenAddress, chains);
        
        // Filter out chains where token doesn't exist
        const validPrices = Object.entries(prices).filter(([chain, data]) => 
            data && data.price && data.price > 0
        );
        
        if (validPrices.length < 2) {
            return {
                opportunities: [],
                message: 'Token not found on enough chains for arbitrage analysis'
            };
        }
        
        console.log(`✅ Found token on ${validPrices.length} chains`);
        
        // Calculate all possible arbitrage opportunities
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
        
        // Sort by profitability
        opportunities.sort((a, b) => b.netProfit - a.netProfit);
        
        return {
            opportunities: opportunities.slice(0, 10), // Top 10 opportunities
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
        // Calculate price difference
        const priceDiff = sellPrice - buyPrice;
        const profitPercentage = (priceDiff / buyPrice) * 100;
        
        if (priceDiff <= 0) return null; // No profit opportunity
        
        // Calculate costs
        const buyCost = amount * buyPrice;
        const sellRevenue = amount * sellPrice;
        const grossProfit = sellRevenue - buyCost;
        
        // Trading fees
        const buyFee = buyCost * (dexFees[buyChain] / 100);
        const sellFee = sellRevenue * (dexFees[sellChain] / 100);
        
        // Gas costs
        const buyGasCost = swapGasCosts[buyChain] || 5;
        const sellGasCost = swapGasCosts[sellChain] || 5;
        
        // Bridge costs (if different chains)
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
                bridgeCost = 20; // Default bridge cost
                bridgeTime = 30; // Default bridge time
                bridgeProtocol = 'Generic Bridge';
            }
        }
        
        // Calculate net profit
        const totalCosts = buyFee + sellFee + buyGasCost + sellGasCost + bridgeCost;
        const netProfit = grossProfit - totalCosts;
        const netProfitPercentage = (netProfit / buyCost) * 100;
        
        // Risk assessment
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
            executionTime: bridgeTime + 5, // Bridge time + execution time
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
    
    // Profit margin risk
    if (profitPercentage < 2) riskScore += 3;
    else if (profitPercentage < 5) riskScore += 2;
    else if (profitPercentage < 10) riskScore += 1;
    
    // Bridge time risk
    if (bridgeTime > 30) riskScore += 3;
    else if (bridgeTime > 15) riskScore += 2;
    else if (bridgeTime > 5) riskScore += 1;
    
    // Chain risk (Ethereum is considered most stable)
    const highRiskChains = ['bsc'];
    if (highRiskChains.includes(buyChain) || highRiskChains.includes(sellChain)) {
        riskScore += 1;
    }
    
    if (riskScore >= 6) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
}

async function getArbitrageRoutes(tokenAddress) {
    try {
        // Get all possible routes for the token
        const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base', 'bsc'];
        const prices = await getMultiChainPrices(tokenAddress, chains);
        
        const routes = [];
        
        Object.entries(prices).forEach(([fromChain, fromData]) => {
            if (fromData && fromData.price) {
                Object.entries(prices).forEach(([toChain, toData]) => {
                    if (toData && toData.price && fromChain !== toChain) {
                        const bridgeKey = `${fromChain}-${toChain}`;
                        const reverseBridgeKey = `${toChain}-${fromChain}`;
                        
                        let bridgeInfo = bridgeCosts[bridgeKey] || bridgeCosts[reverseBridgeKey] || {
                            cost: 20,
                            time: 30,
                            protocol: 'Generic Bridge'
                        };
                        
                        routes.push({
                            from: fromChain,
                            to: toChain,
                            fromPrice: fromData.price,
                            toPrice: toData.price,
                            priceDiff: toData.price - fromData.price,
                            profitPercentage: ((toData.price - fromData.price) / fromData.price) * 100,
                            bridge: bridgeInfo
                        });
                    }
                });
            }
        });
        
        return routes.sort((a, b) => b.profitPercentage - a.profitPercentage);
        
    } catch (error) {
        console.error('Route calculation error:', error.message);
        return [];
    }
}

module.exports = {
    findArbitrageOpportunities,
    calculateArbitrage,
    getArbitrageRoutes,
    bridgeCosts,
    dexFees,
    swapGasCosts
};