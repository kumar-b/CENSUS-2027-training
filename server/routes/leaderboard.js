const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const { getDailyLeaderboard, getOverallLeaderboard } = require('../services/leaderboardService');

function handle(fn) {
  return (req, res) => {
    try {
      res.json(fn(req));
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// GET /api/leaderboard/daily
router.get('/daily', authenticate, handle((req) => getDailyLeaderboard(req.user.sub)));

// GET /api/leaderboard/overall
router.get('/overall', authenticate, handle((req) => getOverallLeaderboard(req.user.sub)));

module.exports = router;
