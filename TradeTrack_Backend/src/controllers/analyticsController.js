const db = require('../db/database');
const { computeAnalytics } = require('../services/tradeAnalytics');

// GET /api/analytics/summary
exports.getAnalyticsSummary = (req, res) => {
  try {
    const trades = db.query('SELECT * FROM trades');
    const profile = db.get('SELECT * FROM profile WHERE id = 1') || { monthly_goal: 4000 };

    const analytics = computeAnalytics(trades, profile.monthly_goal);

    // Compute a dynamic insight based on real trade performance
    let insightTag = 'YOUR EDGE';
    let insightTitle = 'Consistent execution pays off.';
    let insightBody = 'Keep logging your entries and exits to uncover your highest probability market conditions.';

    if (analytics.strategyBreakdown.length > 0) {
      const best = analytics.strategyBreakdown[0];
      if (best.netPnl > 0) {
        insightTag = 'YOUR EDGE';
        insightTitle = `Strongest performance in ${best.strategy}.`;
        insightBody = `Your trade journal shows ${best.winRate}% win rate generating +$${best.netPnl.toLocaleString()} in net profit using ${best.strategy}. Continue reviewing setups in this category.`;
      }
    }

    res.json({
      success: true,
      data: {
        ...analytics,
        insight: {
          tag: insightTag,
          title: insightTitle,
          body: insightBody
        }
      }
    });
  } catch (error) {
    console.error('Error computing analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to compute analytics', error: error.message });
  }
};
