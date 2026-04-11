const express = require('express');
const router = express.Router();
const { register, login, refresh } = require('../services/authService');

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

// POST /api/auth/register — returns { message } (user must be approved by admin before login)
router.post('/register', handle(({ mobile, password, name, functionary_type, state, district }) => {
  register({ mobile, password, name, functionary_type, state, district });
  return { message: 'Registration submitted. Please wait for admin approval.' };
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
