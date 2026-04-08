const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getDb } = require('../db/database');

// All admin routes require authentication + admin role
router.use(authenticate, adminOnly);

function handle(fn) {
  return (req, res) => {
    try {
      res.json(fn(req));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// GET /api/admin/users — list all users with stats
router.get('/users', handle(() => {
  const db = getDb();
  return db.prepare(`
    SELECT id, name, mobile, functionary_type, state, district, total_points, role, created_at, last_login
    FROM users ORDER BY total_points DESC
  `).all();
}));

// GET /api/admin/users/:id — user detail with badges + sessions
router.get('/users/:id', handle((req) => {
  const db = getDb();
  const userId = Number(req.params.id);

  const user = db.prepare(
    'SELECT id, name, mobile, functionary_type, state, district, total_points, role, created_at, last_login FROM users WHERE id=?'
  ).get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const badges = db.prepare(`
    SELECT b.*, ub.earned_at FROM badges b
    JOIN user_badges ub ON ub.badge_id = b.id
    WHERE ub.user_id = ? ORDER BY ub.earned_at DESC
  `).all(userId);

  const sessions = db.prepare(`
    SELECT id, mode, chapter, score, max_score, streak_max, completed, started_at, completed_at
    FROM quiz_sessions WHERE user_id=? ORDER BY started_at DESC LIMIT 50
  `).all(userId);

  return { user, badges, sessions };
}));

// PATCH /api/admin/users/:id/reset-password
// Body: { newPassword }
router.patch('/users/:id/reset-password', handle((req) => {
  const db = getDb();
  const userId = Number(req.params.id);
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 6) {
    throw Object.assign(new Error('Password must be at least 6 characters'), { status: 400 });
  }

  const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, userId);
  return { success: true };
}));

// PATCH /api/admin/users/:id/role
// Body: { role }
router.patch('/users/:id/role', handle((req) => {
  const db = getDb();
  const userId = Number(req.params.id);
  const { role } = req.body;

  if (!['user', 'admin'].includes(role)) {
    throw Object.assign(new Error('Invalid role'), { status: 400 });
  }

  const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId);
  if (!user) throw Object.assign(new Error('User not found'), { status: 404 });

  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, userId);
  return { success: true };
}));

// GET /api/admin/stats — aggregate stats
router.get('/stats', handle(() => {
  const db = getDb();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const totalSessions = db.prepare('SELECT COUNT(*) as c FROM quiz_sessions WHERE completed=1').get().c;
  const todayDate = new Date().toISOString().slice(0, 10);
  const todayActive = db.prepare(
    "SELECT COUNT(DISTINCT user_id) as c FROM quiz_sessions WHERE date(started_at)=?"
  ).get(todayDate).c;
  const badgesAwarded = db.prepare('SELECT COUNT(*) as c FROM user_badges').get().c;

  return { totalUsers, totalSessions, todayActive, badgesAwarded };
}));

// GET /api/admin/badges — list all badges with earned counts
router.get('/badges', handle(() => {
  const db = getDb();
  return db.prepare(`
    SELECT b.*, COUNT(ub.user_id) as earned_count
    FROM badges b LEFT JOIN user_badges ub ON ub.badge_id = b.id
    GROUP BY b.id ORDER BY b.id
  `).all();
}));

module.exports = router;
