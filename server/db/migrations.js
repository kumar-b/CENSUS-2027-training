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
  `);

  // Seed default badges if table is empty
  const count = db.prepare('SELECT COUNT(*) as c FROM badges').get();
  if (count.c === 0) {
    const insert = db.prepare(`
      INSERT INTO badges (name_en, name_hi, description_en, description_hi, icon, criteria_type, criteria_value)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const seedBadges = db.transaction(() => {
      insert.run('First Step', 'पहला कदम', 'Complete your first quiz', 'पहली प्रश्नोत्तरी पूरी करें', '🌟', 'quizzes_completed', 1);
      insert.run('On Fire', 'जोश में', '10 correct answers in a row', 'लगातार 10 सही उत्तर', '🔥', 'streak', 10);
      insert.run('Week Warrior', 'सप्ताह योद्धा', 'Complete daily quiz 7 days in a row', '7 दिन लगातार दैनिक प्रश्नोत्तरी', '📅', 'daily_streak', 7);
      insert.run('Perfect Score', 'पूर्ण अंक', '100% on a timed quiz', 'समयबद्ध प्रश्नोत्तरी में 100%', '💯', 'perfect_timed', 1);
      insert.run('Chapter Master', 'अध्याय विशेषज्ञ', 'Complete all questions in a chapter', 'एक अध्याय के सभी प्रश्न पूरे करें', '📚', 'chapters_completed', 1);
      insert.run('Census Expert', 'जनगणना विशेषज्ञ', 'Complete all 6 chapters', 'सभी 6 अध्याय पूरे करें', '🏆', 'chapters_completed', 6);
      insert.run('Top of the Day', 'दिन के शीर्ष', 'Rank #1 on daily leaderboard', 'दैनिक लीडरबोर्ड पर #1', '🥇', 'daily_rank_1', 1);
      insert.run('Star Enumerator', 'स्टार गणनाकार', 'Earn 500 points as Enumerator', 'गणनाकार के रूप में 500 अंक', '⭐', 'points', 500);
    });
    seedBadges();
  }
}

module.exports = { runMigrations };
