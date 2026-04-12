const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const authenticate = require('../middleware/auth');
const { getDb } = require('../db/database');
const { startChallengeSession } = require('../services/quizService');

function handle(fn) {
  return (req, res) => {
    try {
      const result = fn(req, res);
      if (result !== undefined) res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

function generateCode(db) {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase();
    const exists = db.prepare('SELECT id FROM challenges WHERE code = ?').get(code);
    if (!exists) return code;
  }
  throw Object.assign(new Error('Could not generate unique code'), { status: 500 });
}

function getChapterQuestions(db, chapter, count) {
  if (chapter) {
    return db.prepare('SELECT id FROM questions WHERE chapter = ? ORDER BY RANDOM() LIMIT ?').all(chapter, count);
  }
  return db.prepare('SELECT id FROM questions ORDER BY RANDOM() LIMIT ?').all(count);
}

// POST /api/challenges/create
// Body: { chapter?: number, questionCount: 5|10|15 }
router.post('/create', authenticate, handle((req) => {
  const { chapter, questionCount = 10 } = req.body;
  if (![5, 10, 15].includes(Number(questionCount))) {
    throw Object.assign(new Error('questionCount must be 5, 10, or 15'), { status: 400 });
  }
  const db = getDb();
  const code = generateCode(db);
  const questions = getChapterQuestions(db, chapter || null, Number(questionCount));
  if (questions.length === 0) {
    throw Object.assign(new Error('No questions found for this chapter'), { status: 400 });
  }
  const questionIds = JSON.stringify(questions.map(q => q.id));
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');

  const { lastInsertRowid: challengeId } = db.prepare(`
    INSERT INTO challenges (code, creator_id, chapter, question_count, question_ids, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(code, req.user.sub, chapter || null, Number(questionCount), questionIds, expiresAt);

  db.prepare(`
    INSERT INTO challenge_participants (challenge_id, user_id) VALUES (?, ?)
  `).run(challengeId, req.user.sub);

  return { code, challengeId, expiresAt };
}));

// GET /api/challenges/:code — metadata only, no question content
router.get('/:code', authenticate, handle((req) => {
  const db = getDb();
  const challenge = db.prepare('SELECT * FROM challenges WHERE code = ?').get(req.params.code);
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 });
  if (new Date(challenge.expires_at) < new Date()) {
    throw Object.assign(new Error('This challenge has expired'), { status: 410 });
  }

  const creator = db.prepare('SELECT name FROM users WHERE id = ?').get(challenge.creator_id);
  const participants = db.prepare(`
    SELECT u.name, cp.completed_at,
           qs.score, qs.streak_max,
           (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = cp.session_id AND qa.is_correct = 1) as correct_count,
           (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = cp.session_id) as total_questions
    FROM challenge_participants cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN quiz_sessions qs ON qs.id = cp.session_id
    WHERE cp.challenge_id = ?
  `).all(challenge.id);

  return {
    code: challenge.code,
    chapter: challenge.chapter,
    questionCount: challenge.question_count,
    status: challenge.status,
    expiresAt: challenge.expires_at,
    creator: creator?.name,
    participants,
  };
}));

// POST /api/challenges/:code/join
router.post('/:code/join', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;
  const challenge = db.prepare('SELECT * FROM challenges WHERE code = ?').get(req.params.code);
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 });
  if (new Date(challenge.expires_at) < new Date()) {
    throw Object.assign(new Error('This challenge has expired'), { status: 410 });
  }

  // Check if already joined
  const existing = db.prepare(
    'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
  ).get(challenge.id, userId);

  if (existing && existing.session_id) {
    // Already has a session — return existing session state
    const session = db.prepare('SELECT * FROM quiz_sessions WHERE id = ?').get(existing.session_id);
    if (session && !session.completed) {
      // Resume: fetch all questions by frozen IDs
      const questionIds = JSON.parse(challenge.question_ids);
      const placeholders = questionIds.map(() => '?').join(',');
      const questionsById = db.prepare(`SELECT * FROM questions WHERE id IN (${placeholders})`).all(...questionIds);
      const allQuestions = questionIds.map(id => questionsById.find(q => q.id === id)).filter(Boolean);
      // Find already answered question IDs
      const answered = db.prepare('SELECT question_id FROM quiz_answers WHERE session_id = ?').all(existing.session_id);
      const answeredIds = new Set(answered.map(a => a.question_id));
      const remaining = allQuestions.filter(q => !answeredIds.has(q.id));
      return { sessionId: existing.session_id, questions: remaining, resumed: true };
    }
    // Already completed
    if (session && session.completed) {
      return { sessionId: existing.session_id, questions: [], completed: true };
    }
  }

  // New participant
  const questionIds = JSON.parse(challenge.question_ids);
  const { sessionId, questions } = startChallengeSession({ userId, questionIds });

  if (existing) {
    db.prepare('UPDATE challenge_participants SET session_id = ? WHERE challenge_id = ? AND user_id = ?')
      .run(sessionId, challenge.id, userId);
  } else {
    db.prepare('INSERT INTO challenge_participants (challenge_id, user_id, session_id) VALUES (?, ?, ?)')
      .run(challenge.id, userId, sessionId);
  }

  return { sessionId, questions, resumed: false };
}));

// POST /api/challenges/:code/complete
// Body: { sessionId }
// Called after QuizRunner has already completed the quiz session via /quiz/complete
router.post('/:code/complete', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;
  const { sessionId } = req.body;

  const challenge = db.prepare('SELECT * FROM challenges WHERE code = ?').get(req.params.code);
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 });

  const participant = db.prepare(
    'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
  ).get(challenge.id, userId);
  if (!participant) throw Object.assign(new Error('You are not a participant of this challenge'), { status: 403 });

  // Verify the session belongs to this participant
  if (participant.session_id !== sessionId) {
    throw Object.assign(new Error('Session mismatch'), { status: 400 });
  }

  // Mark participant as completed (if not already)
  if (!participant.completed_at) {
    db.prepare('UPDATE challenge_participants SET completed_at = CURRENT_TIMESTAMP WHERE challenge_id = ? AND user_id = ?')
      .run(challenge.id, userId);
  }

  // Check if all participants completed → mark challenge completed
  const incomplete = db.prepare(
    'SELECT COUNT(*) as c FROM challenge_participants WHERE challenge_id = ? AND completed_at IS NULL'
  ).get(challenge.id);
  if (incomplete.c === 0) {
    db.prepare("UPDATE challenges SET status = 'completed' WHERE id = ?").run(challenge.id);
  }

  // Return comparison results
  return getResults(db, challenge, userId);
}));

// GET /api/challenges/:code/results
// Only accessible after caller has completed their own attempt
router.get('/:code/results', authenticate, handle((req) => {
  const db = getDb();
  const userId = req.user.sub;
  const challenge = db.prepare('SELECT * FROM challenges WHERE code = ?').get(req.params.code);
  if (!challenge) throw Object.assign(new Error('Challenge not found'), { status: 404 });

  const participant = db.prepare(
    'SELECT * FROM challenge_participants WHERE challenge_id = ? AND user_id = ?'
  ).get(challenge.id, userId);

  if (!participant || !participant.completed_at) {
    throw Object.assign(new Error('Complete your attempt before viewing results'), { status: 403 });
  }

  return getResults(db, challenge, userId);
}));

function getResults(db, challenge, currentUserId) {
  const participants = db.prepare(`
    SELECT u.id as user_id, u.name, cp.completed_at,
           qs.score, qs.streak_max,
           (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = cp.session_id AND qa.is_correct = 1) as correct_count,
           (SELECT COUNT(*) FROM quiz_answers qa WHERE qa.session_id = cp.session_id) as total_questions
    FROM challenge_participants cp
    JOIN users u ON u.id = cp.user_id
    LEFT JOIN quiz_sessions qs ON qs.id = cp.session_id
    WHERE cp.challenge_id = ?
    ORDER BY qs.score DESC
  `).all(challenge.id);

  const questionCount = challenge.question_count;
  const allCompleted = participants.every(p => p.completed_at);

  return {
    code: challenge.code,
    chapter: challenge.chapter,
    questionCount,
    allCompleted,
    participants: participants.map(p => ({
      ...p,
      isYou: p.user_id === currentUserId,
    })),
  };
}

module.exports = router;
