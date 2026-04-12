/**
 * Data persistence tests — verify that all critical data survives a DB
 * close + reopen cycle (i.e., it is written to disk, not just held in memory).
 *
 * Each test:
 *  1. Writes data via service functions
 *  2. Closes the DB (flushes WAL)
 *  3. Reopens with the same file path
 *  4. Reads back and asserts the data is intact
 */
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
const DB_FILE = path.join(__dirname, '../tmp', `persist-${Date.now()}.db`);
process.env.DB_PATH            = DB_FILE;
process.env.JWT_SECRET         = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR             = path.join(__dirname, '../../QA');

// Helper: close and reopen the DB (simulates server restart)
function cycleDb() {
  const { closeDb, getDb } = require('../db/database');
  closeDb();
  return getDb();
}

afterAll(() => {
  const { closeDb } = require('../db/database');
  closeDb();
  try { fs.unlinkSync(DB_FILE); } catch {}
});

// ── Setup ─────────────────────────────────────────────────────────────────────
beforeAll(() => {
  require('../db/database').getDb(); // initialise schema
  require('../db/seeder').seedQuestions();
});

// ── Users ─────────────────────────────────────────────────────────────────────
test('registered user persists across DB close/reopen', () => {
  const { register } = require('../services/authService');
  const user = register({
    mobile: '8800000001', password: 'pass', name: 'Persist User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  const db = cycleDb();
  const found = db.prepare('SELECT * FROM users WHERE id=?').get(user.id);
  expect(found).toBeDefined();
  expect(found.mobile).toBe('8800000001');
  expect(found.name).toBe('Persist User');
  expect(found.total_points).toBe(0);
});

// ── Quiz session + answers ─────────────────────────────────────────────────────
test('completed quiz session and answers persist across DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer, completeSession } = require('../services/quizService');

  const user = register({
    mobile: '8800000002', password: 'pass', name: 'Session User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  const { sessionId, questions } = startSession({ userId: user.id, mode: 'timed', chapter: 1 });
  let correctCount = 0;
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
    correctCount++;
  }
  const { totalPoints } = completeSession(sessionId);

  const db = cycleDb();

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  expect(session).toBeDefined();
  expect(session.completed).toBe(1);
  expect(session.score).toBe(totalPoints);
  expect(session.mode).toBe('timed');
  expect(session.chapter).toBe(1);

  const answerCount = db.prepare('SELECT COUNT(*) as c FROM quiz_answers WHERE session_id=?').get(sessionId).c;
  expect(answerCount).toBe(correctCount);
});

// ── User total_points accumulation ────────────────────────────────────────────
test('user total_points update persists across DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer, completeSession } = require('../services/quizService');

  const user = register({
    mobile: '8800000003', password: 'pass', name: 'Points User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  const { sessionId, questions } = startSession({ userId: user.id, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  const { totalPoints } = completeSession(sessionId);
  expect(totalPoints).toBeGreaterThan(0);

  const db = cycleDb();
  const found = db.prepare('SELECT total_points FROM users WHERE id=?').get(user.id);
  expect(found.total_points).toBe(totalPoints);
});

// ── Daily score ───────────────────────────────────────────────────────────────
test('daily score entry persists across DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer, completeSession } = require('../services/quizService');

  const user = register({
    mobile: '8800000004', password: 'pass', name: 'Daily User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  const { sessionId, questions } = startSession({ userId: user.id, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  const { totalPoints } = completeSession(sessionId);

  const today = new Date().toISOString().slice(0, 10);
  const db = cycleDb();
  const score = db.prepare('SELECT points FROM daily_scores WHERE user_id=? AND date=?').get(user.id, today);
  expect(score).toBeDefined();
  expect(score.points).toBe(totalPoints);
});

// ── Badges ────────────────────────────────────────────────────────────────────
test('awarded badges persist across DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer, completeSession } = require('../services/quizService');
  const { awardBadges } = require('../services/badgeService');

  const user = register({
    mobile: '8800000005', password: 'pass', name: 'Badge User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  // Complete a quiz to earn at least "First Step"
  const { sessionId, questions } = startSession({ userId: user.id, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  completeSession(sessionId);
  const awarded = awardBadges(user.id);
  expect(awarded.length).toBeGreaterThan(0);

  const db = cycleDb();
  const badgeIds = awarded.map(b => b.id);
  const rows = db.prepare(
    `SELECT badge_id FROM user_badges WHERE user_id=? AND badge_id IN (${badgeIds.map(() => '?').join(',')})`
  ).all(user.id, ...badgeIds);
  expect(rows.length).toBe(badgeIds.length);
});

// ── Practice session resume after restart ─────────────────────────────────────
test('incomplete practice session is resumable after DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer } = require('../services/quizService');

  const user = register({
    mobile: '8800000006', password: 'pass', name: 'Resume User',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  // Start and answer only the first question, then close DB
  const { sessionId, questions } = startSession({ userId: user.id, mode: 'practice', chapter: 1 });
  const q0 = questions[0];
  submitAnswer({ sessionId, questionId: q0.id, chosenOption: q0.correct_option });

  cycleDb(); // simulate restart

  // Resume — should return the same session with one less question
  const { sessionId: resumedId, questions: remaining, resumed } = startSession({
    userId: user.id, mode: 'practice', chapter: 1,
  });
  expect(resumedId).toBe(sessionId);
  expect(resumed).toBe(true);
  expect(remaining.find(q => q.id === q0.id)).toBeUndefined();
});

// ── Question flags ────────────────────────────────────────────────────────────
test('question flag persists across DB close/reopen', () => {
  const { register }   = require('../services/authService');
  const { startSession, submitAnswer } = require('../services/quizService');

  const user = register({
    mobile: '8800000007', password: 'pass', name: 'Flagger',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });

  // Get any question to flag
  const db = require('../db/database').getDb();
  const q = db.prepare('SELECT id FROM questions LIMIT 1').get();

  db.prepare(
    "INSERT INTO question_flags (user_id, question_id, category, note) VALUES (?, ?, 'wrong_answer', 'test flag')"
  ).run(user.id, q.id);

  const db2 = cycleDb();
  const flag = db2.prepare('SELECT * FROM question_flags WHERE user_id=? AND question_id=?').get(user.id, q.id);
  expect(flag).toBeDefined();
  expect(flag.status).toBe('pending');
  expect(flag.category).toBe('wrong_answer');
});

// ── Seeded questions survive restart ─────────────────────────────────────────
test('seeded questions persist across DB close/reopen', () => {
  const before = require('../db/database').getDb()
    .prepare('SELECT COUNT(*) as c FROM questions').get().c;
  expect(before).toBeGreaterThan(0);

  const db = cycleDb();
  const after = db.prepare('SELECT COUNT(*) as c FROM questions').get().c;
  expect(after).toBe(before);
});
