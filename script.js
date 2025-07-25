document.addEventListener('DOMContentLoaded', () => {
    
    // Safely extend dayjs with UTC plugin if available
    if (typeof dayjs !== 'undefined' && window.dayjs_plugin_utc) {
        dayjs.extend(window.dayjs_plugin_utc);
    }

    const analyzeBtn = document.getElementById('analyzeBtn');
    const tokenInput = document.getElementById('tokenAddressInput');
    const loadingIndicator = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const aiReportEl = document.getElementById('aiReport');
    const chartCanvas = document.getElementById('priceChart');
    
    // New elements for enhanced features
    const arbitrageContainer = document.getElementById('arbitrageContainer');
    const arbitrageResults = document.getElementById('arbitrageResults');
    const pricesContainer = document.getElementById('pricesContainer');
    const pricesGrid = document.getElementById('pricesGrid');
    const securityContainer = document.getElementById('securityContainer');
    const securityResults = document.getElementById('securityResults');
    
    let priceChartInstance = null;
    
    // Check if required elements exist
    if (!analyzeBtn || !tokenInput) {
        console.error('Required elements not found in DOM');
        return;
    }
    
    console.log('✅ Script loaded, button event listener attached');

    // IMPORTANT: Make sure this is your real CoinGecko API Key
    const COINGECKO_API_KEY = "CG-5iPgymTxfoceTmtcaKp1fBLc";

    // --- Main Event Listener ---
    analyzeBtn.addEventListener('click', async () => {
        console.log('🔥 Analyze button clicked!'); // Debug log
        const tokenAddress = tokenInput.value.trim();
        if (!tokenAddress) {
            alert('Please enter a token address.');
            return;
        }

        // 1. Update UI to show loading state
        loadingIndicator.style.display = 'block';
        resultsSection.style.display = 'none';
        analyzeBtn.disabled = true;

        try {
            // 2. Fetch the AI report and additional data from our server
            const analysisData = await fetchAiReport(tokenAddress);
            const { report, chainId, additionalData } = analysisData;
            aiReportEl.textContent = report;

            // 3. Fetch and display arbitrage opportunities
            await fetchAndDisplayArbitrage(tokenAddress);

            // 4. Fetch and display multi-chain prices
            await fetchAndDisplayPrices(tokenAddress);

            // 5. Fetch and display security analysis
            await fetchAndDisplaySecurity(tokenAddress, chainId);

            // 6. Use chain ID and address to get chart data from CoinGecko
            const coinId = await fetchCoinGeckoId(tokenAddress, chainId);
            if (coinId) {
                const chartData = await fetchChartData(coinId);
                if (chartData && chartData.prices) {
                    renderChart(chartData);
                } else {
                    if (priceChartInstance) priceChartInstance.destroy();
                    console.log('Could not fetch chart data for this coin.');
                }
            } else {
                if (priceChartInstance) priceChartInstance.destroy();
                console.log('Could not find this token on CoinGecko to create a chart.');
            }

        } catch (error) {
            aiReportEl.textContent = 'An error occurred. ' + error.message;
            console.error('Analysis error:', error);
        } finally {
            // 4. Hide loading and show results
            loadingIndicator.style.display = 'none';
            resultsSection.style.display = 'block';
            analyzeBtn.disabled = false;
        }
    });

    // --- API Fetching Functions ---

    async function fetchAiReport(tokenAddress) {
        const response = await fetch('/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tokenAddress }),
        });
        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Failed to get AI report from the server.');
        }
        return await response.json();
    }

    async function fetchCoinGeckoId(tokenAddress, chainId) {
        if (!chainId) return null;
        const chainPlatform = {
            'eth': 'ethereum', 'solana': 'solana', 'base': 'base',
            'bsc': 'binance-smart-chain', 'arbitrum': 'arbitrum-one',
            'polygon': 'polygon-pos', 'avalanche': 'avalanche'
        }[chainId];
        
        if (!chainPlatform) return null;
        
        const url = `https://api.coingecko.com/api/v3/coins/${chainPlatform}/contract/${tokenAddress}`;
        const response = await fetch(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
        });
        if (!response.ok) return null;
        const data = await response.json();
        return data.id;
    }

    async function fetchChartData(coinId) {
        if (!coinId) return null;
        const url = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7`;
        const response = await fetch(url, {
            headers: { 'x-cg-demo-api-key': COINGECKO_API_KEY }
        });
        if (!response.ok) return null;
        return await response.json();
    }

    // New function to fetch and display arbitrage opportunities
    async function fetchAndDisplayArbitrage(tokenAddress) {
        try {
            const response = await fetch('/arbitrage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenAddress, minProfit: 25 })
            });
            
            if (!response.ok) {
                console.log('Could not fetch arbitrage data');
                return;
            }
            
            const data = await response.json();
            displayArbitrageOpportunities(data);
        } catch (error) {
            console.error('Arbitrage fetch error:', error);
        }
    }

    // New function to fetch and display multi-chain prices
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
            
            if (!response.ok) {
                console.log('Could not fetch multi-chain prices');
                return;
            }
            
            const data = await response.json();
            displayMultiChainPrices(data);
        } catch (error) {
            console.error('Prices fetch error:', error);
        }
    }

    // New function to fetch and display security analysis
    async function fetchAndDisplaySecurity(tokenAddress, chainId) {
        try {
            const response = await fetch('/security', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenAddress, chainId })
            });
            
            if (!response.ok) {
                console.log('Could not fetch security data');
                return;
            }
            
            const data = await response.json();
            displaySecurityAnalysis(data);
        } catch (error) {
            console.error('Security fetch error:', error);
        }
    }

    // --- Chart Rendering Function ---

    function renderChart(chartData) {
        if (priceChartInstance) {
            priceChartInstance.destroy();
        }
        const ctx = chartCanvas.getContext('2d');
        const labels = chartData.prices.map(price => dayjs(price[0]));
        const data = chartData.prices.map(price => price[1]);

        priceChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Price (USD)',
                    data: data,
                    borderColor: 'hsl(195, 85%, 55%)',
                    backgroundColor: 'hsla(195, 85%, 55%, 0.1)',
                    tension: 0.1,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day', tooltipFormat: 'MMM D, YYYY' },
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: 'rgba(255, 255, 255, 0.7)' }
                    },
                    y: {
                        beginAtZero: false,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.7)',
                            callback: (value) => '$' + value.toLocaleString()
                        }
                    }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // Display functions for new features
    function displayArbitrageOpportunities(data) {
        if (!data.opportunities || data.opportunities.length === 0) {
            arbitrageResults.innerHTML = '<p>No profitable arbitrage opportunities found (minimum $25 profit).</p>';
            arbitrageContainer.style.display = 'block';
            return;
        }

        let html = `<p>Found ${data.opportunities.length} profitable opportunities:</p>`;
        html += '<div class="grid">';
        
        data.opportunities.slice(0, 3).forEach(opp => {
            const riskColor = opp.riskLevel === 'Low' ? 'green' : opp.riskLevel === 'Medium' ? 'orange' : 'red';
            html += `
                <article style="border-left: 4px solid ${riskColor};">
                    <h6>${opp.buyChain.toUpperCase()} → ${opp.sellChain.toUpperCase()}</h6>
                    <p><strong>Net Profit:</strong> $${opp.netProfit.toFixed(2)} (${opp.netProfitPercentage.toFixed(2)}%)</p>
                    <p><strong>Buy Price:</strong> $${opp.buyPrice.toFixed(6)}</p>
                    <p><strong>Sell Price:</strong> $${opp.sellPrice.toFixed(6)}</p>
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
                    <p><strong>Market Cap:</strong> $${info.marketCap ? info.marketCap.toLocaleString() : 'N/A'}</p>
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
                    <p><strong>Decimals:</strong> ${data.metadata.metadata?.decimals || 'N/A'}</p>
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
});