# TradeTrack Frontend

A responsive, interactive frontend interface for the TradeTrack trading journal and performance analytics web app.

---

## Architecture & Integration

- Connected to the **TradeTrack Node.js Express REST API** and **SQLite database**.
- Features an automated API client ([`api.js`](file:///D:/Codes/TradeProj/TradeTrack_Frontend/api.js)) that handles:
  - Real-time trade logging, editing, and deletion.
  - Mindset reflection modal capturing thoughts, moods, and lessons.
  - Live performance analytics synced with database computations.
  - Real-time market status indicator.
  - Dynamic monthly and strategy Chart.js visualizations.
  - Offline fallback with local browser cache if the backend is temporarily offline.

---

## Files

- `index.html` — Page structure, navigation, views, modal dialogs, and KPI cards.
- `style.css` — Modern fintech visual design with responsive layouts and dark/light mode.
- `api.js` — Async REST API client connecting the frontend to `/api`.
- `script.js` — Client controller, chart rendering, validation, and user interactions.

---

## How to Run

### Recommended: Run with the Backend Server
1. In the terminal, navigate to the `TradeTrack_Backend` folder (or project root):
   ```bash
   cd ..\TradeTrack_Backend
   npm start
   ```
2. Open [http://localhost:5000](http://localhost:5000) in your web browser.

### Alternative: VS Code Live Server
You can also launch `index.html` directly with VS Code's Live Server (`http://127.0.0.1:5500`). The frontend will automatically detect the backend running at `http://localhost:5000/api` thanks to enabled CORS.
