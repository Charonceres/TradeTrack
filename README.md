# TradeTrack — Full-Stack Trading Journal & Analytics

TradeTrack is a trading journal and performance analytics application. It connects a responsive fintech frontend interface to a Node.js Express REST API backed by an SQLite relational database.

---

## Workspace Structure

```
TradeProj/
├── TradeTrack_Frontend/       # UI (HTML5, CSS3, Vanilla JS, Chart.js)
│   ├── index.html             # Views, modals, KPI dashboard
│   ├── style.css              # Fintech theme & responsive design
│   ├── api.js                 # Frontend REST API connector client
│   ├── script.js              # State manager & chart controllers
│   └── README.md
├── TradeTrack_Backend/        # REST API & Relational Database
│   ├── data/
│   │   └── tradetrack.db      # SQLite Database (auto-generated)
│   ├── src/
│   │   ├── config/            # Env and port configuration
│   │   ├── controllers/       # Trades, notes, analytics, risk, settings, market
│   │   ├── db/                # SQLite connection, schema, seeders
│   │   ├── routes/            # Express route endpoints
│   │   └── services/          # P&L, Win Rate, and Analytics computation
│   ├── .env                   # Server configuration
│   ├── package.json           # Dependencies & scripts
│   ├── server.js              # Main server & static asset host
│   └── README.md
├── package.json               # Root scripts
├── start.bat                  # One-click Windows application launcher
└── README.md
```

---

## How to Run

### Method 1: Using the Batch Launcher (Windows)
Double-click `start.bat` in the root folder. It starts the backend server and opens `http://localhost:5000` in your default browser.

### Method 2: Command Line
```bash
# Navigate to the backend
cd TradeTrack_Backend

# Start the server
npm start
```
Then visit:
- **Application**: [http://localhost:5000](http://localhost:5000)
- **API Health**: [http://localhost:5000/api/health](http://localhost:5000/api/health)

### Method 3: Development Mode (Auto-Reload)
```bash
cd TradeTrack_Backend
npm run dev
```

---

## Features & Endpoints

- **Trade Journaling**: Full CRUD for trades (`GET/POST/PUT/DELETE /api/trades`), filtering, searching, and CSV export (`GET /api/trades/export/csv`).
- **Mindset Journal**: Add, view, and delete reflections (`/api/notes`) with Lesson/Discipline categorization and mood tracking.
- **Analytics Engine**: Real-time server-side statistics (`/api/analytics/summary`) powering dynamic Chart.js visualizations for monthly P&L, strategy breakdowns, and cumulative equity curves.
- **Risk Calculator**: Direction-validated position sizing and risk-to-reward ratio calculations (`/api/risk/calculate`).
- **Global Markets**: Real-time market hours detection for Forex, Stocks, and Crypto (`/api/market/status`).
- **Preferences**: Display name, email, preferred currency (USD, INR, EUR, GBP), theme, and monthly goal (`/api/settings/profile`).
