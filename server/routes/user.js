const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { getDb } = require('../db/database');

function handle(fn) {
  return (req, res) => {
    try {
      res.json(fn(req));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// GET /api/user/me — profile + badges + recent sessions
router.get('/me', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;

  const user = db.prepare(
    'SELECT id, name, mobile, functionary_type, state, district, total_points, lang, role, created_at FROM users WHERE id=?'
  ).get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const badges = db.prepare(`
    SELECT b.* FROM badges b
    JOIN user_badges ub ON ub.badge_id = b.id
    WHERE ub.user_id = ?
    ORDER BY ub.earned_at DESC
  `).all(userId);

  const sessions = db.prepare(`
    SELECT id, mode, chapter, score, max_score, streak_max, completed, started_at, completed_at
    FROM quiz_sessions WHERE user_id=? AND completed=1
    ORDER BY completed_at DESC LIMIT 20
  `).all(userId);

  return { user, badges, recentSessions: sessions };
}));

// PATCH /api/user/me — update lang or name
router.patch('/me', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;
  const { lang, name } = req.body;

  if (lang !== undefined) {
    if (!['en', 'hi'].includes(lang)) throw Object.assign(new Error('Invalid lang'), { status: 400 });
    db.prepare('UPDATE users SET lang=? WHERE id=?').run(lang, userId);
  }
  if (name !== undefined) {
    if (!name.trim()) throw Object.assign(new Error('Name required'), { status: 400 });
    db.prepare('UPDATE users SET name=? WHERE id=?').run(name.trim(), userId);
  }

  return db.prepare(
    'SELECT id, name, mobile, functionary_type, state, district, total_points, lang, role FROM users WHERE id=?'
  ).get(userId);
}));

module.exports = router;
