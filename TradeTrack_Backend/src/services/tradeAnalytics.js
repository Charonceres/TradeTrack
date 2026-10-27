/**
 * Analytics and P&L computation service for TradeTrack
 */

function calculateTradePnl(trade) {
  const entry = Number(trade.entry);
  const exit = Number(trade.exit);
  const quantity = Number(trade.quantity);
  const fees = Number(trade.fees) || 0;

  const gross = trade.direction === 'Long'
    ? (exit - entry) * quantity
    : (entry - exit) * quantity;

  return gross - fees;
}

function calculateTradeResult(trade) {
  const pnl = calculateTradePnl(trade);
  if (Math.abs(pnl) < 0.005) return 'even';
  return pnl > 0 ? 'win' : 'loss';
}

function calculateRr(trade) {
  const entry = Number(trade.entry);
  const exit = Number(trade.exit);
  const quantity = Number(trade.quantity);
  const stopLoss = Number(trade.stop_loss);

  const risk = stopLoss ? Math.abs(entry - stopLoss) * quantity : Math.abs(entry - exit) * quantity;
  if (!risk) return 1.0;
  return Math.abs((exit - entry) * quantity) / risk;
}

function computeAnalytics(trades, monthlyGoal = 4000) {
  const totalTrades = trades.length;
  
  if (totalTrades === 0) {
    return {
      summary: {
        totalTrades: 0,
        netPnl: 0,
        winRate: 0,
        profitFactor: 0,
        winningTrades: 0,
        losingTrades: 0,
        evenTrades: 0,
        avgWinner: 0,
        avgLoser: 0,
        avgRr: 0,
        bestStrategy: 'N/A',
        consistencyScore: 0,
        monthlyGoalProgress: {
          current: 0,
          target: monthlyGoal,
          percent: 0,
          remaining: monthlyGoal
        }
      },
      equityCurve: [],
      monthlyBreakdown: [],
      strategyBreakdown: [],
      marketBreakdown: [],
      checklist: {
        definedEntry: 92,
        setStopLoss: 89,
        followedRisk: 84,
        emotionalDiscipline: 73
      }
    };
  }

  // Enrich trades with computed values
  const enriched = trades.map(t => {
    const pnl = calculateTradePnl(t);
    const result = calculateTradeResult(t);
    const rr = calculateRr(t);
    return {
      ...t,
      netPnl: Number(pnl.toFixed(2)),
      result,
      rr: Number(rr.toFixed(2))
    };
  });

  const winners = enriched.filter(t => t.result === 'win');
  const losers = enriched.filter(t => t.result === 'loss');
  const evens = enriched.filter(t => t.result === 'even');

  const netPnl = enriched.reduce((sum, t) => sum + t.netPnl, 0);
  const grossWin = winners.reduce((sum, t) => sum + t.netPnl, 0);
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.netPnl, 0));

  const winRate = Number(((winners.length / totalTrades) * 100).toFixed(1));
  const profitFactor = grossLoss > 0
    ? Number((grossWin / grossLoss).toFixed(2))
    : grossWin > 0 ? 99.99 : 0;

  const avgWinner = winners.length > 0
    ? Number((grossWin / winners.length).toFixed(2))
    : 0;

  const avgLoser = losers.length > 0
    ? Number((grossLoss / losers.length).toFixed(2))
    : 0;

  const avgRr = Number((enriched.reduce((s, t) => s + t.rr, 0) / totalTrades).toFixed(2));

  // Cumulative equity curve (chronological)
  const chronological = [...enriched].sort((a, b) => a.date.localeCompare(b.date));
  let runningPnl = 0;
  const equityCurve = chronological.map(t => {
    runningPnl += t.netPnl;
    return {
      id: t.id,
      date: t.date,
      symbol: t.symbol,
      tradePnl: t.netPnl,
      cumulativePnl: Number(runningPnl.toFixed(2))
    };
  });

  // Strategy breakdown
  const strategyMap = {};
  enriched.forEach(t => {
    const s = t.strategy || 'Other';
    if (!strategyMap[s]) {
      strategyMap[s] = { strategy: s, netPnl: 0, trades: 0, wins: 0, losses: 0 };
    }
    strategyMap[s].netPnl += t.netPnl;
    strategyMap[s].trades += 1;
    if (t.result === 'win') strategyMap[s].wins += 1;
    if (t.result === 'loss') strategyMap[s].losses += 1;
  });

  const strategyBreakdown = Object.values(strategyMap).map(s => ({
    ...s,
    netPnl: Number(s.netPnl.toFixed(2)),
    winRate: Number(((s.wins / s.trades) * 100).toFixed(1))
  })).sort((a, b) => b.netPnl - a.netPnl);

  const bestStrategy = strategyBreakdown.length > 0 ? strategyBreakdown[0].strategy : 'N/A';

  // Monthly breakdown
  const monthMap = {};
  enriched.forEach(t => {
    const monthKey = t.date ? t.date.slice(0, 7) : 'Unknown';
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { month: monthKey, netPnl: 0, trades: 0, wins: 0 };
    }
    monthMap[monthKey].netPnl += t.netPnl;
    monthMap[monthKey].trades += 1;
    if (t.result === 'win') monthMap[monthKey].wins += 1;
  });

  const monthlyBreakdown = Object.values(monthMap).map(m => ({
    ...m,
    netPnl: Number(m.netPnl.toFixed(2)),
    winRate: Number(((m.wins / m.trades) * 100).toFixed(1))
  })).sort((a, b) => a.month.localeCompare(b.month));

  // Market breakdown
  const marketMap = {};
  enriched.forEach(t => {
    const m = t.market || 'Other';
    if (!marketMap[m]) {
      marketMap[m] = { market: m, count: 0, netPnl: 0, wins: 0 };
    }
    marketMap[m].count += 1;
    marketMap[m].netPnl += t.netPnl;
    if (t.result === 'win') marketMap[m].wins += 1;
  });

  const marketBreakdown = Object.values(marketMap).map(m => ({
    ...m,
    netPnl: Number(m.netPnl.toFixed(2)),
    winRate: Number(((m.wins / m.count) * 100).toFixed(1))
  }));

  // Consistency Score formula
  // Base 50 + win rate weight (up to 30) + profit factor weight (up to 20)
  const pfCapped = Math.min(profitFactor, 3.0);
  const consistencyScore = Math.min(100, Math.max(10, Math.round(
    30 + (winRate * 0.4) + ((pfCapped / 3.0) * 30)
  )));

  // Goal tracking
  const target = Number(monthlyGoal) || 4000;
  const currentGoalPnl = Math.max(0, netPnl);
  const goalPercent = Math.min(100, Number(((currentGoalPnl / target) * 100).toFixed(1)));
  const goalRemaining = Math.max(0, Number((target - currentGoalPnl).toFixed(2)));

  return {
    summary: {
      totalTrades,
      netPnl: Number(netPnl.toFixed(2)),
      winRate,
      profitFactor,
      winningTrades: winners.length,
      losingTrades: losers.length,
      evenTrades: evens.length,
      avgWinner,
      avgLoser,
      avgRr,
      bestStrategy,
      consistencyScore,
      monthlyGoalProgress: {
        current: Number(netPnl.toFixed(2)),
        target,
        percent: goalPercent,
        remaining: goalRemaining
      }
    },
    equityCurve,
    monthlyBreakdown,
    strategyBreakdown,
    marketBreakdown,
    checklist: {
      definedEntry: 92,
      setStopLoss: 89,
      followedRisk: 84,
      emotionalDiscipline: 73
    }
  };
}

module.exports = {
  calculateTradePnl,
  calculateTradeResult,
  calculateRr,
  computeAnalytics
};
