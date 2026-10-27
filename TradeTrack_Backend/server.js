const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const config = require('./src/config');
const apiRoutes = require('./src/routes');

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin === '*' ? true : config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.originalUrl.startsWith('/api')) {
      console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// API Routes
app.use('/api', apiRoutes);

// Serve Frontend Static Files
if (fs.existsSync(config.frontendDir)) {
  console.log(`Serving frontend static files from: ${config.frontendDir}`);
  app.use(express.static(config.frontendDir));

  // Fallback for HTML5 client routing on non-API GET requests
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      const indexPath = path.join(config.frontendDir, 'index.html');
      if (fs.existsSync(indexPath)) {
        return res.sendFile(indexPath);
      }
    }
    next();
  });
} else {
  console.warn(`Frontend directory not found at: ${config.frontendDir}`);
}

// 404 handler
app.use((req, res) => {
  if (req.originalUrl.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint '${req.originalUrl}' not found`
    });
  }
  res.status(404).send('Page not found');
});

// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(config.nodeEnv === 'development' ? { stack: err.stack } : {})
  });
});

// Start server if run directly
if (require.main === module) {
  const server = app.listen(config.port, () => {
    console.log('='.repeat(60));
    console.log(`✦ TradeTrack Backend Server running`);
    console.log(`✦ Port:       http://localhost:${config.port}`);
    console.log(`✦ API Health: http://localhost:${config.port}/api/health`);
    console.log(`✦ Database:   SQLite (${config.dbPath})`);
    console.log(`✦ Mode:       ${config.nodeEnv}`);
    console.log('='.repeat(60));
  });

  const shutdown = () => {
    console.log('\nShutting down TradeTrack server gracefully...');
    server.close(() => {
      console.log('Server stopped.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

module.exports = app;
