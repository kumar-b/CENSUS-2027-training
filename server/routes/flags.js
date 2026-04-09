const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { submitFlag, getUserFlags } = require('../services/flagService');

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

// POST /api/flags
// Body: { questionId, category, note }
router.post('/', authenticate, handle((req) => {
  const { questionId, category, note } = req.body;
  const allowed = ['wrong_answer', 'unclear', 'translation', 'other'];
  if (!questionId || !allowed.includes(category)) {
    throw Object.assign(new Error('Invalid flag data'), { status: 400 });
  }
  return submitFlag({ userId: req.user.sub, questionId, category, note });
}));

// GET /api/flags/mine
router.get('/mine', authenticate, handle((req) => {
  return getUserFlags(req.user.sub);
}));

module.exports = router;
