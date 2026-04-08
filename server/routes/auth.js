const express = require('express');
const router = express.Router();
const { register, login, refresh, issueTokens, safeUser } = require('../services/authService');
const { getDb } = require('../db/database');

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req.body);
      res.json(result);
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message });
    }
  };
}

// POST /api/auth/register — returns { accessToken, refreshToken, user }
router.post('/register', handle(({ mobile, password, name, functionary_type, state, district }) => {
  const registered = register({ mobile, password, name, functionary_type, state, district });
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(registered.id);
  const { accessToken, refreshToken } = issueTokens(user);
  return { accessToken, refreshToken, user: safeUser(user) };
}));

// POST /api/auth/login — returns { accessToken, refreshToken, user }
router.post('/login', handle(({ mobile, password }) => {
  const { tokens, user } = login({ mobile, password });
  return { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user };
}));

// POST /api/auth/refresh — returns { accessToken, refreshToken }
router.post('/refresh', handle(({ refreshToken }) => {
  const { tokens } = refresh(refreshToken);
  return tokens;
}));

module.exports = router;
