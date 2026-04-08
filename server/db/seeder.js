const fs = require('fs');
const path = require('path');
const { getDb } = require('./database');

const QA_DIR = process.env.QA_DIR || path.join(__dirname, '../../../QA');

function seedQuestions() {
  if (!fs.existsSync(QA_DIR)) {
    console.log(`QA directory not found at ${QA_DIR}, skipping seed.`);
    return;
  }

  const db = getDb();
  const upsert = db.prepare(`
    INSERT INTO questions
      (chapter, topic, difficulty, question_en, question_hi,
       options_en, options_hi, correct_option, explanation_en, explanation_hi)
    VALUES
      (@chapter, @topic, @difficulty, @question_en, @question_hi,
       @options_en, @options_hi, @correct_option, @explanation_en, @explanation_hi)
    ON CONFLICT DO NOTHING
  `);

  const topics = fs.readdirSync(QA_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  let total = 0;
  for (const topic of topics) {
    const filePath = path.join(QA_DIR, topic, 'questions.json');
    if (!fs.existsSync(filePath)) continue;

    let questions;
    try {
      questions = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    } catch (e) {
      console.error(`Failed to parse ${filePath}: ${e.message}`);
      continue;
    }

    const insertMany = db.transaction((qs) => {
      for (const q of qs) {
        upsert.run({
          chapter: q.chapter,
          topic: q.topic || topic,
          difficulty: q.difficulty,
          question_en: q.question_en,
          question_hi: q.question_hi,
          options_en: JSON.stringify(q.options_en),
          options_hi: JSON.stringify(q.options_hi),
          correct_option: q.correct_option,
          explanation_en: q.explanation_en,
          explanation_hi: q.explanation_hi,
        });
      }
    });
    insertMany(questions);
    total += questions.length;
  }
  console.log(`QA seeder: processed ${total} questions from ${topics.length} topic(s).`);
}

module.exports = { seedQuestions };
