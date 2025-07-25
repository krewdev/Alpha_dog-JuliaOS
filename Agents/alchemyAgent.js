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
        
        // Get token balances for top holders (if available)
        let topHolders = [];
        try {
            const owners = await alchemy.nft.getOwnersForContract(tokenAddress);
            topHolders = owners.slice(0, 10); // Top 10 holders
        } catch (error) {
            console.log('Could not fetch token holders:', error.message);
        }

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
            topHolders,
            recentTransfers,
            chainId
        };
    } catch (error) {
        console.error('Alchemy token metadata error:', error.message);
        return null;
    }
}

async function getTokenBalance(tokenAddress, walletAddress, chainId = 'ethereum') {
    try {
        const alchemy = new Alchemy(alchemyConfigs[chainId]);
        const balance = await alchemy.core.getTokenBalances(walletAddress, [tokenAddress]);
        return balance.tokenBalances[0];
    } catch (error) {
        console.error('Alchemy balance error:', error.message);
        return null;
    }
}

async function getGasEstimates(chainId = 'ethereum') {
    try {
        const alchemy = new Alchemy(alchemyConfigs[chainId]);
        const feeData = await alchemy.core.getFeeData();
        
        return {
            gasPrice: feeData.gasPrice,
            maxFeePerGas: feeData.maxFeePerGas,
            maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
            chainId
        };
    } catch (error) {
        console.error('Gas estimation error:', error.message);
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
            // This is a simplified approach - in production you'd want more sophisticated contract analysis
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
                verified: false, // Would need additional API calls to check verification
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
    getTokenBalance,
    getGasEstimates,
    analyzeTokenSecurity
};