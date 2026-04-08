const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const { startSession, submitAnswer, completeSession, hasCompletedDailyToday } = require('../services/quizService');
const { awardBadges } = require('../services/badgeService');

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

// GET /api/quiz/daily-status — check if user completed today's daily quiz
router.get('/daily-status', authenticate, handle((req) => {
  return { completed: hasCompletedDailyToday(req.user.sub) };
}));

// POST /api/quiz/start
// Body: { mode, chapter }
router.post('/start', authenticate, handle((req) => {
  const { mode, chapter } = req.body;
  return startSession({ userId: req.user.sub, mode, chapter });
}));

// POST /api/quiz/answer
// Body: { sessionId, questionId, chosenOption, timeTaken }
router.post('/answer', authenticate, handle((req) => {
  const { sessionId, questionId, chosenOption, timeTaken } = req.body;
  return submitAnswer({ sessionId, questionId, chosenOption, timeTaken });
}));

// POST /api/quiz/complete
// Body: { sessionId }
router.post('/complete', authenticate, handle((req) => {
  const { sessionId } = req.body;
  const result = completeSession(sessionId);
  const newBadges = awardBadges(req.user.sub);
  return { ...result, newBadges };
}));

module.exports = router;
