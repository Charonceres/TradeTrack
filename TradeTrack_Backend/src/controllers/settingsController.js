const db = require('../db/database');

// GET /api/settings/profile
exports.getProfile = (req, res) => {
  try {
    let profile = db.get('SELECT * FROM profile WHERE id = 1');
    if (!profile) {
      db.run(`
        INSERT INTO profile (id, name, email, currency, theme, monthly_goal)
        VALUES (1, 'Rhythm', 'rhythm@example.com', 'USD', 'dark', 4000)
      `);
      profile = db.get('SELECT * FROM profile WHERE id = 1');
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile settings', error: error.message });
  }
};

// PUT /api/settings/profile
exports.updateProfile = (req, res) => {
  try {
    const { name, email, currency, theme, monthly_goal } = req.body;

    const existing = db.get('SELECT * FROM profile WHERE id = 1') || {
      name: 'Rhythm',
      email: 'rhythm@example.com',
      currency: 'USD',
      theme: 'dark',
      monthly_goal: 4000
    };

    const newName = (name && name.trim()) ? name.trim() : existing.name;
    const newEmail = (email && email.trim()) ? email.trim() : existing.email;
    const newCurrency = (currency && ['USD', 'INR', 'EUR', 'GBP'].includes(currency)) ? currency : existing.currency;
    const newTheme = (theme && ['dark', 'light'].includes(theme)) ? theme : existing.theme;
    const newGoal = (monthly_goal && Number(monthly_goal) > 0) ? Number(monthly_goal) : existing.monthly_goal;

    db.run(`
      UPDATE profile
      SET name = ?, email = ?, currency = ?, theme = ?, monthly_goal = ?, updated_at = datetime('now')
      WHERE id = 1
    `, [newName, newEmail, newCurrency, newTheme, newGoal]);

    const updated = db.get('SELECT * FROM profile WHERE id = 1');
    res.json({
      success: true,
      message: 'Profile settings updated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile settings', error: error.message });
  }
};
