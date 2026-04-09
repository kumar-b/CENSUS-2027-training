const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH = path.join(__dirname, '../tmp', `badge-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { startSession, submitAnswer, completeSession } = require('../services/quizService');
const { awardBadges } = require('../services/badgeService');

let userId;

beforeAll(() => {
  getDb();
  require('../db/seeder').seedQuestions();
  const u = register({ mobile: '9000000002', password: 'pass', name: 'Badge Tester', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u.id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('awardBadges returns First Step badge after completing first quiz', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) submitAnswer({ sessionId, questionId: q.id, chosenOption: 0 });
  completeSession(sessionId);

  const badges = awardBadges(userId);
  const names = badges.map(b => b.name_en);
  expect(names).toContain('First Step');
});

test('awardBadges does not re-award already-earned badges', () => {
  const { sessionId, questions } = startSession({ userId, mode: 'timed', chapter: 1 });
  for (const q of questions) submitAnswer({ sessionId, questionId: q.id, chosenOption: 0 });
  completeSession(sessionId);

  const badges = awardBadges(userId);
  const names = badges.map(b => b.name_en);
  expect(names).not.toContain('First Step');
});
