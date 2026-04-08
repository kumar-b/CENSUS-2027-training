const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const FUNCTIONARY_TYPES = ['Enumerator', 'Supervisor', 'Charge Officer', 'Field Trainer', 'Census Staff General'];

function register({ mobile, password, name, functionary_type, state, district }) {
  if (!FUNCTIONARY_TYPES.includes(functionary_type)) {
    throw Object.assign(new Error('Invalid functionary type'), { status: 400 });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE mobile = ?').get(mobile);
  if (existing) throw Object.assign(new Error('Mobile already registered'), { status: 409 });

  const password_hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (mobile, password_hash, name, functionary_type, state, district)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(mobile, password_hash, name, functionary_type, state, district);

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const { accessToken, refreshToken } = issueTokens(user);
  return { accessToken, refreshToken, user: safeUser(user) };
}

function login({ mobile, password }) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  const { accessToken, refreshToken } = issueTokens(user);
  return { accessToken, refreshToken, user: safeUser(user) };
}

function issueTokens(user) {
  const payload = { sub: user.id, role: user.role };
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}

function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw Object.assign(new Error('Invalid refresh token'), { status: 401 });
  }
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub);
  if (!user) throw Object.assign(new Error('User not found'), { status: 401 });
  return issueTokens(user);
}

function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = { register, login, refresh, safeUser };
