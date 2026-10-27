// Market status and live indicative quotes service

function getMarketHours() {
  const now = new Date();
  const day = now.getUTCDay(); // 0 is Sunday, 6 is Saturday
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  const timeInMinutes = hour * 60 + minute;

  // Forex: Open from Sunday 22:00 UTC to Friday 22:00 UTC
  let forexOpen = true;
  if (day === 6) { // Saturday
    forexOpen = false;
  } else if (day === 0 && timeInMinutes < 22 * 60) { // Sunday before 22:00 UTC
    forexOpen = false;
  } else if (day === 5 && timeInMinutes >= 22 * 60) { // Friday after 22:00 UTC
    forexOpen = false;
  }

  // US Equities: Mon-Fri 13:30 - 20:00 UTC (9:30 AM - 4:00 PM EST)
  let stocksOpen = false;
  if (day >= 1 && day <= 5) {
    stocksOpen = (timeInMinutes >= 13 * 60 + 30 && timeInMinutes < 20 * 60);
  }

  // Crypto: Always open
  const cryptoOpen = true;

  let statusText = 'Markets closed';
  if (forexOpen && stocksOpen) {
    statusText = 'Forex & US Stocks open';
  } else if (stocksOpen) {
    statusText = 'US Markets open';
  } else if (forexOpen) {
    statusText = 'Forex session active';
  } else {
    statusText = 'Crypto 24/7 · Traditional markets closed';
  }

  return {
    forexOpen,
    stocksOpen,
    cryptoOpen,
    statusText,
    timestamp: now.toISOString()
  };
}

// Indicative quotes base
const baseQuotes = [
  { symbol: 'EURUSD', name: 'Euro / US Dollar', market: 'Forex', basePrice: 1.0855, digits: 4 },
  { symbol: 'BTCUSD', name: 'Bitcoin', market: 'Crypto', basePrice: 68150.00, digits: 2 },
  { symbol: 'ETHUSD', name: 'Ethereum', market: 'Crypto', basePrice: 3870.00, digits: 2 },
  { symbol: 'AAPL', name: 'Apple Inc.', market: 'Stocks', basePrice: 253.40, digits: 2 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', market: 'Stocks', basePrice: 182.90, digits: 2 },
  { symbol: 'US100', name: 'Nasdaq 100 Index', market: 'Indices', basePrice: 24080.00, digits: 1 },
  { symbol: 'USDJPY', name: 'US Dollar / Yen', market: 'Forex', basePrice: 148.95, digits: 2 }
];

// GET /api/market/status
exports.getMarketStatus = (req, res) => {
  try {
    const market = getMarketHours();
    res.json({
      success: true,
      data: market
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve market status', error: error.message });
  }
};

// GET /api/market/quotes
exports.getQuotes = (req, res) => {
  try {
    const market = getMarketHours();
    // Generate realistic slight micro-variance
    const quotes = baseQuotes.map(item => {
      const deltaPercent = (Math.sin(Date.now() / 15000 + item.basePrice) * 0.85);
      const price = item.basePrice * (1 + deltaPercent / 100);
      return {
        symbol: item.symbol,
        name: item.name,
        market: item.market,
        price: Number(price.toFixed(item.digits)),
        changePercent: Number(deltaPercent.toFixed(2)),
        isPositive: deltaPercent >= 0
      };
    });

    res.json({
      success: true,
      market,
      data: quotes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve quotes', error: error.message });
  }
};
