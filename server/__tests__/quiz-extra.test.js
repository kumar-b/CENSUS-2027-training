/**
 * Extra quiz scenarios not covered by quiz.test.js:
 *  - wrong answers award 0 points
 *  - streak accumulates and resets correctly
 *  - hasCompletedDailyToday
 *  - practice session resume
 *  - startChallengeSession preserves question order
 *  - error cases: invalid mode, missing session, completed session
 */
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH            = path.join(__dirname, '../tmp', `quiz-extra-${Date.now()}.db`);
process.env.JWT_SECRET         = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR             = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register }       = require('../services/authService');
const {
  startSession, submitAnswer, completeSession,
  hasCompletedDailyToday, startChallengeSession,
} = require('../services/quizService');

let userId;
let allQuestions;

beforeAll(() => {
  getDb();
  require('../db/seeder').seedQuestions();
  const u = register({
    mobile: '9200000001', password: 'pass', name: 'QuizExtra',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });
  userId = u.id;
  allQuestions = getDb().prepare('SELECT * FROM questions LIMIT 20').all();
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

// ── Wrong answers ─────────────────────────────────────────────────────────────
test('wrong answer awards 0 points and resets streak to 0', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'daily' });
  const q = questions[0];
  const wrongOption = (q.correct_option + 1) % 4;

  const result = submitAnswer({ sessionId, questionId: q.id, chosenOption: wrongOption });
  expect(result.isCorrect).toBe(false);
  expect(result.pointsEarned).toBe(0);
  expect(result.currentStreak).toBe(0);
});

// ── Streak accumulation ───────────────────────────────────────────────────────
test('consecutive correct answers build the streak multiplier', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });

  const results = [];
  for (const q of questions.slice(0, 5)) {
    const r = submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
    results.push({ ...r, difficulty: q.difficulty });
  }

  // Verify streak increments correctly
  expect(results[4].currentStreak).toBe(5);

  // Verify the multiplier is applied per question: each answer's points should equal
  // base(difficulty) × streakMultiplier(streak), not just be ≥ previous (which can
  // fail when question difficulties vary in random order).
  const BASE = { easy: 10, medium: 20, hard: 30 };
  const mult = (s) => s >= 10 ? 3.0 : s >= 5 ? 2.0 : s >= 3 ? 1.5 : 1.0;
  results.forEach((r, i) => {
    const expected = Math.round((BASE[r.difficulty] || 10) * mult(i + 1));
    expect(r.pointsEarned).toBe(expected);
  });
});

test('streak resets after a wrong answer mid-session', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });

  // 3 correct → streak = 3
  for (const q of questions.slice(0, 3)) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }

  // 1 wrong → streak drops to 0
  const q3 = questions[3];
  const wrongOption = (q3.correct_option + 1) % 4;
  const afterWrong = submitAnswer({ sessionId, questionId: q3.id, chosenOption: wrongOption });
  expect(afterWrong.currentStreak).toBe(0);

  // Next correct → streak restarts at 1
  const q4 = questions[4];
  const afterCorrect = submitAnswer({ sessionId, questionId: q4.id, chosenOption: q4.correct_option });
  expect(afterCorrect.currentStreak).toBe(1);
});

// ── hasCompletedDailyToday ────────────────────────────────────────────────────
test('hasCompletedDailyToday returns false before completing a daily quiz', () => {
  const fresh = register({
    mobile: '9200000002', password: 'pass', name: 'Daily Test',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });
  expect(hasCompletedDailyToday(fresh.id)).toBe(false);
});

test('hasCompletedDailyToday returns true after completing a daily quiz', () => {
  const fresh = register({
    mobile: '9200000003', password: 'pass', name: 'Daily Done',
    functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
  });
  const { sessionId, questions } = startSession({ userId: fresh.id, mode: 'daily' });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  completeSession(sessionId);
  expect(hasCompletedDailyToday(fresh.id)).toBe(true);
});

// ── Practice session resume ───────────────────────────────────────────────────
test('startSession resumes an incomplete practice session', () => {
  const chapter = allQuestions[0].chapter;
  const { sessionId: firstId, questions: firstQs } = startSession({ userId, mode: 'practice', chapter });

  // Answer only the first question, leave the rest
  const q0 = firstQs[0];
  submitAnswer({ sessionId: firstId, questionId: q0.id, chosenOption: q0.correct_option });

  // Start again — should resume the same session
  const { sessionId: resumedId, questions: remaining, resumed } = startSession({ userId, mode: 'practice', chapter });
  expect(resumedId).toBe(firstId);
  expect(resumed).toBe(true);
  // The already-answered question should not be in the remaining list
  expect(remaining.find(q => q.id === q0.id)).toBeUndefined();
});

// ── Error cases ───────────────────────────────────────────────────────────────
test('getQuestions throws 400 for invalid mode', () => {
  expect(() => startSession({ userId, mode: 'invalid' }))
    .toThrow(expect.objectContaining({ status: 400 }));
});

test('submitAnswer throws 404 for non-existent session', () => {
  const q = allQuestions[0];
  expect(() => submitAnswer({ sessionId: 999999, questionId: q.id, chosenOption: 0 }))
    .toThrow(expect.objectContaining({ status: 404 }));
});

test('submitAnswer throws 404 for a completed session', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  completeSession(sessionId);

  // Try to answer again
  expect(() => submitAnswer({ sessionId, questionId: questions[0].id, chosenOption: 0 }))
    .toThrow(expect.objectContaining({ status: 404 }));
});

test('completeSession throws 404 for non-existent session', () => {
  expect(() => completeSession(999999))
    .toThrow(expect.objectContaining({ status: 404 }));
});

// ── startChallengeSession ─────────────────────────────────────────────────────
test('startChallengeSession returns questions in the exact frozen order', () => {
  const ids = allQuestions.slice(0, 5).map(q => q.id);
  const reversed = [...ids].reverse();

  const { questions } = startChallengeSession({ userId, questionIds: reversed });
  expect(questions.map(q => q.id)).toEqual(reversed);
});

test('startChallengeSession filters out invalid question IDs', () => {
  const validIds = allQuestions.slice(0, 3).map(q => q.id);
  const mixed = [999999, ...validIds, 888888];

  const { questions } = startChallengeSession({ userId, questionIds: mixed });
  const returnedIds = questions.map(q => q.id);
  // Only valid IDs should appear, in their original positions
  expect(returnedIds).toEqual(validIds);
});

test('startChallengeSession creates a quiz session with mode=challenge', () => {
  const ids = allQuestions.slice(0, 5).map(q => q.id);
  const { sessionId } = startChallengeSession({ userId, questionIds: ids });

  const db = getDb();
  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  expect(session.mode).toBe('challenge');
  expect(session.completed).toBe(0);
});
