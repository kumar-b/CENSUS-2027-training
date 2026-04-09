const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const authenticate = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getDb } = require('../db/database');
const { listFlags, getFlagDetail, updateFlagStatus, updateFlagQuestion, resolveFlag } = require('../services/flagService');

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
router.get('/users', handle((req) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
  const q = (req.query.q || '').trim();
  const offset = (page - 1) * limit;

  const where = q ? `WHERE name LIKE ? OR mobile LIKE ? OR functionary_type LIKE ?` : '';
  const params = q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [];

  const total = db.prepare(`SELECT COUNT(*) as c FROM users ${where}`).get(...params).c;
  const users = db.prepare(`
    SELECT id, name, mobile, functionary_type, state, district, total_points, role, created_at, last_login
    FROM users ${where} ORDER BY total_points DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  return { users, total, page, pages: Math.ceil(total / limit) };
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

  const flags = db.prepare(`
    SELECT f.id, f.category, f.status, f.created_at,
      CASE WHEN length(q.question_en) > 80 THEN substr(q.question_en, 1, 80) || '…' ELSE q.question_en END as question_excerpt
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    WHERE f.user_id = ? ORDER BY f.created_at DESC LIMIT 20
  `).all(userId);

  return { user, badges, sessions, flags };
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
  const pendingFlags = db.prepare("SELECT COUNT(*) as c FROM question_flags WHERE status='pending'").get().c;

  return { totalUsers, totalSessions, todayActive, badgesAwarded, pendingFlags };
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

// GET /api/admin/flags?status=pending
router.get('/flags', handle((req) => {
  return listFlags({ status: req.query.status });
}));

// GET /api/admin/flags/:id
router.get('/flags/:id', handle((req) => {
  return getFlagDetail(Number(req.params.id));
}));

// PATCH /api/admin/flags/:id/status
// Body: { status: 'approved'|'dismissed', adminNote? }
router.patch('/flags/:id/status', handle((req) => {
  const { status, adminNote } = req.body;
  updateFlagStatus({ flagId: Number(req.params.id), status, adminNote });
  return { success: true };
}));

// PATCH /api/admin/flags/:id/question
// Body: { question_en?, question_hi?, options_en?, options_hi?, correct_option?, explanation_en?, explanation_hi? }
router.patch('/flags/:id/question', handle((req) => {
  updateFlagQuestion({ flagId: Number(req.params.id), fields: req.body });
  return { success: true };
}));

// POST /api/admin/flags/:id/resolve
// Body: { adminNote? }
router.post('/flags/:id/resolve', handle((req) => {
  return resolveFlag({ flagId: Number(req.params.id), adminNote: req.body.adminNote });
}));

module.exports = router;
