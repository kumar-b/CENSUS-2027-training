const { getDb } = require('../db/database');
const { awardBadges } = require('./badgeService');

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// POST /api/flags
function submitFlag({ userId, questionId, category, note }) {
  const db = getDb();

  const question = db.prepare('SELECT id FROM questions WHERE id=?').get(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

  try {
    const result = db.prepare(
      'INSERT INTO question_flags (question_id, user_id, category, note) VALUES (?, ?, ?, ?)'
    ).run(questionId, userId, category, note || null);
    return db.prepare('SELECT * FROM question_flags WHERE id=?').get(result.lastInsertRowid);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      throw Object.assign(new Error('Already flagged'), { status: 409 });
    }
    throw err;
  }
}

// GET /api/flags/mine
function getUserFlags(userId) {
  const db = getDb();
  return db.prepare(`
    SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    WHERE f.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId);
}

// GET /api/admin/flags?status=
function listFlags({ status } = {}) {
  const db = getDb();
  if (status) {
    return db.prepare(`
      SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt, u.name as reporter_name
      FROM question_flags f
      JOIN questions q ON q.id = f.question_id
      JOIN users u ON u.id = f.user_id
      WHERE f.status = ?
      ORDER BY f.created_at DESC
    `).all(status);
  }
  return db.prepare(`
    SELECT f.*, substr(q.question_en, 1, 80) as question_excerpt, u.name as reporter_name
    FROM question_flags f
    JOIN questions q ON q.id = f.question_id
    JOIN users u ON u.id = f.user_id
    ORDER BY f.created_at DESC
  `).all();
}

// GET /api/admin/flags/:id
function getFlagDetail(flagId) {
  const db = getDb();
  const flag = db.prepare(`
    SELECT f.*, u.name as reporter_name
    FROM question_flags f
    JOIN users u ON u.id = f.user_id
    WHERE f.id = ?
  `).get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(flag.question_id);

  const approvedCount = db.prepare(
    "SELECT COUNT(*) as c FROM question_flags WHERE question_id=? AND status='approved'"
  ).get(flag.question_id).c;

  return { flag, question, approvedCount };
}

// PATCH /api/admin/flags/:id/status — 'approved' or 'dismissed'
function updateFlagStatus({ flagId, status, adminNote }) {
  const db = getDb();
  const flag = db.prepare('SELECT id FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });
  if (!['approved', 'dismissed'].includes(status)) {
    throw Object.assign(new Error('Status must be approved or dismissed'), { status: 400 });
  }
  db.prepare('UPDATE question_flags SET status=?, admin_note=? WHERE id=?')
    .run(status, adminNote || null, flagId);
}

// PATCH /api/admin/flags/:id/question — edit question fields
function updateFlagQuestion({ flagId, fields }) {
  const db = getDb();
  const flag = db.prepare('SELECT question_id FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });

  const allowed = ['question_en', 'question_hi', 'options_en', 'options_hi', 'correct_option', 'explanation_en', 'explanation_hi'];
  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (updates.length === 0) throw Object.assign(new Error('No valid fields to update'), { status: 400 });

  const setClauses = updates.map(([k]) => `${k} = ?`).join(', ');
  const values = updates.map(([, v]) => v);
  db.prepare(`UPDATE questions SET ${setClauses} WHERE id=?`).run(...values, flag.question_id);
}

// POST /api/admin/flags/:id/resolve
function resolveFlag({ flagId, adminNote }) {
  const db = getDb();
  const flag = db.prepare('SELECT * FROM question_flags WHERE id=?').get(flagId);
  if (!flag) throw Object.assign(new Error('Flag not found'), { status: 404 });
  if (flag.status !== 'approved') {
    throw Object.assign(new Error('Flag must be approved before resolving'), { status: 400 });
  }

  const today = getTodayDate();

  const approvedFlaggers = db.prepare(
    "SELECT * FROM question_flags WHERE question_id=? AND status='approved'"
  ).all(flag.question_id);

  db.transaction(() => {
    for (const f of approvedFlaggers) {
      db.prepare('UPDATE users SET total_points = total_points + 1000 WHERE id=?').run(f.user_id);
      db.prepare(`
        INSERT INTO daily_scores (user_id, date, points) VALUES (?, ?, 1000)
        ON CONFLICT(user_id, date) DO UPDATE SET points = points + 1000
      `).run(f.user_id, today);
      db.prepare(
        "UPDATE question_flags SET status='resolved', admin_note=?, resolved_at=CURRENT_TIMESTAMP WHERE id=?"
      ).run(adminNote || null, f.id);
    }
  })();

  for (const f of approvedFlaggers) {
    try { awardBadges(f.user_id); } catch {}
  }

  return { resolvedCount: approvedFlaggers.length };
}

module.exports = { submitFlag, getUserFlags, listFlags, getFlagDetail, updateFlagStatus, updateFlagQuestion, resolveFlag };
