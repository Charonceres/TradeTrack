const db = require('../db/database');

// GET /api/notes
exports.getAllNotes = (req, res) => {
  try {
    const { category, search } = req.query;
    let sql = 'SELECT * FROM notes WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      sql += ' AND category = ?';
      params.push(category);
    }

    if (search && search.trim()) {
      const term = `%${search.trim().toLowerCase()}%`;
      sql += ' AND (LOWER(title) LIKE ? OR LOWER(body) LIKE ? OR LOWER(mood) LIKE ?)';
      params.push(term, term, term);
    }

    sql += ' ORDER BY date DESC, id DESC';
    const notes = db.query(sql, params);

    // Summary counts
    const total = notes.length;
    const lessons = notes.filter(n => n.category === 'lesson').length;
    const discipline = notes.filter(n => n.category === 'discipline').length;

    // Most logged mood
    const moodCounts = {};
    notes.forEach(n => {
      const m = n.mood || 'Reflective';
      moodCounts[m] = (moodCounts[m] || 0) + 1;
    });
    let mostLoggedMood = 'Reflective';
    let maxMoodCount = 0;
    for (const [mood, count] of Object.entries(moodCounts)) {
      if (count > maxMoodCount) {
        maxMoodCount = count;
        mostLoggedMood = mood;
      }
    }

    res.json({
      success: true,
      meta: {
        total,
        lessons,
        discipline,
        mostLoggedMood
      },
      data: notes
    });
  } catch (error) {
    console.error('Error fetching reflections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reflections', error: error.message });
  }
};

// POST /api/notes
exports.createNote = (req, res) => {
  try {
    const {
      title,
      body,
      category = 'discipline',
      mood = 'Reflective',
      date
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Reflection title is required' });
    }
    if (!body || !body.trim()) {
      return res.status(400).json({ success: false, message: 'Reflection body text is required' });
    }

    const noteDate = date || new Date().toISOString().slice(0, 10);
    const validCategory = (category === 'lesson') ? 'lesson' : 'discipline';

    const result = db.run(`
      INSERT INTO notes (date, category, title, mood, body)
      VALUES (?, ?, ?, ?, ?)
    `, [noteDate, validCategory, title.trim(), (mood || 'Reflective').trim(), body.trim()]);

    const created = db.get('SELECT * FROM notes WHERE id = ?', [Number(result.lastInsertRowid)]);

    res.status(201).json({
      success: true,
      message: 'Reflection added successfully',
      data: created
    });
  } catch (error) {
    console.error('Error creating reflection:', error);
    res.status(500).json({ success: false, message: 'Failed to create reflection', error: error.message });
  }
};

// DELETE /api/notes/:id
exports.deleteNote = (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const existing = db.get('SELECT * FROM notes WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Reflection not found' });
    }

    db.run('DELETE FROM notes WHERE id = ?', [id]);
    res.json({
      success: true,
      message: `Reflection #${id} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting reflection:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reflection', error: error.message });
  }
};
