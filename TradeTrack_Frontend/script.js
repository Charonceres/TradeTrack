/* TradeTrack frontend interactions — Connected to Node.js & SQLite Backend */
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const money = (value, currency = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const signedMoney = (value, currency = 'USD') => `${value >= 0 ? '+' : '−'}${money(Math.abs(value), currency)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date().toISOString().slice(0, 10);

// Fallback seed data in case backend is offline
const fallbackTrades = [
  { id: 1, symbol: 'EURUSD', market: 'Forex', direction: 'Long', entry: 1.0824, exit: 1.0878, quantity: 10000, fees: 4.5, date: '2026-10-20', strategy: 'London Breakout', notes: 'Waited for confirmation before entry.' },
  { id: 2, symbol: 'BTCUSD', market: 'Crypto', direction: 'Short', entry: 68420, exit: 67890, quantity: 0.08, fees: 2.2, date: '2026-10-19', strategy: 'Liquidity Sweep', notes: 'Clean rejection near resistance.' },
  { id: 3, symbol: 'AAPL', market: 'Stocks', direction: 'Long', entry: 251.2, exit: 254.6, quantity: 12, fees: 1.1, date: '2026-10-18', strategy: 'Price Action', notes: 'Followed the planned setup.' },
  { id: 4, symbol: 'GBPUSD', market: 'Forex', direction: 'Short', entry: 1.3382, exit: 1.3410, quantity: 8000, fees: 3.2, date: '2026-10-17', strategy: 'Trend Following', notes: 'Stopped out; review entry timing.' },
  { id: 5, symbol: 'ETHUSD', market: 'Crypto', direction: 'Long', entry: 3820, exit: 3915, quantity: 0.6, fees: 2.5, date: '2026-10-16', strategy: 'Price Action', notes: 'Good patience on the retest.' },
  { id: 6, symbol: 'US100', market: 'Indices', direction: 'Long', entry: 24120, exit: 24060, quantity: 1, fees: 1.5, date: '2026-10-15', strategy: 'London Breakout', notes: 'Entered too early into resistance.' },
  { id: 7, symbol: 'USDJPY', market: 'Forex', direction: 'Short', entry: 149.12, exit: 148.55, quantity: 12000, fees: 4.0, date: '2026-10-14', strategy: 'Liquidity Sweep', notes: 'Waited for the sweep and close.' },
  { id: 8, symbol: 'NVDA', market: 'Stocks', direction: 'Long', entry: 182.4, exit: 182.4, quantity: 5, fees: 1.0, date: '2026-10-13', strategy: 'Other', notes: 'Exited at breakeven after conditions changed.' }
];

const fallbackNotes = [
  { id: 1, date: '2026-10-20', category: 'discipline', title: 'Patience before the entry', mood: 'Focused', body: 'I waited for the level to confirm instead of chasing the first move. The process felt calmer and the trade matched the plan.' },
  { id: 2, date: '2026-10-18', category: 'lesson', title: 'Respect the invalidation level', mood: 'Reflective', body: 'The setup was no longer valid after the market structure changed. Next time, I want to reassess instead of hoping price returns.' },
  { id: 3, date: '2026-10-16', category: 'discipline', title: 'Keep the routine simple', mood: 'Confident', body: 'Reviewing the plan before the session helped me focus on fewer, higher-quality setups. I will keep the pre-trade checklist.' }
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

// App State
let trades = readStorage('tradetrack_trades', fallbackTrades);
let notes = readStorage('tradetrack_notes', fallbackNotes);
let serverAnalytics = null;
let editingTradeId = null;
let equityChart, outcomeChart, monthlyChart, strategyChart;
let currentCurrency = 'USD';
let monthlyGoalTarget = 4000;
let selectedJournalFilter = 'all';
let isBackendConnected = false;

function persistFallback() {
  localStorage.setItem('tradetrack_trades', JSON.stringify(trades));
  localStorage.setItem('tradetrack_notes', JSON.stringify(notes));
}

function tradePnl(t) {
  if (t.netPnl !== undefined) return t.netPnl;
  const gross = (t.direction === 'Long' ? t.exit - t.entry : t.entry - t.exit) * t.quantity;
  return gross - (Number(t.fees) || 0);
}

function tradeResult(t) {
  if (t.result) return t.result;
  const pnl = tradePnl(t);
  return Math.abs(pnl) < 0.005 ? 'even' : pnl > 0 ? 'win' : 'loss';
}

function rr(t) {
  if (t.rr !== undefined) return t.rr;
  const risk = Number(t.stop_loss || t.stopLoss) ? Math.abs(t.entry - Number(t.stop_loss || t.stopLoss)) * t.quantity : Math.abs(t.entry - t.exit) * t.quantity;
  return risk ? Math.abs((t.exit - t.entry) * t.quantity) / risk : Math.abs((t.exit - t.entry) / (t.entry || 1));
}

function iconForMarket(m) {
  return m === 'Crypto' ? '₿' : m === 'Stocks' ? 'S' : m === 'Indices' ? '↗' : m === 'Commodities' ? '◈' : 'FX';
}

function marketClass(m) {
  return m === 'Crypto' ? 'crypto' : m === 'Stocks' ? 'stock' : '';
}

function fmtDate(date) {
  if (!date) return '—';
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function getTradeRows(items, recent = false) {
  return items.map(t => {
    const pnl = tradePnl(t);
    const result = tradeResult(t);
    return `<tr>
      <td><div class="instrument-cell"><span class="coin-icon ${marketClass(t.market)}">${escapeHtml(iconForMarket(t.market))}</span><span>${escapeHtml(t.symbol)}<span class="instrument-sub">${escapeHtml(t.market)}</span></span></div></td>
      ${recent ? `
        <td><span class="direction-pill ${t.direction.toLowerCase()}">${t.direction === 'Long' ? '↗' : '↘'} ${escapeHtml(t.direction)}</span></td>
        <td>${fmtDate(t.date)}</td>
        <td>${escapeHtml(t.strategy)}</td>
        <td>${Number(rr(t)).toFixed(2)}R</td>
        <td class="pnl-cell ${pnl >= 0 ? 'positive' : 'negative'}">${signedMoney(pnl, currentCurrency)}</td>
        <td><span class="status-pill ${result}">${result === 'win' ? '● Win' : result === 'loss' ? '● Loss' : '● Even'}</span></td>
      ` : `
        <td>${escapeHtml(t.market)}</td>
        <td><span class="direction-pill ${t.direction.toLowerCase()}">${t.direction === 'Long' ? '↗' : '↘'} ${escapeHtml(t.direction)}</span></td>
        <td>${Number(t.entry).toLocaleString()} → ${Number(t.exit).toLocaleString()}</td>
        <td>${fmtDate(t.date)}</td>
        <td>${escapeHtml(t.strategy)}</td>
        <td class="pnl-cell ${pnl >= 0 ? 'positive' : 'negative'}">${signedMoney(pnl, currentCurrency)}</td>
        <td><div class="row-actions"><button data-edit-trade="${t.id}" aria-label="Edit ${escapeHtml(t.symbol)}">Edit</button><button data-delete-trade="${t.id}" aria-label="Delete ${escapeHtml(t.symbol)}">×</button></div></td>
      `}
    </tr>`;
  }).join('');
}

function filteredTrades() {
  const query = ($('#tradeSearch')?.value || '').trim().toLowerCase();
  const direction = $('#typeFilter')?.value || 'all';
  const result = $('#resultFilter')?.value || 'all';
  return [...trades]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter(t => (!query || `${t.symbol} ${t.strategy} ${t.market}`.toLowerCase().includes(query)) &&
                 (direction === 'all' || t.direction === direction) &&
                 (result === 'all' || tradeResult(t) === result));
}

function renderTrades() {
  const recent = [...trades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const recentBody = $('#recentTradesBody');
  if (recentBody) {
    recentBody.innerHTML = recent.length
      ? getTradeRows(recent, true)
      : '<tr><td colspan="7">No trades yet. Add your first trade to get started.</td></tr>';
  }

  const allBody = $('#allTradesBody');
  const filtered = filteredTrades();
  if (allBody) {
    allBody.innerHTML = filtered.length
      ? getTradeRows(filtered)
      : '<tr><td colspan="8">No trades match your filters.</td></tr>';
  }

  if ($('#tradeNavCount')) $('#tradeNavCount').textContent = trades.length;
  if ($('#journalTotal')) $('#journalTotal').textContent = trades.length;
  if ($('#journalPnl')) $('#journalPnl').textContent = signedMoney(trades.reduce((s, t) => s + tradePnl(t), 0), currentCurrency);
  if ($('#tableCount')) $('#tableCount').textContent = `Showing ${filtered.length} of ${trades.length} trades`;
}

function renderStats() {
  const pnl = trades.reduce((s, t) => s + tradePnl(t), 0);
  const wins = trades.filter(t => tradeResult(t) === 'win').length;
  const losses = trades.filter(t => tradeResult(t) === 'loss').length;
  const even = trades.length - wins - losses;
  const grossWin = trades.filter(t => tradeResult(t) === 'win').reduce((s, t) => s + tradePnl(t), 0);
  const grossLoss = Math.abs(trades.filter(t => tradeResult(t) === 'loss').reduce((s, t) => s + tradePnl(t), 0));

  // Overview KPI Cards
  if ($('#statPnl')) {
    $('#statPnl').textContent = signedMoney(pnl, currentCurrency);
    $('#statPnl').className = `stat-value ${pnl >= 0 ? 'positive' : 'negative'}`;
  }
  if ($('#statWin')) {
    $('#statWin').innerHTML = `${trades.length ? (wins / trades.length * 100).toFixed(1) : '0.0'}<span class="unit">%</span>`;
  }
  if ($('#statFactor')) {
    $('#statFactor').textContent = grossLoss ? (grossWin / grossLoss).toFixed(2) : grossWin ? '∞' : '0.00';
  }
  if ($('#statTrades')) $('#statTrades').textContent = trades.length;

  // Outcomes breakdown
  if ($('#outcomeTotal')) $('#outcomeTotal').textContent = trades.length;
  if ($('#winningCount')) $('#winningCount').innerHTML = `${wins} <small>${trades.length ? (wins / trades.length * 100).toFixed(1) : '0.0'}%</small>`;
  if ($('#losingCount')) $('#losingCount').innerHTML = `${losses} <small>${trades.length ? (losses / trades.length * 100).toFixed(1) : '0.0'}%</small>`;
  if ($('#evenCount')) $('#evenCount').innerHTML = `${even} <small>${trades.length ? (even / trades.length * 100).toFixed(1) : '0.0'}%</small>`;

  // Goal Progress Card
  const target = monthlyGoalTarget || 4000;
  const goalCurrent = Math.max(0, pnl);
  const goalPct = Math.min(100, (goalCurrent / target * 100)).toFixed(0);
  const goalRemain = Math.max(0, target - goalCurrent);

  const goalEl = $('.goal-number');
  if (goalEl) goalEl.innerHTML = `<strong>${money(goalCurrent, currentCurrency)}</strong><span>of ${money(target, currentCurrency)} target</span>`;
  const trackSpan = $('.goal-track span');
  if (trackSpan) trackSpan.style.width = `${goalPct}%`;
  const goalFoot = $('.goal-foot');
  if (goalFoot) goalFoot.innerHTML = `<span>${goalPct}% completed</span><span>${money(goalRemain, currentCurrency)} to go</span>`;

  // Performance Insight
  if (serverAnalytics?.insight) {
    const insightTag = $('.insight-tag');
    const insightH3 = $('.insight-content h3');
    const insightP = $('.insight-content p');
    if (insightTag) insightTag.textContent = serverAnalytics.insight.tag;
    if (insightH3) insightH3.textContent = serverAnalytics.insight.title;
    if (insightP) insightP.textContent = serverAnalytics.insight.body;
  }

  // Update Equity & Outcome Charts
  if (equityChart) {
    const sorted = [...trades].sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    equityChart.data.labels = sorted.map(t => fmtDate(t.date));
    equityChart.data.datasets[0].data = sorted.map(t => (running += tradePnl(t)));
    equityChart.update();
  }
  if (outcomeChart) {
    outcomeChart.data.datasets[0].data = [wins, losses, even];
    outcomeChart.update();
  }

  // Analytics Page Updates (Monthly and Strategy Charts)
  updateAnalyticsPage();
}

function updateAnalyticsPage() {
  if (!serverAnalytics) return;

  const summary = serverAnalytics.summary;

  // Analytics stat cards
  const statCards = $$('#page-analytics .stat-card');
  if (statCards.length >= 4) {
    // Average winner
    const winVal = statCards[0].querySelector('.stat-value');
    if (winVal) winVal.textContent = signedMoney(summary.avgWinner, currentCurrency);

    // Average loser
    const lossVal = statCards[1].querySelector('.stat-value');
    if (lossVal) lossVal.textContent = signedMoney(-summary.avgLoser, currentCurrency);

    // Best strategy
    const stratVal = statCards[2].querySelector('.stat-value');
    if (stratVal) stratVal.textContent = summary.bestStrategy || 'London Breakout';

    // Consistency score
    const scoreVal = statCards[3].querySelector('.stat-value');
    if (scoreVal) scoreVal.innerHTML = `${summary.consistencyScore}<span class="unit">/100</span>`;
  }

  // Monthly Chart
  if (monthlyChart && serverAnalytics.monthlyBreakdown?.length) {
    monthlyChart.data.labels = serverAnalytics.monthlyBreakdown.map(m => {
      const parts = m.month.split('-');
      return new Date(parts[0], parseInt(parts[1], 10) - 1).toLocaleString('en-US', { month: 'short' });
    });
    monthlyChart.data.datasets[0].data = serverAnalytics.monthlyBreakdown.map(m => m.netPnl);
    monthlyChart.data.datasets[0].backgroundColor = serverAnalytics.monthlyBreakdown.map(m =>
      m.netPnl >= 0 ? '#35d49a' : '#ff6d78'
    );
    monthlyChart.update();
  }

  // Strategy Chart
  if (strategyChart && serverAnalytics.strategyBreakdown?.length) {
    strategyChart.data.labels = serverAnalytics.strategyBreakdown.map(s => s.strategy);
    strategyChart.data.datasets[0].data = serverAnalytics.strategyBreakdown.map(s => s.netPnl);
    strategyChart.data.datasets[0].backgroundColor = serverAnalytics.strategyBreakdown.map(s =>
      s.netPnl >= 0 ? '#35d49a' : '#ff6d78'
    );
    strategyChart.update();
  }
}

function renderNotes() {
  const reflectionCount = $('#reflectionCount');
  if (reflectionCount) reflectionCount.textContent = notes.length;

  const visible = notes
    .filter(n => selectedJournalFilter === 'all' || n.category === selectedJournalFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  const journalCards = $('#journalCards');
  if (journalCards) {
    journalCards.innerHTML = visible.length ? visible.map(n => `
      <article class="panel journal-entry">
        <div class="journal-entry-top">
          <span class="journal-date">${fmtDate(n.date)}</span>
          <span class="journal-tag">${n.category === 'lesson' ? 'LESSON' : 'DISCIPLINE'}</span>
        </div>
        <h3>${escapeHtml(n.title)}</h3>
        <p>${escapeHtml(n.body)}</p>
        <div class="journal-entry-foot">
          <span class="mood-tag">◡ ${escapeHtml(n.mood || 'Reflective')}</span>
          <button class="text-link" data-delete-note="${n.id}">Delete ×</button>
        </div>
      </article>
    `).join('') : '<div class="empty-state">No reflections in this category yet.</div>';
  }
}

function baseChartOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0b1018',
        borderColor: '#2b3543',
        borderWidth: 1,
        titleColor: '#e8edf3',
        bodyColor: '#b7c2d0',
        padding: 11,
        displayColors: false
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#748194', font: { family: 'DM Sans', size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 },
        border: { display: false }
      },
      y: {
        grid: { color: 'rgba(126,140,159,.12)', drawTicks: false },
        ticks: {
          color: '#748194',
          font: { family: 'DM Sans', size: 9 },
          padding: 9,
          callback: v => currentCurrency === 'USD' ? '$' + v : v
        },
        border: { display: false }
      }
    }
  };
}

function initCharts() {
  if (!window.Chart) return;
  Chart.defaults.font.family = "'DM Sans', sans-serif";
  Chart.defaults.color = '#8793a4';

  const equityCtx = $('#equityChart');
  if (equityCtx) {
    const gradient = equityCtx.getContext('2d').createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, 'rgba(53,212,154,.24)');
    gradient.addColorStop(1, 'rgba(53,212,154,0)');
    equityChart = new Chart(equityCtx, {
      type: 'line',
      data: {
        labels: ['Oct 14', 'Oct 15', 'Oct 16', 'Oct 17', 'Oct 18', 'Oct 19', 'Oct 20'],
        datasets: [{
          data: [180, 120, 340, 270, 590, 710, 920],
          borderColor: '#35d49a',
          backgroundColor: gradient,
          fill: true,
          tension: .38,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 4,
          pointHoverBackgroundColor: '#35d49a'
        }]
      },
      options: { ...baseChartOptions(), interaction: { intersect: false, mode: 'index' } }
    });
  }

  const outcomeCtx = $('#outcomeChart');
  if (outcomeCtx) {
    outcomeChart = new Chart(outcomeCtx, {
      type: 'doughnut',
      data: {
        labels: ['Winning', 'Losing', 'Breakeven'],
        datasets: [{
          data: [26, 10, 2],
          backgroundColor: ['#35d49a', '#ff6d78', '#596678'],
          borderWidth: 0,
          hoverOffset: 4,
          spacing: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '78%',
        plugins: { legend: { display: false }, tooltip: { backgroundColor: '#0b1018', padding: 10 } }
      }
    });
  }

  const monthCtx = $('#monthlyChart');
  if (monthCtx) {
    monthlyChart = new Chart(monthCtx, {
      type: 'bar',
      data: {
        labels: ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
        datasets: [{
          data: [420, 760, 580, 1120, 840, 1240],
          backgroundColor: ['rgba(53,212,154,.5)', 'rgba(53,212,154,.5)', 'rgba(53,212,154,.5)', 'rgba(53,212,154,.5)', 'rgba(53,212,154,.5)', '#35d49a'],
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 30
        }]
      },
      options: { ...baseChartOptions(), scales: { ...baseChartOptions().scales, y: { ...baseChartOptions().scales.y, beginAtZero: true } } }
    });
  }

  const stratCtx = $('#strategyChart');
  if (stratCtx) {
    strategyChart = new Chart(stratCtx, {
      type: 'bar',
      data: {
        labels: ['London Breakout', 'Price Action', 'Liquidity Sweep', 'Trend Following', 'Other'],
        datasets: [{
          data: [1460, 980, 720, 340, -180],
          backgroundColor: ['#35d49a', '#35d49a', '#35d49a', '#35d49a', '#ff6d78'],
          borderRadius: 5,
          borderSkipped: false,
          maxBarThickness: 24
        }]
      },
      options: {
        ...baseChartOptions(),
        indexAxis: 'y',
        scales: {
          x: { ...baseChartOptions().scales.y, grid: { color: 'rgba(126,140,159,.12)' }, ticks: { color: '#748194', font: { size: 9 }, callback: v => '$' + v } },
          y: { ...baseChartOptions().scales.x, ticks: { color: '#a4afbd', font: { size: 9 } } }
        }
      }
    });
  }
}

function showToast(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function updateConnectionIndicator(connected) {
  isBackendConnected = connected;
  const badge = $('#backendBadge');
  const badgeText = $('#backendBadgeText');
  const note = $('#overviewDataNote');

  if (badge) {
    badge.classList.toggle('offline', !connected);
  }
  if (badgeText) {
    badgeText.textContent = connected ? 'API: SQLite Connected' : 'API: Offline (Local Mode)';
  }
  if (note) {
    note.innerHTML = connected
      ? '<span class="status-dot"></span> SQLite Database · Live Analytics'
      : '<span class="status-dot" style="background:#ff6d78"></span> Offline Mode · Local Cache';
  }
  const dbInfo = $('#dbInfoText');
  if (dbInfo) {
    dbInfo.textContent = connected
      ? 'Active Connection: Node.js Express REST API (SQLite Database)'
      : 'Backend offline: Running in browser local storage mode';
  }
}

function applyUserProfile(profile) {
  const name = profile?.name || 'Rhythm';
  const email = profile?.email || 'rhythm@example.com';
  currentCurrency = profile?.currency || 'USD';
  monthlyGoalTarget = Number(profile?.monthly_goal) || 4000;

  if ($('#displayName')) $('#displayName').value = name;
  if ($('#displayEmail')) $('#displayEmail').value = email;
  if ($('#currency')) $('#currency').value = currentCurrency;
  if ($('#monthlyGoal')) $('#monthlyGoal').value = monthlyGoalTarget;

  $$('.profile-text strong').forEach(el => el.textContent = name);
  if ($('#welcomeUserName')) $('#welcomeUserName').textContent = name;

  const initials = name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'R';
  $$('.avatar, .top-avatar').forEach(el => el.textContent = initials);

  if (profile?.theme) setTheme(profile.theme);
}

async function loadDataFromBackend() {
  if (!window.api) return;

  try {
    const health = await window.api.checkHealth();
    if (!health) {
      updateConnectionIndicator(false);
      renderTrades();
      renderStats();
      renderNotes();
      return;
    }

    updateConnectionIndicator(true);

    // Fetch data in parallel
    const [tradesData, notesRes, profileData, analyticsData, marketData] = await Promise.allSettled([
      window.api.getTrades(),
      window.api.getNotes(),
      window.api.getProfile(),
      window.api.getAnalytics(),
      window.api.getMarketStatus()
    ]);

    if (tradesData.status === 'fulfilled' && tradesData.value) {
      trades = tradesData.value;
      persistFallback();
    }
    if (notesRes.status === 'fulfilled' && notesRes.value?.data) {
      notes = notesRes.value.data;
      persistFallback();
    }
    if (profileData.status === 'fulfilled' && profileData.value) {
      applyUserProfile(profileData.value);
    }
    if (analyticsData.status === 'fulfilled' && analyticsData.value) {
      serverAnalytics = analyticsData.value;
    }
    if (marketData.status === 'fulfilled' && marketData.value) {
      const mText = $('#marketStatusText');
      if (mText) mText.textContent = marketData.value.statusText;
    }

    renderTrades();
    renderStats();
    renderNotes();
  } catch (err) {
    console.warn('Backend load notice:', err.message);
    updateConnectionIndicator(false);
    renderTrades();
    renderStats();
    renderNotes();
  }
}

function navigate(page) {
  const target = $(`#page-${page}`);
  if (!target) return;
  $$('.page').forEach(p => p.classList.toggle('active', p === target));
  $$('.nav-item[data-page]').forEach(b => b.classList.toggle('active', b.dataset.page === page));
  const titles = { overview: 'Overview', trades: 'Trade journal', analytics: 'Analytics', risk: 'Risk calculator', journal: 'Mindset journal', settings: 'Settings' };
  $('#breadcrumbPage').textContent = titles[page] || 'Overview';
  $('#sidebar').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (page === 'analytics') {
    setTimeout(() => {
      [monthlyChart, strategyChart].forEach(c => c && c.resize());
      updateAnalyticsPage();
    }, 80);
  }
}

