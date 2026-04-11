const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
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
    'SELECT id, name, mobile, functionary_type, state, district, total_points, language, photo, role, created_at FROM users WHERE id=?'
  ).get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const earnedIds = new Set(
    db.prepare('SELECT badge_id FROM user_badges WHERE user_id=?').all(userId).map(r => r.badge_id)
  );

  const allBadges = db.prepare('SELECT * FROM badges ORDER BY id ASC').all();
  const badges = allBadges.map(b => ({ ...b, earned: earnedIds.has(b.id) }));

  const sessions = db.prepare(`
    SELECT id, mode, chapter, score, max_score, streak_max, completed, started_at, completed_at
    FROM quiz_sessions WHERE user_id=? AND completed=1
    ORDER BY completed_at DESC LIMIT 20
  `).all(userId);

  return { user, badges, recentSessions: sessions };
}));

// PATCH /api/user/me — update language, name, or photo
router.patch('/me', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;
  const { lang, name, photo } = req.body;

  if (lang !== undefined) {
    if (!['en', 'hi'].includes(lang)) throw Object.assign(new Error('Invalid lang'), { status: 400 });
    db.prepare('UPDATE users SET language=? WHERE id=?').run(lang, userId);
  }
  if (name !== undefined) {
    if (!name.trim()) throw Object.assign(new Error('Name required'), { status: 400 });
    db.prepare('UPDATE users SET name=? WHERE id=?').run(name.trim(), userId);
  }
  if (photo !== undefined) {
    // photo is a base64 JPEG data URL string; store directly
    db.prepare('UPDATE users SET photo=? WHERE id=?').run(photo || null, userId);
  }

  return db.prepare(
    'SELECT id, name, mobile, functionary_type, state, district, total_points, language, photo, role FROM users WHERE id=?'
  ).get(userId);
}));

module.exports = router;
