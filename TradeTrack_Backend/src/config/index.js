const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  dbPath: path.resolve(__dirname, '../../', process.env.DB_PATH || './data/tradetrack.db'),
  frontendDir: path.resolve(__dirname, '../../', process.env.FRONTEND_DIR || '../TradeTrack_Frontend'),
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

module.exports = config;
