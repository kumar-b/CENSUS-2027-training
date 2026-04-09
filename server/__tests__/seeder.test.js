const path = require('path');
const fs = require('fs');

// Must be set before requiring DB modules (Node module cache)
fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH = path.join(__dirname, '../tmp', `test-seeder-${Date.now()}.db`);
process.env.QA_DIR = path.join(__dirname, '../../QA');

const { seedQuestions } = require('../db/seeder');
const { getDb, closeDb } = require('../db/database');

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

test('seedQuestions imports at least one question from QA/Misc', () => {
  seedQuestions();
  const db = getDb();
  const count = db.prepare('SELECT COUNT(*) as c FROM questions').get();
  expect(count.c).toBeGreaterThan(0);
});
