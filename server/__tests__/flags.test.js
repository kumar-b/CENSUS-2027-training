const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH = path.join(__dirname, '../tmp', `flags-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register } = require('../services/authService');
const { seedQuestions } = require('../db/seeder');
const {
  submitFlag, getUserFlags, listFlags, getFlagDetail,
  updateFlagStatus, updateFlagQuestion, resolveFlag,
} = require('../services/flagService');

let userId, userId2, questionId;

beforeAll(() => {
  getDb();
  seedQuestions();
  const u1 = register({ mobile: '9100000001', password: 'pass', name: 'Flagger One', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  const u2 = register({ mobile: '9100000002', password: 'pass', name: 'Flagger Two', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' });
  userId = u1.id;
  userId2 = u2.id;
  questionId = getDb().prepare('SELECT id FROM questions LIMIT 1').get().id;
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('submitFlag creates a pending flag', () => {
  const flag = submitFlag({ userId, questionId, category: 'wrong_answer', note: 'Option B is correct not A' });
  expect(flag.id).toBeDefined();
  expect(flag.status).toBe('pending');
});

test('submitFlag throws 409 on duplicate', () => {
  expect(() => submitFlag({ userId, questionId, category: 'unclear', note: '' }))
    .toThrow(expect.objectContaining({ status: 409 }));
});

test('getUserFlags returns user flags with question excerpt', () => {
  const flags = getUserFlags(userId);
  expect(flags.length).toBe(1);
  expect(flags[0].question_excerpt).toBeDefined();
});

test('listFlags returns all flags filterable by status', () => {
  const all = listFlags({});
  expect(all.length).toBeGreaterThan(0);
  const pending = listFlags({ status: 'pending' });
  expect(pending.every(f => f.status === 'pending')).toBe(true);
});

test('getFlagDetail returns flag + full question data', () => {
  const flagId = listFlags({})[0].id;
  const detail = getFlagDetail(flagId);
  expect(detail.flag).toBeDefined();
  expect(detail.question.question_en).toBeDefined();
  expect(detail.question.options_en).toBeDefined();
});

test('updateFlagStatus sets approved with admin_note', () => {
  const flagId = listFlags({})[0].id;
  updateFlagStatus({ flagId, status: 'approved', adminNote: 'Confirmed wrong answer' });
  const detail = getFlagDetail(flagId);
  expect(detail.flag.status).toBe('approved');
  expect(detail.flag.admin_note).toBe('Confirmed wrong answer');
});

test('updateFlagQuestion updates question fields', () => {
  const flagId = listFlags({})[0].id;
  const detail = getFlagDetail(flagId);
  const qId = detail.question.id;
  updateFlagQuestion({ flagId, fields: { correct_option: 2, explanation_en: 'Fixed explanation' } });
  const updated = getDb().prepare('SELECT * FROM questions WHERE id=?').get(qId);
  expect(updated.correct_option).toBe(2);
  expect(updated.explanation_en).toBe('Fixed explanation');
});

test('resolveFlag awards 1000 pts to all approved flaggers', () => {
  const db = getDb();
  const flagId = listFlags({ status: 'approved' })[0].id;
  db.prepare("INSERT INTO question_flags (question_id, user_id, category, status) VALUES (?, ?, 'wrong_answer', 'approved')")
    .run(questionId, userId2);

  const beforePts1 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const beforePts2 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId2).total_points;

  resolveFlag({ flagId });

  const afterPts1 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId).total_points;
  const afterPts2 = db.prepare('SELECT total_points FROM users WHERE id=?').get(userId2).total_points;
  expect(afterPts1 - beforePts1).toBe(1000);
  expect(afterPts2 - beforePts2).toBe(1000);

  const flag = db.prepare('SELECT * FROM question_flags WHERE id=?').get(flagId);
  expect(flag.status).toBe('resolved');
  expect(flag.resolved_at).toBeDefined();
});

test('resolveFlag throws 400 if flag is not approved', () => {
  const db = getDb();
  const q2 = db.prepare('SELECT id FROM questions LIMIT 1 OFFSET 1').get();
  if (!q2) return;
  const flag2 = submitFlag({ userId, questionId: q2.id, category: 'unclear', note: '' });
  expect(() => resolveFlag({ flagId: flag2.id }))
    .toThrow(expect.objectContaining({ status: 400 }));
});
