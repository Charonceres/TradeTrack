# TradeTrack Backend

The Node.js Express & SQLite REST API backend for **TradeTrack** — a trading journal and performance analytics application.

---

## Features

- **Relational Persistence**: Uses Node.js 24's native high-performance SQLite engine (`node:sqlite`) with WAL mode enabled.
- **Auto-Initialization & Seeding**: Automatically creates schema and seeds initial sample records for trades, notes, and profile settings on first startup.
- **Complete REST API**:
  - **Trades**: CRUD operations, filtering by market/direction/strategy/search, real-time P&L calculations, risk-to-reward ratios, and CSV export.
  - **Mindset Journal**: Add, view, categorize (Lesson vs. Discipline), and delete reflections with mood tracking.
  - **Performance Analytics**: Server-side calculation of Win Rate, Profit Factor, Average Winner/Loser, Best Strategy, Consistency Score, Monthly Breakdown, and Equity Curve.
  - **Risk Calculator**: Position sizing, dollar-risk per unit, and reward-to-risk validation.
  - **Market Status & Indicative Ticker**: Real-time market status (Forex, US Equities, Crypto 24/7) based on global UTC hours.
  - **User Profile & Settings**: Currency preference (USD, INR, EUR, GBP), appearance theme (dark/light), and monthly profit targets.
- **Dual Hosting & Static Frontend Serving**:
  - The backend directly serves the frontend at `http://localhost:5000/`.
  - CORS is fully enabled, allowing the frontend to also be opened with VS Code Live Server or any dev port.

---

## Directory Structure

```
TradeTrack_Backend/
├── data/
│   └── tradetrack.db         # SQLite database file (created automatically)
├── src/
│   ├── config/
│   │   └── index.js          # Environment & path configuration
│   ├── controllers/
│   │   ├── analyticsController.js
│   │   ├── marketController.js
│   │   ├── noteController.js
│   │   ├── riskController.js
│   │   ├── settingsController.js
│   │   └── tradeController.js
│   ├── db/
│   │   └── database.js       # SQLite connection, schema, query helpers & seeder
│   ├── routes/
│   │   ├── analyticsRoutes.js
│   │   ├── marketRoutes.js
│   │   ├── noteRoutes.js
│   │   ├── riskRoutes.js
│   │   ├── settingsRoutes.js
│   │   ├── tradeRoutes.js
│   │   └── index.js          # API router aggregator & /api/health
│   └── services/
│       └── tradeAnalytics.js # Server-side PnL, Win Rate & breakdown formulas
├── .env                      # Active environment settings
├── .env.example              # Example environment configuration
├── package.json              # Project scripts & dependencies
└── server.js                 # Main server entry point
```

---

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Server
```bash
# Production mode
npm start

# Watch mode (auto-reloads on file changes)
npm run dev
```

The server will launch at:
- **Web App**: [http://localhost:5000](http://localhost:5000)
- **API Health Check**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

---

## API Endpoints Reference

### Health & System
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Server uptime, SQLite status, and table record counts |

### Trade Journal
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/trades` | List trades (Filters: `search`, `direction`, `result`, `market`, `strategy`, `sort`) |
| `GET` | `/api/trades/:id` | Get trade by ID |
| `POST` | `/api/trades` | Create new trade |
| `PUT` | `/api/trades/:id` | Update trade |
| `DELETE` | `/api/trades/:id` | Delete trade |
| `GET` | `/api/trades/export/csv`| Download all trades as RFC-4180 CSV |
| `POST` | `/api/trades/reset` | Reset trades back to default sample dataset |

### Performance Analytics
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/analytics/summary` | Net P&L, Win Rate, Profit Factor, Strategy & Monthly Breakdown, Equity Curve |

### Mindset Journal (Reflections)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notes` | List reflections (Filter: `category=lesson` or `discipline`) |
| `POST` | `/api/notes` | Create reflection (`title`, `body`, `category`, `mood`, `date`) |
| `DELETE` | `/api/notes/:id` | Delete reflection |

### Risk Calculator
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/risk/calculate` | Calculate risk amount, unit sizing, reward, and R:R ratio |
| `POST` | `/api/risk/save` | Save a risk simulation |
| `GET` | `/api/risk/history` | List recent saved risk calculations |

### Profile & Settings
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings/profile` | Retrieve user profile & display preferences |
| `PUT` | `/api/settings/profile` | Update user name, email, currency, theme, monthly goal |

### Market Status & Quotes
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/market/status` | Live Forex, Stocks, and Crypto market hours status |
| `GET` | `/api/market/quotes` | Quotes for EURUSD, BTCUSD, AAPL, ETHUSD, US100, NVDA, USDJPY |
