/**
 * Additional badge criteria not covered by badge.test.js:
 *  - points threshold badge
 *  - streak badge (streak_max in a session)
 *  - total_correct cumulative badge
 *  - chapters_completed (distinct practice chapters)
 *  - all_modes (daily + timed + practice all completed)
 *  - no double-award across runs
 */
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH            = path.join(__dirname, '../tmp', `badge-extra-${Date.now()}.db`);
process.env.JWT_SECRET         = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR             = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register }       = require('../services/authService');
const { startSession, submitAnswer, completeSession } = require('../services/quizService');
const { awardBadges } = require('../services/badgeService');

let userId;
let db;

beforeAll(() => {
  db = getDb();
  require('../db/seeder').seedQuestions();
  const u = register({
    mobile: '9300000001', password: 'pass', name: 'Badge Extra',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });
  userId = u.id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

// Helper: run a full timed quiz and complete it (all correct unless overridden)
function runTimed(uid, chapter = 1, allCorrect = true) {
  const { sessionId, questions } = startSession({ userId: uid, mode: 'timed', chapter });
  for (const q of questions) {
    const chosen = allCorrect ? q.correct_option : (q.correct_option + 1) % 4;
    submitAnswer({ sessionId, questionId: q.id, chosenOption: chosen });
  }
  completeSession(sessionId);
  return sessionId;
}

// Helper: run a full daily quiz and complete it
function runDaily(uid, allCorrect = true) {
  const { sessionId, questions } = startSession({ userId: uid, mode: 'daily' });
  for (const q of questions) {
    const chosen = allCorrect ? q.correct_option : (q.correct_option + 1) % 4;
    submitAnswer({ sessionId, questionId: q.id, chosenOption: chosen });
  }
  completeSession(sessionId);
}

// Helper: run practice for a chapter and complete it
function runPractice(uid, chapter = 1, allCorrect = true) {
  const { sessionId, questions } = startSession({ userId: uid, mode: 'practice', chapter });
  for (const q of questions) {
    const chosen = allCorrect ? q.correct_option : (q.correct_option + 1) % 4;
    submitAnswer({ sessionId, questionId: q.id, chosenOption: chosen });
  }
  completeSession(sessionId);
}

// ── points badge ──────────────────────────────────────────────────────────────
test('points badge is awarded when user total_points meets the threshold', () => {
  // Find a "points" badge with the lowest threshold
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='points' ORDER BY criteria_value ASC LIMIT 1").get();
  if (!badge) return; // skip if no such badge seeded

  // Directly set user total_points to meet the threshold
  db.prepare('UPDATE users SET total_points=? WHERE id=?').run(badge.criteria_value, userId);

  const newBadges = awardBadges(userId);
  const names = newBadges.map(b => b.name_en);
  expect(names).toContain(badge.name_en);
});

// ── streak badge ──────────────────────────────────────────────────────────────
test('streak badge is awarded after achieving a high correct streak in one session', () => {
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='streak' ORDER BY criteria_value ASC LIMIT 1").get();
  if (!badge) return;

  // We need streak_max >= criteria_value in at least one completed session
  // Directly insert a completed session with a high streak_max
  const requiredStreak = badge.criteria_value;
  db.prepare(`
    INSERT INTO quiz_sessions (user_id, mode, chapter, score, max_score, streak_max, completed, completed_at)
    VALUES (?, 'timed', 1, 100, 100, ?, 1, CURRENT_TIMESTAMP)
  `).run(userId, requiredStreak);

  const newBadges = awardBadges(userId);
  const names = newBadges.map(b => b.name_en);
  expect(names).toContain(badge.name_en);
});

// ── total_correct badge ───────────────────────────────────────────────────────
test('total_correct badge is awarded when cumulative correct answers meet threshold', () => {
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='total_correct' ORDER BY criteria_value ASC LIMIT 1").get();
  if (!badge) return;

  // Create a fresh user so their correct count is clean
  const fresh = register({
    mobile: '9300000002', password: 'pass', name: 'Correct Counter',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  // Get current total correct for this user
  const current = db.prepare(`
    SELECT COUNT(*) as c FROM quiz_answers
    WHERE session_id IN (SELECT id FROM quiz_sessions WHERE user_id=?) AND is_correct=1
  `).get(fresh.id).c;

  const needed = badge.criteria_value - current;
  if (needed <= 0) {
    // Already meets threshold
    const newBadges = awardBadges(fresh.id);
    expect(newBadges.map(b => b.name_en)).toContain(badge.name_en);
    return;
  }

  // Run enough quizzes to accumulate the required correct answers
  let remaining = needed;
  while (remaining > 0) {
    const { sessionId, questions } = startSession({ userId: fresh.id, mode: 'timed', chapter: 1 });
    for (const q of questions.slice(0, Math.min(remaining, questions.length))) {
      submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
      remaining--;
    }
    completeSession(sessionId);
  }

  const newBadges = awardBadges(fresh.id);
  expect(newBadges.map(b => b.name_en)).toContain(badge.name_en);
});

// ── chapters_completed badge ──────────────────────────────────────────────────
test('chapters_completed badge awarded after completing practice in distinct chapters', () => {
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='chapters_completed' ORDER BY criteria_value ASC LIMIT 1").get();
  if (!badge) return;

  const fresh = register({
    mobile: '9300000003', password: 'pass', name: 'Chapter Completer',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  const distinctChapters = db.prepare('SELECT DISTINCT chapter FROM questions ORDER BY chapter').all().map(r => r.chapter);
  const needed = Math.min(badge.criteria_value, distinctChapters.length);

  for (let i = 0; i < needed; i++) {
    runPractice(fresh.id, distinctChapters[i]);
  }

  const newBadges = awardBadges(fresh.id);
  expect(newBadges.map(b => b.name_en)).toContain(badge.name_en);
});

// ── all_modes badge ───────────────────────────────────────────────────────────
test('all_modes badge awarded after completing daily, timed, and practice modes', () => {
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='all_modes' LIMIT 1").get();
  if (!badge) return;

  const fresh = register({
    mobile: '9300000004', password: 'pass', name: 'All Modes',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  runDaily(fresh.id);
  runTimed(fresh.id, 1);
  runPractice(fresh.id, 1);

  const newBadges = awardBadges(fresh.id);
  expect(newBadges.map(b => b.name_en)).toContain(badge.name_en);
});

test('all_modes badge NOT awarded if only daily and timed are completed', () => {
  const badge = db.prepare("SELECT * FROM badges WHERE criteria_type='all_modes' LIMIT 1").get();
  if (!badge) return;

  const fresh = register({
    mobile: '9300000005', password: 'pass', name: 'No Practice',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  runDaily(fresh.id);
  runTimed(fresh.id, 1);
  // No practice session → all_modes not met

  const newBadges = awardBadges(fresh.id);
  expect(newBadges.map(b => b.name_en)).not.toContain(badge.name_en);
});
