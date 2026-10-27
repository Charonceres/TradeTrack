const express = require('express');
const router = express.Router();
const db = require('../db/database');

const tradeRoutes = require('./tradeRoutes');
const noteRoutes = require('./noteRoutes');
const analyticsRoutes = require('./analyticsRoutes');
const settingsRoutes = require('./settingsRoutes');
const riskRoutes = require('./riskRoutes');
const marketRoutes = require('./marketRoutes');

// Health and System Status
router.get('/health', (req, res) => {
  try {
    const tradeCount = db.get('SELECT COUNT(*) as count FROM trades').count;
    const noteCount = db.get('SELECT COUNT(*) as count FROM notes').count;

    res.json({
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: {
        driver: 'sqlite3 (node:sqlite)',
        status: 'connected',
        records: {
          trades: tradeCount,
          reflections: noteCount
        }
      },
      endpoints: [
        '/api/trades',
        '/api/notes',
        '/api/analytics/summary',
        '/api/settings/profile',
        '/api/risk/calculate',
        '/api/market/status',
        '/api/market/quotes'
      ]
    });
  } catch (err) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// Mount modular sub-routers
router.use('/trades', tradeRoutes);
router.use('/notes', noteRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/settings', settingsRoutes);
router.use('/risk', riskRoutes);
router.use('/market', marketRoutes);

module.exports = router;
