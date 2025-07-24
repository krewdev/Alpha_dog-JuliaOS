document.addEventListener('DOMContentLoaded', () => {
    
    dayjs.extend(window.dayjs_plugin_utc);

    const analyzeBtn = document.getElementById('analyzeBtn');
    const arbBtn = document.getElementById('arbBtn');
    const tokenInput = document.getElementById('tokenAddressInput');
    const loadingIndicator = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const aiReportEl = document.getElementById('aiReport');
    const chartCanvas = document.getElementById('priceChart');
    const arbChartCanvas = document.getElementById('arbChart');
    const sentimentEl = document.getElementById('sentimentReport');
    const arbTextEl = document.getElementById('arbText');
    let priceChartInstance = null;
    let arbChartInstance = null;

    // IMPORTANT: Make sure this is your real CoinGecko API Key
    const COINGECKO_API_KEY = "CG-5iPgymTxfoceTmtcaKp1fBLc";

    // --- Main Event Listener ---
    analyzeBtn.addEventListener('click', async () => {
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
            // 2. Fetch the AI report and chain ID from our server
            const { report, chainId } = await fetchAiReport(tokenAddress);
            aiReportEl.textContent = report;

            // 3. Use chain ID and address to get chart data from CoinGecko
            const coinId = await fetchCoinGeckoId(tokenAddress, chainId);
            if (coinId) {
                const chartData = await fetchChartData(coinId);
                if (chartData && chartData.prices) {
                    renderChart(chartData);
                } else {
                    if (priceChartInstance) priceChartInstance.destroy();
                    aiReportEl.textContent = report + "\n\n(Could not fetch chart data for this coin.)";
                }
            } else {
                if (priceChartInstance) priceChartInstance.destroy();
                aiReportEl.textContent = report + "\n\n(Could not find this token on CoinGecko to create a chart.)";
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

    // --- Arbitrage Event Listener ---
    arbBtn.addEventListener('click', async () => {
        const tokenAddress = tokenInput.value.trim();
        if (!tokenAddress) {
            alert('Please enter a token address.');
            return;
        }

        loadingIndicator.style.display = 'block';
        resultsSection.style.display = 'none';
        arbBtn.disabled = true;

        try {
            const response = await fetch('/arbitrage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tokenAddress })
            });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Failed to fetch arbitrage.');
            }
            const data = await response.json();

            // update AI analysis & sentiment
            aiReportEl.textContent = data.report;
            sentimentEl.textContent = data.sentiment || 'No sentiment available.';

            // show arbitrage results
            if (data.opportunities && data.opportunities.length) {
                arbTextEl.textContent = JSON.stringify(data.opportunities, null, 2);
                renderArbChart(data.opportunities);
            } else {
                arbTextEl.textContent = 'No profitable arbitrage opportunities found.';
                if (arbChartInstance) arbChartInstance.destroy();
            }

            // fetch chart as before if chainId exists
            if (data.chainId) {
                const coinId = await fetchCoinGeckoId(tokenAddress, data.chainId);
                if (coinId) {
                    const chartData = await fetchChartData(coinId);
                    if (chartData && chartData.prices) {
                        renderChart(chartData);
                    }
                }
            }
        } catch (err) {
            aiReportEl.textContent = 'Error: ' + err.message;
            console.error(err);
        } finally {
            loadingIndicator.style.display = 'none';
            resultsSection.style.display = 'block';
            arbBtn.disabled = false;
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

    function renderArbChart(opps) {
        if (arbChartInstance) arbChartInstance.destroy();
        const ctx = arbChartCanvas.getContext('2d');
        const datasets = opps.map((op, idx) => ({
            label: `${op.from}→${op.to}`,
            data: [{ x: idx, y: parseFloat(op.netPct), r: 10 }],
            backgroundColor: 'hsl(' + (idx * 60 % 360) + ',80%,50%)'
        }));
        arbChartInstance = new Chart(ctx, {
            type: 'bubble',
            data: { datasets },
            options: {
                plugins: { legend: { position: 'bottom' } },
                scales: {
                    x: { title: { display: true, text: 'Opportunity Index' }, ticks: { stepSize: 1 } },
                    y: { title: { display: true, text: 'Net % Profit' }, beginAtZero: true }
                }
            }
        });
    }
});