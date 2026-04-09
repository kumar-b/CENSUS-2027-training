function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      functionary_type TEXT NOT NULL,
      state TEXT NOT NULL,
      district TEXT NOT NULL,
      language TEXT NOT NULL DEFAULT 'en',
      role TEXT NOT NULL DEFAULT 'user',
      total_points INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter INTEGER NOT NULL,
      topic TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      question_en TEXT NOT NULL,
      question_hi TEXT NOT NULL,
      options_en TEXT NOT NULL,
      options_hi TEXT NOT NULL,
      correct_option INTEGER NOT NULL,
      explanation_en TEXT NOT NULL,
      explanation_hi TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS quiz_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      mode TEXT NOT NULL,
      chapter INTEGER,
      score INTEGER NOT NULL DEFAULT 0,
      max_score INTEGER NOT NULL DEFAULT 0,
      streak_max INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER,
      completed INTEGER NOT NULL DEFAULT 0,
      started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME
    );

    CREATE TABLE IF NOT EXISTS quiz_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL REFERENCES quiz_sessions(id),
      question_id INTEGER NOT NULL REFERENCES questions(id),
      chosen_option INTEGER,
      is_correct INTEGER NOT NULL DEFAULT 0,
      points_earned INTEGER NOT NULL DEFAULT 0,
      time_taken INTEGER
    );

    CREATE TABLE IF NOT EXISTS badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name_en TEXT NOT NULL,
      name_hi TEXT NOT NULL,
      description_en TEXT NOT NULL,
      description_hi TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏅',
      criteria_type TEXT NOT NULL,
      criteria_value INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_badges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      badge_id INTEGER NOT NULL REFERENCES badges(id),
      earned_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      shared INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, badge_id)
    );

    CREATE TABLE IF NOT EXISTS daily_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      UNIQUE(user_id, date)
    );

    CREATE TABLE IF NOT EXISTS question_flags (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id  INTEGER NOT NULL REFERENCES questions(id),
      user_id      INTEGER NOT NULL REFERENCES users(id),
      category     TEXT NOT NULL,
      note         TEXT,
      status       TEXT NOT NULL DEFAULT 'pending',
      admin_note   TEXT,
      created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at  DATETIME,
      UNIQUE(question_id, user_id)
    );
  `);

  // Deduplicate questions (keep lowest id per question_en), then enforce uniqueness
  // Must run before CREATE UNIQUE INDEX — safe no-op if no duplicates exist
  db.exec(`
    DELETE FROM questions WHERE id NOT IN (
      SELECT MIN(id) FROM questions GROUP BY question_en
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_questions_unique ON questions(question_en);
  `);

  // Seed hardcoded admin accounts (no password_hash needed — they use ADMIN_SECRET)
  const adminUsers = [
    { mobile: '9873647919', name: 'Admin 1' },
    { mobile: '9713156166', name: 'Admin 2' },
    { mobile: '9669577888', name: 'Admin 3' },
  ];
  for (const { mobile, name } of adminUsers) {
    const exists = db.prepare('SELECT id FROM users WHERE mobile = ?').get(mobile);
    if (!exists) {
      db.prepare(`
        INSERT INTO users (mobile, password_hash, name, functionary_type, state, district, role)
        VALUES (?, '', ?, 'Census Staff General', 'Chhattisgarh', 'Raipur', 'admin')
      `).run(mobile, name);
    } else {
      db.prepare("UPDATE users SET role='admin' WHERE mobile=?").run(mobile);
    }
  }

  // Add photo column if not present (safe to run on existing DBs)
  const cols = db.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  if (!cols.includes('photo')) {
    db.exec('ALTER TABLE users ADD COLUMN photo TEXT');
  }

  // Fix Chapter Master badge: criteria_type should be 'perfect_chapter', not 'chapters_completed' with value 1
  db.prepare(
    "UPDATE badges SET criteria_type='perfect_chapter', description_en='Score 100% on a full chapter practice', description_hi='अध्याय अभ्यास में 100% अंक प्राप्त करें' WHERE name_en='Chapter Master'"
  ).run();

  // Upsert all badges by name — add missing ones, leave existing ones untouched
  const upsertBadge = (name_en, name_hi, desc_en, desc_hi, icon, criteria_type, criteria_value) => {
    const exists = db.prepare('SELECT id FROM badges WHERE name_en=?').get(name_en);
    if (!exists) {
      db.prepare(`
        INSERT INTO badges (name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(name_en, name_hi, desc_en, desc_hi, icon, criteria_type, criteria_value);
    }
  };

  // Original badges (idempotent — only inserts if table was empty initially)
  const count = db.prepare('SELECT COUNT(*) as c FROM badges').get();
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO badges (name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    db.transaction(() => {
      insert.run('First Step', 'पहला कदम', 'Complete your first quiz', 'पहली प्रश्नोत्तरी पूरी करें', '🌟', 'quizzes_completed', 1);
      insert.run('On Fire', 'जोश में', '10 correct answers in a row', 'लगातार 10 सही उत्तर', '🔥', 'streak', 10);
      insert.run('Week Warrior', 'सप्ताह योद्धा', 'Complete daily quiz 7 days in a row', '7 दिन लगातार दैनिक प्रश्नोत्तरी', '📅', 'daily_streak', 7);
      insert.run('Perfect Score', 'पूर्ण अंक', '100% on a timed quiz', 'समयबद्ध प्रश्नोत्तरी में 100%', '💯', 'perfect_timed', 1);
      insert.run('Chapter Master', 'अध्याय विशेषज्ञ', 'Score 100% on a full chapter practice', 'अध्याय अभ्यास में 100% अंक प्राप्त करें', '📚', 'perfect_chapter', 1);
      insert.run('Census Expert', 'जनगणना विशेषज्ञ', 'Complete all 6 chapters', 'सभी 6 अध्याय पूरे करें', '🏆', 'chapters_completed', 6);
      insert.run('Top of the Day', 'दिन के शीर्ष', 'Rank #1 on daily leaderboard', 'दैनिक लीडरबोर्ड पर #1', '🥇', 'daily_rank_1', 1);
      insert.run('Star Enumerator', 'स्टार गणनाकार', 'Earn 500 total points', '500 कुल अंक अर्जित करें', '⭐', 'points', 500);
    })();
  }

  // New badges (added incrementally — safe on existing DBs)
  upsertBadge('Quick Learner', 'तेज़ सीखने वाला', 'Complete 5 quizzes', '5 प्रश्नोत्तरी पूरी करें', '⚡', 'quizzes_completed', 5);
  upsertBadge('Dedicated', 'समर्पित', 'Complete 25 quizzes', '25 प्रश्नोत्तरी पूरी करें', '🎓', 'quizzes_completed', 25);
  upsertBadge('Century', 'शतक', '100 correct answers in total', 'कुल 100 सही उत्तर', '💯', 'total_correct', 100);
  upsertBadge('All-Rounder', 'ऑल राउंडर', 'Try all three quiz modes', 'तीनों क्विज़ मोड आज़माएं', '🌈', 'all_modes', 1);
  upsertBadge('Speed Star', 'स्पीड स्टार', 'Score 100% on 3 timed quizzes', '3 समयबद्ध प्रश्नोत्तरी में 100%', '🚀', 'perfect_timed', 3);
  upsertBadge('Chapter Champion', 'अध्याय चैम्पियन', 'Score 100% on 3 different chapters', '3 अलग अध्यायों में 100%', '🏅', 'perfect_chapter', 3);
  upsertBadge('Daily Devotee', 'नियमित साधक', 'Complete daily quiz 3 days in a row', '3 दिन लगातार दैनिक प्रश्नोत्तरी', '📅', 'daily_streak', 3);
  upsertBadge('High Scorer', 'उच्च स्कोरर', 'Earn 1000 total points', '1000 कुल अंक अर्जित करें', '💎', 'points', 1000);
  upsertBadge('Legend', 'किंवदंती', 'Earn 5000 total points', '5000 कुल अंक अर्जित करें', '👑', 'points', 5000);
  upsertBadge('Practice Makes Perfect', 'अभ्यास से सफलता', 'Complete practice in 3 chapters', '3 अध्यायों में अभ्यास पूरा करें', '🔄', 'chapters_completed', 3);

  // Reviewer badges (flag resolution rewards)
  upsertBadge('Question Spotter', 'प्रश्न खोजकर्ता', 'Successfully flag 1 incorrect question', '1 गलत प्रश्न की सफलतापूर्वक रिपोर्ट करें', '🔍', 'flags_resolved', 1);
  upsertBadge('Question Guardian', 'प्रश्न संरक्षक', 'Successfully flag 3 incorrect questions', '3 गलत प्रश्नों की सफलतापूर्वक रिपोर्ट करें', '🛡️', 'flags_resolved', 3);
  upsertBadge('Question Champion', 'प्रश्न चैम्पियन', 'Successfully flag 10 incorrect questions', '10 गलत प्रश्नों की सफलतापूर्वक रिपोर्ट करें', '🏅', 'flags_resolved', 10);
}

module.exports = { runMigrations };
