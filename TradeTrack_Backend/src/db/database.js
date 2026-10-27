const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const config = require('../config');

// Ensure database directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Open SQLite connection
const db = new DatabaseSync(config.dbPath);

// Enable WAL mode for optimal performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize schema
function initSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      market TEXT NOT NULL,
      direction TEXT NOT NULL,
      strategy TEXT NOT NULL,
      entry REAL NOT NULL,
      exit REAL NOT NULL,
      quantity REAL NOT NULL,
      fees REAL DEFAULT 0,
      date TEXT NOT NULL,
      stop_loss REAL,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      mood TEXT DEFAULT 'Reflective',
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL DEFAULT 'Rhythm',
      email TEXT NOT NULL DEFAULT 'rhythm@example.com',
      currency TEXT NOT NULL DEFAULT 'USD',
      theme TEXT NOT NULL DEFAULT 'dark',
      monthly_goal REAL NOT NULL DEFAULT 4000,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS risk_calculations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      balance REAL NOT NULL,
      risk_percent REAL NOT NULL,
      direction TEXT NOT NULL,
      entry_price REAL NOT NULL,
      stop_price REAL NOT NULL,
      target_price REAL NOT NULL,
      unit_value REAL NOT NULL,
      risk_amount REAL NOT NULL,
      position_size REAL NOT NULL,
      potential_reward REAL NOT NULL,
      reward_ratio REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  seedIfEmpty();
}

const seedTrades = [
  { symbol: 'EURUSD', market: 'Forex', direction: 'Long', entry: 1.0824, exit: 1.0878, quantity: 10000, fees: 4.5, date: '2026-10-20', strategy: 'London Breakout', notes: 'Waited for confirmation before entry.' },
  { symbol: 'BTCUSD', market: 'Crypto', direction: 'Short', entry: 68420, exit: 67890, quantity: 0.08, fees: 2.2, date: '2026-10-19', strategy: 'Liquidity Sweep', notes: 'Clean rejection near resistance.' },
  { symbol: 'AAPL', market: 'Stocks', direction: 'Long', entry: 251.2, exit: 254.6, quantity: 12, fees: 1.1, date: '2026-10-18', strategy: 'Price Action', notes: 'Followed the planned setup.' },
  { symbol: 'GBPUSD', market: 'Forex', direction: 'Short', entry: 1.3382, exit: 1.3410, quantity: 8000, fees: 3.2, date: '2026-10-17', strategy: 'Trend Following', notes: 'Stopped out; review entry timing.' },
  { symbol: 'ETHUSD', market: 'Crypto', direction: 'Long', entry: 3820, exit: 3915, quantity: 0.6, fees: 2.5, date: '2026-10-16', strategy: 'Price Action', notes: 'Good patience on the retest.' },
  { symbol: 'US100', market: 'Indices', direction: 'Long', entry: 24120, exit: 24060, quantity: 1, fees: 1.5, date: '2026-10-15', strategy: 'London Breakout', notes: 'Entered too early into resistance.' },
  { symbol: 'USDJPY', market: 'Forex', direction: 'Short', entry: 149.12, exit: 148.55, quantity: 12000, fees: 4.0, date: '2026-10-14', strategy: 'Liquidity Sweep', notes: 'Waited for the sweep and close.' },
  { symbol: 'NVDA', market: 'Stocks', direction: 'Long', entry: 182.4, exit: 182.4, quantity: 5, fees: 1.0, date: '2026-10-13', strategy: 'Other', notes: 'Exited at breakeven after conditions changed.' }
];

const seedNotes = [
  { date: '2026-10-20', category: 'discipline', title: 'Patience before the entry', mood: 'Focused', body: 'I waited for the level to confirm instead of chasing the first move. The process felt calmer and the trade matched the plan.' },
  { date: '2026-10-18', category: 'lesson', title: 'Respect the invalidation level', mood: 'Reflective', body: 'The setup was no longer valid after the market structure changed. Next time, I want to reassess instead of hoping price returns.' },
  { date: '2026-10-16', category: 'discipline', title: 'Keep the routine simple', mood: 'Confident', body: 'Reviewing the plan before the session helped me focus on fewer, higher-quality setups. I will keep the pre-trade checklist.' }
];

function seedIfEmpty() {
  const countTrades = db.prepare('SELECT COUNT(*) as count FROM trades').get().count;
  if (countTrades === 0) {
    const insertTrade = db.prepare(`
      INSERT INTO trades (symbol, market, direction, strategy, entry, exit, quantity, fees, date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const t of seedTrades) {
      insertTrade.run(t.symbol, t.market, t.direction, t.strategy, t.entry, t.exit, t.quantity, t.fees, t.date, t.notes);
    }
  }

  const countNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
  if (countNotes === 0) {
    const insertNote = db.prepare(`
      INSERT INTO notes (date, category, title, mood, body)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const n of seedNotes) {
      insertNote.run(n.date, n.category, n.title, n.mood, n.body);
    }
  }

  const countProfile = db.prepare('SELECT COUNT(*) as count FROM profile').get().count;
  if (countProfile === 0) {
    db.prepare(`
      INSERT INTO profile (id, name, email, currency, theme, monthly_goal)
      VALUES (1, 'Rhythm', 'rhythm@example.com', 'USD', 'dark', 4000)
    `).run();
  }
}

// Helper functions for safe querying
function query(sql, params = []) {
  const rows = db.prepare(sql).all(...params);
  // Return shallow copy as normal objects
  return rows.map(r => ({ ...r }));
}

function get(sql, params = []) {
  const row = db.prepare(sql).get(...params);
  return row ? { ...row } : null;
}

function run(sql, params = []) {
  return db.prepare(sql).run(...params);
}

// Initialize tables and seed immediately
initSchema();

module.exports = {
  db,
  query,
  get,
  run,
  seedIfEmpty
};