function openTradeModal(trade = null) {
  editingTradeId = trade?.id ?? null;
  $('#modalTitle').textContent = trade ? 'Edit trade' : 'Log a new trade';
  $('#instrument').value = trade?.symbol || '';
  $('#market').value = trade?.market || 'Forex';
  $('#direction').value = trade?.direction || 'Long';
  $('#strategy').value = trade?.strategy || 'London Breakout';
  $('#tradeEntry').value = trade?.entry ?? '';
  $('#tradeExit').value = trade?.exit ?? '';
  $('#quantity').value = trade?.quantity ?? 1;
  $('#fees').value = trade?.fees ?? 0;
  $('#tradeDate').value = trade?.date || today();
  $('#tradeOutcome').value = 'auto';
  $('#tradeNotes').value = trade?.notes || '';
  $('#tradeModal').classList.add('open');
  $('#tradeModal').setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#instrument').focus(), 80);
}

function closeTradeModal() {
  $('#tradeModal').classList.remove('open');
  $('#tradeModal').setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function handleTradeSubmit(event) {
  event.preventDefault();
  const entry = Number($('#tradeEntry').value);
  const exit = Number($('#tradeExit').value);
  const quantity = Number($('#quantity').value);
  const fees = Number($('#fees').value);

  if (!$('#instrument').value.trim() || entry <= 0 || exit <= 0 || quantity <= 0 || fees < 0) {
    showToast('Please check the trade details.');
    return;
  }

  const tradePayload = {
    symbol: $('#instrument').value.trim().toUpperCase(),
    market: $('#market').value,
    direction: $('#direction').value,
    strategy: $('#strategy').value,
    entry,
    exit,
    quantity,
    fees,
    date: $('#tradeDate').value || today(),
    notes: $('#tradeNotes').value.trim()
  };

  try {
    if (isBackendConnected && window.api) {
      if (editingTradeId) {
        await window.api.updateTrade(editingTradeId, tradePayload);
        showToast('Trade updated in SQLite database.');
      } else {
        await window.api.createTrade(tradePayload);
        showToast('Trade saved to SQLite database.');
      }
      closeTradeModal();
      await loadDataFromBackend();
    } else {
      // Local fallback
      const item = { id: editingTradeId ?? Date.now(), ...tradePayload };
      if (editingTradeId) {
        trades = trades.map(t => t.id === editingTradeId ? item : t);
        showToast('Trade updated locally.');
      } else {
        trades.push(item);
        showToast('Trade saved locally.');
      }
      persistFallback();
      closeTradeModal();
      renderTrades();
      renderStats();
    }
  } catch (err) {
    showToast(err.message || 'Error saving trade');
  }
}

async function deleteTrade(id) {
  const trade = trades.find(t => t.id === id);
  if (!trade) return;
  if (!confirm(`Delete the ${trade.symbol} trade? This cannot be undone.`)) return;

  try {
    if (isBackendConnected && window.api) {
      await window.api.deleteTrade(id);
      showToast('Trade removed from database.');
      await loadDataFromBackend();
    } else {
      trades = trades.filter(t => t.id !== id);
      persistFallback();
      renderTrades();
      renderStats();
      showToast('Trade deleted.');
    }
  } catch (err) {
    showToast(err.message || 'Error deleting trade');
  }
}

// Reflection Modal Handlers
function openNoteModal() {
  const modal = $('#noteModal');
  if (!modal) return;
  $('#noteTitle').value = '';
  $('#noteBody').value = '';
  $('#noteDate').value = today();
  $('#noteMood').value = 'Focused';
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => $('#noteTitle').focus(), 80);
}

