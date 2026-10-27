const db = require('../db/database');
const { calculateTradePnl, calculateTradeResult, calculateRr } = require('../services/tradeAnalytics');

function enrichTrade(trade) {
  if (!trade) return null;
  const pnl = calculateTradePnl(trade);
  const result = calculateTradeResult(trade);
  const rr = calculateRr(trade);
  return {
    ...trade,
    netPnl: Number(pnl.toFixed(2)),
    result,
    rr: Number(rr.toFixed(2))
  };
}

// GET /api/trades
exports.getAllTrades = (req, res) => {
  try {
    const { search, direction, result, market, strategy, sort = 'date_desc' } = req.query;

    let sql = 'SELECT * FROM trades WHERE 1=1';
    const params = [];

    if (direction && direction !== 'all') {
      sql += ' AND direction = ?';
      params.push(direction);
    }

    if (market && market !== 'all') {
      sql += ' AND market = ?';
      params.push(market);
    }

    if (strategy && strategy !== 'all') {
      sql += ' AND strategy = ?';
      params.push(strategy);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(symbol) LIKE ? OR LOWER(strategy) LIKE ? OR LOWER(market) LIKE ? OR LOWER(notes) LIKE ?)';
      params.push(term, term, term, term);
    }

    // Sorting
    if (sort === 'date_asc') {
      sql += ' ORDER BY date ASC, id ASC';
    } else if (sort === 'date_desc') {
      sql += ' ORDER BY date DESC, id DESC';
    } else {
      sql += ' ORDER BY date DESC, id DESC';
    }

    const rows = db.query(sql, params);
    let enriched = rows.map(enrichTrade);

    // Filter by computed result if requested
    if (result && result !== 'all') {
      enriched = enriched.filter(t => t.result === result);
    }

    res.json({
      success: true,
      count: enriched.length,
      data: enriched
    });
  } catch (error) {
    console.error('Error fetching trades:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trades', error: error.message });
  }
};

// GET /api/trades/:id
exports.getTradeById = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const trade = db.get('SELECT * FROM trades WHERE id = ?', [id]);
    if (!trade) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }
    res.json({ success: true, data: enrichTrade(trade) });
  } catch (error) {
    console.error('Error fetching trade:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch trade', error: error.message });
  }
};

// POST /api/trades
exports.createTrade = (req, res) => {
  try {
    const {
      symbol,
      market = 'Forex',
      direction = 'Long',
      strategy = 'London Breakout',
      entry,
      exit,
      quantity = 1,
      fees = 0,
      date,
      stop_loss = null,
      notes = ''
    } = req.body;

    // Validation
    if (!symbol || !symbol.trim()) {
      return res.status(400).json({ success: false, message: 'Instrument symbol is required' });
    }
    const numEntry = Number(entry);
    const numExit = Number(exit);
    const numQty = Number(quantity);
    const numFees = Number(fees) || 0;

    if (isNaN(numEntry) || numEntry <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive entry price is required' });
    }
    if (isNaN(numExit) || numExit <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive exit price is required' });
    }
    if (isNaN(numQty) || numQty <= 0) {
      return res.status(400).json({ success: false, message: 'Valid positive quantity is required' });
    }

    const tradeDate = date || new Date().toISOString().slice(0, 10);
    const cleanSymbol = symbol.trim().toUpperCase();

    const result = db.run(`
      INSERT INTO trades (symbol, market, direction, strategy, entry, exit, quantity, fees, date, stop_loss, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [cleanSymbol, market, direction, strategy, numEntry, numExit, numQty, numFees, tradeDate, stop_loss ? Number(stop_loss) : null, notes.trim()]);

    const createdTrade = db.get('SELECT * FROM trades WHERE id = ?', [Number(result.lastInsertRowid)]);

    res.status(201).json({
      success: true,
      message: 'Trade recorded successfully',
      data: enrichTrade(createdTrade)
    });
  } catch (error) {
    console.error('Error creating trade:', error);
    res.status(500).json({ success: false, message: 'Failed to create trade', error: error.message });
  }
};

// PUT /api/trades/:id
exports.updateTrade = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.get('SELECT * FROM trades WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    const {
      symbol = existing.symbol,
      market = existing.market,
      direction = existing.direction,
      strategy = existing.strategy,
      entry = existing.entry,
      exit = existing.exit,
      quantity = existing.quantity,
      fees = existing.fees,
      date = existing.date,
      stop_loss = existing.stop_loss,
      notes = existing.notes
    } = req.body;

    db.run(`
      UPDATE trades
      SET symbol = ?, market = ?, direction = ?, strategy = ?, entry = ?, exit = ?, quantity = ?, fees = ?, date = ?, stop_loss = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `, [
      symbol.trim().toUpperCase(),
      market,
      direction,
      strategy,
      Number(entry),
      Number(exit),
      Number(quantity),
      Number(fees) || 0,
      date,
      stop_loss ? Number(stop_loss) : null,
      (notes || '').trim(),
      id
    ]);

    const updated = db.get('SELECT * FROM trades WHERE id = ?', [id]);
    res.json({
      success: true,
      message: 'Trade updated successfully',
      data: enrichTrade(updated)
    });
  } catch (error) {
    console.error('Error updating trade:', error);
    res.status(500).json({ success: false, message: 'Failed to update trade', error: error.message });
  }
};

// DELETE /api/trades/:id
exports.deleteTrade = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.get('SELECT * FROM trades WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Trade not found' });
    }

    db.run('DELETE FROM trades WHERE id = ?', [id]);
    res.json({
      success: true,
      message: `Trade #${id} (${existing.symbol}) deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({ success: false, message: 'Failed to delete trade', error: error.message });
  }
};

// GET /api/trades/export/csv
exports.exportTradesCsv = (req, res) => {
  try {
    const rows = db.query('SELECT * FROM trades ORDER BY date DESC, id DESC');
    const enriched = rows.map(enrichTrade);

    const headers = ['ID', 'Symbol', 'Market', 'Direction', 'Strategy', 'Entry Price', 'Exit Price', 'Quantity', 'Fees', 'Net PnL', 'Result', 'Risk-Reward', 'Date', 'Notes'];
    const csvLines = [headers.join(',')];

    for (const t of enriched) {
      const line = [
        t.id,
        `"${t.symbol}"`,
        `"${t.market}"`,
        `"${t.direction}"`,
        `"${t.strategy}"`,
        t.entry,
        t.exit,
        t.quantity,
        t.fees,
        t.netPnl,
        `"${t.result}"`,
        `"${t.rr}R"`,
        `"${t.date}"`,
        `"${(t.notes || '').replace(/"/g, '""')}"`
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = csvLines.join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="tradetrack-trades.csv"');
    res.send(csvContent);
  } catch (error) {
    console.error('Error exporting trades:', error);
    res.status(500).json({ success: false, message: 'Failed to export trades to CSV', error: error.message });
  }
};

// POST /api/trades/reset
exports.resetSampleTrades = (req, res) => {
  try {
    db.run('DELETE FROM trades');
    db.seedIfEmpty();
    const rows = db.query('SELECT * FROM trades ORDER BY date DESC');
    res.json({
      success: true,
      message: 'Trades reset to default sample records',
      data: rows.map(enrichTrade)
    });
  } catch (error) {
    console.error('Error resetting trades:', error);
    res.status(500).json({ success: false, message: 'Failed to reset trades', error: error.message });
  }
};
