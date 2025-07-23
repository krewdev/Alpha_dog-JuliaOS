document.addEventListener('DOMContentLoaded', () => {
    
    dayjs.extend(window.dayjs_plugin_utc);

    const analyzeBtn = document.getElementById('analyzeBtn');
    const tokenInput = document.getElementById('tokenAddressInput');
    const loadingIndicator = document.getElementById('loading');
    const resultsSection = document.getElementById('results');
    const aiReportEl = document.getElementById('aiReport');
    const chartCanvas = document.getElementById('priceChart');
    let priceChartInstance = null;

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

            // 3. Use chain ID and address to get chart data from CoinGecko via our proxy
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
        
        try {
            const response = await fetch(`/api/coingecko/coin/${chainId}/${tokenAddress}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.id;
        } catch (error) {
            console.error('Error fetching CoinGecko ID:', error);
            return null;
        }
    }

    async function fetchChartData(coinId) {
        if (!coinId) return null;
        
        try {
            const response = await fetch(`/api/coingecko/chart/${coinId}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error fetching chart data:', error);
            return null;
        }
    }

    // --- Chart Rendering Function ---

    function renderChart(chartData) {
        try {
            // Validate input data
            if (!chartData || !chartData.prices || !Array.isArray(chartData.prices)) {
                throw new Error('Invalid chart data provided');
            }

            if (chartData.prices.length === 0) {
                throw new Error('No price data available');
            }

            // Properly destroy existing chart instance
            if (priceChartInstance) {
                priceChartInstance.destroy();
                priceChartInstance = null;
            }

            // Clear canvas to prevent rendering artifacts
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);

            // Validate and process data
            const validPrices = chartData.prices.filter(price => 
                Array.isArray(price) && 
                price.length >= 2 && 
                typeof price[0] === 'number' && 
                typeof price[1] === 'number' &&
                !isNaN(price[0]) && 
                !isNaN(price[1])
            );

            if (validPrices.length === 0) {
                throw new Error('No valid price data points found');
            }

            const labels = validPrices.map(price => dayjs(price[0]));
            const data = validPrices.map(price => price[1]);

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
                        fill: true,
                        pointRadius: 2,
                        pointHoverRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
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
                                callback: (value) => {
                                    // Handle very small values
                                    if (value < 0.001) {
                                        return '$' + value.toExponential(2);
                                    }
                                    return '$' + value.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6
                                    });
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.parsed.y;
                                    if (value < 0.001) {
                                        return 'Price: $' + value.toExponential(2);
                                    }
                                    return 'Price: $' + value.toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 6
                                    });
                                }
                            }
                        }
                    },
                    // Prevent memory leaks by limiting animations
                    animation: {
                        duration: 750
                    }
                }
            });

        } catch (error) {
            console.error('Error rendering chart:', error);
            
            // Clean up on error
            if (priceChartInstance) {
                priceChartInstance.destroy();
                priceChartInstance = null;
            }

            // Display error message to user
            const ctx = chartCanvas.getContext('2d');
            ctx.clearRect(0, 0, chartCanvas.width, chartCanvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Chart rendering failed', chartCanvas.width / 2, chartCanvas.height / 2);
            ctx.fillText(error.message, chartCanvas.width / 2, chartCanvas.height / 2 + 25);
        }
    }

    // Add cleanup when page is unloaded to prevent memory leaks
    window.addEventListener('beforeunload', () => {
        if (priceChartInstance) {
            priceChartInstance.destroy();
            priceChartInstance = null;
        }
    });
});