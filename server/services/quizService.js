const { getDb } = require('../db/database');

// Scoring constants
const BASE_POINTS = { easy: 10, medium: 20, hard: 30 };

function streakMultiplier(streak) {
  if (streak >= 10) return 3.0;
  if (streak >= 5) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

function calcPoints(difficulty, streak) {
  const base = BASE_POINTS[difficulty] || 10;
  return Math.round(base * streakMultiplier(streak));
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

// Get questions for a quiz mode
function getQuestions({ mode, chapter }) {
  const db = getDb();
  if (mode === 'daily') {
    return db.prepare('SELECT * FROM questions ORDER BY RANDOM() LIMIT 10').all();
  }
  if (mode === 'timed') {
    return db.prepare('SELECT * FROM questions WHERE chapter = ? ORDER BY RANDOM() LIMIT 15').all(chapter);
  }
  if (mode === 'practice') {
    return db.prepare('SELECT * FROM questions WHERE chapter = ? ORDER BY id').all(chapter);
  }
  throw Object.assign(new Error('Invalid quiz mode'), { status: 400 });
}

// Check if user already completed today's daily quiz
function hasCompletedDailyToday(userId) {
  const db = getDb();
  const today = getTodayDate();
  const session = db.prepare(
    "SELECT id FROM quiz_sessions WHERE user_id=? AND mode='daily' AND date(started_at)=? AND completed=1"
  ).get(userId, today);
  return !!session;
}

// Start a new session (or resume practice)
function startSession({ userId, mode, chapter }) {
  const db = getDb();

  // Resume incomplete practice session
  if (mode === 'practice') {
    const existing = db.prepare(
      "SELECT * FROM quiz_sessions WHERE user_id=? AND mode='practice' AND chapter=? AND completed=0 ORDER BY id DESC LIMIT 1"
    ).get(userId, chapter);
    if (existing) {
      const answered = db.prepare('SELECT question_id FROM quiz_answers WHERE session_id=?').all(existing.id);
      const questions = getQuestions({ mode, chapter });
      const answeredIds = new Set(answered.map(a => a.question_id));
      const remaining = questions.filter(q => !answeredIds.has(q.id));
      return { sessionId: existing.id, questions: remaining, resumed: true };
    }
  }

  const questions = getQuestions({ mode, chapter: chapter || null });
  const maxScore = questions.reduce((sum, q) => sum + (BASE_POINTS[q.difficulty] || 10) * 3, 0);

  const result = db.prepare(`
    INSERT INTO quiz_sessions (user_id, mode, chapter, max_score)
    VALUES (?, ?, ?, ?)
  `).run(userId, mode, chapter || null, maxScore);

  return { sessionId: result.lastInsertRowid, questions, resumed: false };
}

// Submit an answer for a question in a session
function submitAnswer({ sessionId, questionId, chosenOption, timeTaken }) {
  const db = getDb();

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  if (!session || session.completed) {
    throw Object.assign(new Error('Session not found or already completed'), { status: 404 });
  }

  const question = db.prepare('SELECT * FROM questions WHERE id=?').get(questionId);
  if (!question) throw Object.assign(new Error('Question not found'), { status: 404 });

  // Calculate current streak in this session
  const prevAnswers = db.prepare(
    'SELECT is_correct FROM quiz_answers WHERE session_id=? ORDER BY id DESC'
  ).all(sessionId);
  let streak = 0;
  for (const a of prevAnswers) {
    if (a.is_correct) streak++;
    else break;
  }

  const isCorrect = chosenOption === question.correct_option ? 1 : 0;
  const currentStreak = isCorrect ? streak + 1 : 0;
  const pointsEarned = isCorrect ? calcPoints(question.difficulty, currentStreak) : 0;

  db.prepare(`
    INSERT INTO quiz_answers (session_id, question_id, chosen_option, is_correct, points_earned, time_taken)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(sessionId, questionId, chosenOption, isCorrect, pointsEarned, timeTaken || null);

  return {
    isCorrect: !!isCorrect,
    correctOption: question.correct_option,
    explanation_en: question.explanation_en,
    explanation_hi: question.explanation_hi,
    pointsEarned,
    currentStreak,
  };
}

// Complete a session — compute final score, update user points and daily score
function completeSession(sessionId) {
  const db = getDb();

  const session = db.prepare('SELECT * FROM quiz_sessions WHERE id=?').get(sessionId);
  if (!session) throw Object.assign(new Error('Session not found'), { status: 404 });

  const answers = db.prepare('SELECT * FROM quiz_answers WHERE session_id=?').all(sessionId);
  const totalPoints = answers.reduce((sum, a) => sum + a.points_earned, 0);
  const streakMax = (() => {
    let max = 0, cur = 0;
    for (const a of answers) { cur = a.is_correct ? cur + 1 : 0; max = Math.max(max, cur); }
    return max;
  })();

  const correctCount = answers.filter(a => a.is_correct).length;
  const today = getTodayDate();

  db.prepare(`
    UPDATE quiz_sessions SET completed=1, score=?, streak_max=?, completed_at=CURRENT_TIMESTAMP WHERE id=?
  `).run(totalPoints, streakMax, sessionId);

  // Add to user total_points
  db.prepare('UPDATE users SET total_points = total_points + ? WHERE id=?').run(totalPoints, session.user_id);

  // Upsert daily score
  db.prepare(`
    INSERT INTO daily_scores (user_id, date, points) VALUES (?, ?, ?)
    ON CONFLICT(user_id, date) DO UPDATE SET points = points + excluded.points
  `).run(session.user_id, today, totalPoints);

  return { totalPoints, correctCount, totalQuestions: answers.length, streakMax };
}

module.exports = { startSession, submitAnswer, completeSession, hasCompletedDailyToday, calcPoints, streakMultiplier };
