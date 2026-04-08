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

router.post('/register', handle(({ mobile, password, name, functionary_type, state, district }) =>
  register({ mobile, password, name, functionary_type, state, district })
));

router.post('/login', handle(({ mobile, password }) =>
  login({ mobile, password })
));

router.post('/refresh', handle(({ refreshToken }) =>
  refresh(refreshToken)
));

module.exports = router;
