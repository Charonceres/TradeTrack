const db = require('../db/database');

function computeRisk(params) {
  const balance = Number(params.balance);
  const riskPercent = Number(params.riskPercent);
  const entry = Number(params.entryPrice);
  const stop = Number(params.stopPrice);
  const target = Number(params.targetPrice);
  const unit = Number(params.unitValue) || 1;
  const direction = params.direction === 'Short' ? 'Short' : 'Long';

  const riskDistance = Math.abs(entry - stop);
  const rewardDistance = direction === 'Long' ? target - entry : entry - target;

  const isValid = balance > 0 &&
    riskPercent > 0 && riskPercent <= 100 &&
    entry > 0 && stop > 0 && target > 0 &&
    unit > 0 && riskDistance > 0 && rewardDistance > 0 &&
    ((direction === 'Long' && stop < entry && target > entry) ||
     (direction === 'Short' && stop > entry && target < entry));

  if (!isValid) {
    return {
      valid: false,
      message: 'Stop and target prices must align with the chosen direction (Long: stop < entry < target, Short: target < entry < stop).'
    };
  }

  const riskAmount = (balance * riskPercent) / 100;
  const riskPerUnit = riskDistance * unit;
  const positionSize = riskAmount / riskPerUnit;
  const potentialReward = rewardDistance * unit * positionSize;
  const rewardRatio = rewardDistance / riskDistance;

  return {
    valid: true,
    data: {
      balance,
      riskPercent,
      direction,
      entryPrice: entry,
      stopPrice: stop,
      targetPrice: target,
      unitValue: unit,
      riskAmount: Number(riskAmount.toFixed(2)),
      riskPerUnit: Number(riskPerUnit.toFixed(4)),
      positionSize: Number(positionSize.toFixed(4)),
      potentialReward: Number(potentialReward.toFixed(2)),
      rewardRatio: Number(rewardRatio.toFixed(2)),
      formattedRatio: `1 : ${rewardRatio.toFixed(2)}`
    }
  };
}

// POST /api/risk/calculate
exports.calculateRisk = (req, res) => {
  try {
    const result = computeRisk(req.body);
    if (!result.valid) {
      return res.status(400).json({ success: false, message: result.message });
    }
    res.json({
      success: true,
      data: result.data
    });
  } catch (error) {
    console.error('Error calculating risk:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate risk', error: error.message });
  }
};

// POST /api/risk/save
exports.saveRiskCalculation = (req, res) => {
  try {
    const calc = computeRisk(req.body);
    if (!calc.valid) {
      return res.status(400).json({ success: false, message: calc.message });
    }

    const d = calc.data;
    const result = db.run(`
      INSERT INTO risk_calculations (balance, risk_percent, direction, entry_price, stop_price, target_price, unit_value, risk_amount, position_size, potential_reward, reward_ratio)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [d.balance, d.riskPercent, d.direction, d.entryPrice, d.stopPrice, d.targetPrice, d.unitValue, d.riskAmount, d.positionSize, d.potentialReward, d.rewardRatio]);

    const created = db.get('SELECT * FROM risk_calculations WHERE id = ?', [Number(result.lastInsertRowid)]);
    res.status(201).json({
      success: true,
      message: 'Risk calculation saved',
      data: created
    });
  } catch (error) {
    console.error('Error saving risk calculation:', error);
    res.status(500).json({ success: false, message: 'Failed to save risk calculation', error: error.message });
  }
};

// GET /api/risk/history
exports.getRiskHistory = (req, res) => {
  try {
    const history = db.query('SELECT * FROM risk_calculations ORDER BY created_at DESC LIMIT 20');
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('Error getting risk history:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve risk history', error: error.message });
  }
};
