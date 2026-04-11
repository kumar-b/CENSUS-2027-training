const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');

const FUNCTIONARY_TYPES = ['Enumerator', 'Supervisor', 'Charge Officer', 'Field Trainer', 'Census Staff General'];

const ADMIN_MOBILES = new Set(['9873647919', '9713156166', '9669577888']);

function register({ mobile, password, name, functionary_type, state, district }) {
  if (ADMIN_MOBILES.has(mobile)) {
    throw Object.assign(new Error('Mobile already registered'), { status: 409 });
  }
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

  return { id: result.lastInsertRowid, mobile, name, functionary_type, state, district };
}

function login({ mobile, password }) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE mobile = ?').get(mobile);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  let valid;
  if (ADMIN_MOBILES.has(mobile)) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) throw Object.assign(new Error('Admin login not configured'), { status: 500 });
    valid = password === secret;
  } else {
    valid = bcrypt.compareSync(password, user.password_hash);
  }
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  if (user.status === 'pending') {
    throw Object.assign(new Error('Account pending admin approval'), { status: 403 });
  }
  if (user.status === 'rejected') {
    throw Object.assign(new Error('Account access denied'), { status: 403 });
  }

  db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);

  return { tokens: issueTokens(user), user: safeUser(user) };
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
  return { tokens: issueTokens(user) };
}

function safeUser(user) {
  const { password_hash, ...rest } = user;
  return rest;
}

module.exports = { register, login, refresh, safeUser, issueTokens, ADMIN_MOBILES };