function closeNoteModal() {
  const modal = $('#noteModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

async function handleNoteSubmit(event) {
  event.preventDefault();
  const title = $('#noteTitle').value.trim();
  const body = $('#noteBody').value.trim();
  const category = $('#noteCategory').value;
  const mood = $('#noteMood').value.trim() || 'Reflective';
  const date = $('#noteDate').value || today();

  if (!title || !body) {
    showToast('Please enter both a title and reflection notes.');
    return;
  }

  const payload = { title, body, category, mood, date };

  try {
    if (isBackendConnected && window.api) {
      await window.api.createNote(payload);
      showToast('Reflection saved to database.');
      closeNoteModal();
      await loadDataFromBackend();
    } else {
      notes.push({ id: Date.now(), ...payload });
      persistFallback();
      closeNoteModal();
      renderNotes();
      showToast('Reflection added.');
    }
  } catch (err) {
    showToast(err.message || 'Error saving reflection');
  }
}

async function deleteNote(id) {
  if (!confirm('Delete this reflection?')) return;

  try {
    if (isBackendConnected && window.api) {
      await window.api.deleteNote(id);
      showToast('Reflection deleted from database.');
      await loadDataFromBackend();
    } else {
      notes = notes.filter(n => n.id !== id);
      persistFallback();
      renderNotes();
      showToast('Reflection deleted.');
    }
  } catch (err) {
    showToast(err.message || 'Error deleting reflection');
  }
}

function downloadCsv() {
  if (isBackendConnected && window.api) {
    window.location.href = window.api.getExportCsvUrl();
    showToast('Downloading CSV from TradeTrack backend...');
    return;
  }

  // Client-side fallback CSV
  const rows = [
    ['Symbol', 'Market', 'Direction', 'Entry', 'Exit', 'Quantity', 'Fees', 'Date', 'Strategy', 'Net P&L', 'Notes'],
    ...trades.map(t => [t.symbol, t.market, t.direction, t.entry, t.exit, t.quantity, t.fees, t.date, t.strategy, tradePnl(t).toFixed(2), t.notes || ''])
  ];
  const csv = rows.map(row => row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tradetrack-trades.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  showToast('CSV export downloaded.');
}

async function calculateRisk(event) {
  if (event) event.preventDefault();
  const balance = Number($('#balance').value);
  const percent = Number($('#riskPercent').value);
  const entry = Number($('#entryPrice').value);
  const stop = Number($('#stopPrice').value);
  const target = Number($('#targetPrice').value);
  const unit = Number($('#unitValue').value);
  const dir = $('#riskDirection').value;

  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = dir === 'Long' ? target - entry : entry - target;
  const valid = balance > 0 && percent > 0 && percent <= 100 && entry > 0 && stop > 0 && target > 0 && unit > 0 && riskDistance > 0 && rewardDistance > 0 && ((dir === 'Long' && stop < entry && target > entry) || (dir === 'Short' && stop > entry && target < entry));

  if (!valid) {
    if (event) showToast('Check values: stop & target must match direction.');
    return;
  }

  const amount = balance * percent / 100;
  const perUnit = riskDistance * unit;
  const size = amount / perUnit;
  const reward = rewardDistance * unit * size;
  const ratio = rewardDistance / riskDistance;

  $('#riskAmount').textContent = money(amount, currentCurrency);
  $('#riskPercentText').textContent = `${percent.toFixed(2)}% of account balance`;
  $('#riskBalance').textContent = money(balance, currentCurrency);
  $('#riskPerUnit').textContent = money(perUnit, currentCurrency);
  $('#positionSize').textContent = size.toLocaleString('en-US', { maximumFractionDigits: 4 });
  $('#potentialReward').textContent = money(reward, currentCurrency);
  $('#riskReward').textContent = `1 : ${ratio.toFixed(2)}`;
  $('#rewardPercent').textContent = `${ratio.toFixed(2)}×`;

  // If user clicked submit, save calculation to backend if connected
  if (event && isBackendConnected && window.api) {
    try {
      await window.api.saveRisk({
        balance, riskPercent: percent, direction: dir, entryPrice: entry, stopPrice: stop, targetPrice: target, unitValue: unit
      });
      showToast('Risk simulation recorded.');
    } catch (_) {}
  }
}

function setTheme(theme) {
  document.body.classList.toggle('light-mode', theme === 'light');
  if ($('#appearance')) $('#appearance').value = theme;
  localStorage.setItem('tradetrack_theme', theme);
}

function init() {
  const savedTheme = readStorage('tradetrack_theme', 'dark');
  setTheme(savedTheme);

  // Navigation
  $$('.nav-item[data-page], [data-page].text-link, .brand[data-page]').forEach(button =>
    button.addEventListener('click', () => navigate(button.dataset.page))
  );

  // Trade Modals
  $$('[data-open-add]').forEach(button => button.addEventListener('click', () => openTradeModal()));
  $('#mobileMenu').addEventListener('click', () => $('#sidebar').classList.toggle('open'));
  $('#themeToggle').addEventListener('click', () => setTheme(document.body.classList.contains('light-mode') ? 'dark' : 'light'));
  $('#closeModal').addEventListener('click', closeTradeModal);
  $('#cancelTrade').addEventListener('click', closeTradeModal);
  $('#tradeModal').addEventListener('click', e => { if (e.target === $('#tradeModal')) closeTradeModal(); });

  // Reflection Modals
  const noteModal = $('#noteModal');
  if (noteModal) {
    $('#newNoteBtn')?.addEventListener('click', openNoteModal);
    $('#closeNoteModal')?.addEventListener('click', closeNoteModal);
    $('#cancelNote')?.addEventListener('click', closeNoteModal);
    noteModal.addEventListener('click', e => { if (e.target === noteModal) closeNoteModal(); });
    $('#noteForm')?.addEventListener('submit', handleNoteSubmit);
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeTradeModal();
      closeNoteModal();
    }
  });

  // Forms and Filters
  $('#tradeForm').addEventListener('submit', handleTradeSubmit);
  $('#tradeSearch').addEventListener('input', () => {
    $('#allTradesBody').innerHTML = filteredTrades().length ? getTradeRows(filteredTrades()) : '<tr><td colspan="8">No trades match your filters.</td></tr>';
    $('#tableCount').textContent = `Showing ${filteredTrades().length} of ${trades.length} trades`;
  });

  ['typeFilter', 'resultFilter'].forEach(id => {
    $('#' + id)?.addEventListener('change', () => {
      $('#allTradesBody').innerHTML = filteredTrades().length ? getTradeRows(filteredTrades()) : '<tr><td colspan="8">No trades match your filters.</td></tr>';
      $('#tableCount').textContent = `Showing ${filteredTrades().length} of ${trades.length} trades`;
    });
  });

  document.addEventListener('click', e => {
    const edit = e.target.closest('[data-edit-trade]');
    const del = e.target.closest('[data-delete-trade]');
    const delNote = e.target.closest('[data-delete-note]');

    if (edit) {
      const trade = trades.find(t => t.id === Number(edit.dataset.editTrade));
      if (trade) openTradeModal(trade);
    }
    if (del) deleteTrade(Number(del.dataset.deleteTrade));
    if (delNote) deleteNote(Number(delNote.dataset.deleteNote));
  });

  $('#exportCsv')?.addEventListener('click', downloadCsv);
  $('#analyticsExport')?.addEventListener('click', downloadCsv);
  $('#exportOverview')?.addEventListener('click', downloadCsv);

  // Risk Calculator
  $('#riskForm')?.addEventListener('submit', calculateRisk);
  ['balance', 'riskPercent', 'riskDirection', 'entryPrice', 'stopPrice', 'targetPrice', 'unitValue'].forEach(id => {
    $('#' + id)?.addEventListener('input', () => calculateRisk());
  });

  // Journal Filters
  $$('[data-journal-filter]').forEach(button => button.addEventListener('click', () => {
    selectedJournalFilter = button.dataset.journalFilter;
    $$('[data-journal-filter]').forEach(b => b.classList.toggle('active', b === button));
    renderNotes();
  }));

  // Profile Form
  $('#profileForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#displayName').value.trim();
    if (!name) return;

    currentCurrency = $('#currency').value;
    const email = $('#displayEmail').value;
    const theme = $('#appearance').value;
    const monthly_goal = Number($('#monthlyGoal')?.value) || 4000;
    monthlyGoalTarget = monthly_goal;

    applyUserProfile({ name, email, currency: currentCurrency, theme, monthly_goal });

    if (isBackendConnected && window.api) {
      try {
        await window.api.updateProfile({ name, email, currency: currentCurrency, theme, monthly_goal });
        $('#settingsMessage').textContent = 'Preferences saved to SQLite database.';
        showToast('Preferences saved to database.');
        await loadDataFromBackend();
      } catch (err) {
        showToast(err.message || 'Error saving preferences');
      }
    } else {
      localStorage.setItem('tradetrack_currency', JSON.stringify(currentCurrency));
      localStorage.setItem('tradetrack_profile', JSON.stringify({ name, email, currency: currentCurrency, theme }));
      renderStats();
      renderTrades();
      $('#settingsMessage').textContent = 'Preferences saved in local storage.';
      showToast('Preferences saved locally.');
    }
  });

  // Reset Demo Data
  $('#resetDemoDataBtn')?.addEventListener('click', async () => {
    if (!confirm('Reset all trades to default sample dataset in SQLite?')) return;
    try {
      if (isBackendConnected && window.api) {
        await window.api.resetSampleTrades();
        showToast('Database reset to sample records.');
        await loadDataFromBackend();
      }
    } catch (err) {
      showToast(err.message || 'Error resetting database');
    }
  });

  // Initialize
  initCharts();
  renderTrades();
  renderStats();
  renderNotes();
  calculateRisk();

  // Load from backend
  loadDataFromBackend();

  // Polling market status every 30 seconds for live feel
  setInterval(() => {
    if (window.api && isBackendConnected) {
      window.api.getMarketStatus().then(market => {
        if (market) $('#marketStatusText').textContent = market.statusText;
      }).catch(() => {});
    }
  }, 30000);
}

document.addEventListener('DOMContentLoaded', init);
