const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH = path.join(__dirname, '../tmp', `quiz-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { startSession, submitAnswer, completeSession, calcPoints, streakMultiplier } = require('../services/quizService');

let userId;

beforeAll(() => {
  getDb(); // triggers migrations + badge seed
  const { seedQuestions } = require('../db/seeder');
  seedQuestions();
  const u = register({ mobile: '9000000001', password: 'pass', name: 'Quiz Tester', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u.id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('streakMultiplier returns correct values', () => {
  expect(streakMultiplier(0)).toBe(1.0);
  expect(streakMultiplier(2)).toBe(1.0);
  expect(streakMultiplier(3)).toBe(1.5);
  expect(streakMultiplier(5)).toBe(2.0);
  expect(streakMultiplier(10)).toBe(3.0);
});

test('calcPoints multiplies base by streak multiplier', () => {
  expect(calcPoints('easy', 0)).toBe(10);
  expect(calcPoints('easy', 3)).toBe(15);
  expect(calcPoints('hard', 10)).toBe(90);
});

test('startSession returns questions and sessionId', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'daily' });
  expect(sessionId).toBeDefined();
  expect(questions.length).toBeGreaterThan(0);
});

test('submitAnswer records correct answer and returns points', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  const q = questions[0];
  const result = submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  expect(result.isCorrect).toBe(true);
  expect(result.pointsEarned).toBeGreaterThan(0);
});

test('completeSession updates user total_points', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  const db = getDb();
  const before = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const result = completeSession(sessionId);
  const after = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  expect(after).toBe(before + result.totalPoints);
});
