/**
 * Extra auth scenarios not covered by auth.test.js:
 *  - pending / rejected account blocking
 *  - admin-mobile guard on register
 *  - safeUser strips password_hash
 *  - issueTokens JWT payload shape
 */
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH            = path.join(__dirname, '../tmp', `auth-extra-${Date.now()}.db`);
process.env.JWT_SECRET         = 'test-access';
process.env.JWT_REFRESH_SECRET = 'test-refresh';
process.env.QA_DIR             = path.join(__dirname, '../tmp/no-qa');
process.env.ADMIN_SECRET       = 'admin-password';

const jwt = require('jsonwebtoken');
const { register, login, safeUser, issueTokens, ADMIN_MOBILES } = require('../services/authService');
const { getDb, closeDb } = require('../db/database');

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

const base = {
  mobile: '8000000001', password: 'Pass123', name: 'Extra Tester',
  functionary_type: 'Supervisor', state: 'CG', district: 'Raipur',
};

// ── Admin mobile guard ────────────────────────────────────────────────────────
test('register blocks admin mobile numbers', () => {
  const adminMobile = [...ADMIN_MOBILES][0];
  expect(() => register({ ...base, mobile: adminMobile }))
    .toThrow('Mobile already registered');
});

// ── Account status checks ─────────────────────────────────────────────────────
test('login throws 403 when account is pending approval', () => {
  register(base); // status defaults to 'pending'
  let err;
  try { login({ mobile: base.mobile, password: base.password }); }
  catch (e) { err = e; }
  expect(err).toBeDefined();
  expect(err.status).toBe(403);
  expect(err.message).toMatch(/pending/i);
});

test('login throws 403 when account is rejected', () => {
  getDb().prepare("UPDATE users SET status='rejected' WHERE mobile=?").run(base.mobile);
  let err;
  try { login({ mobile: base.mobile, password: base.password }); }
  catch (e) { err = e; }
  expect(err).toBeDefined();
  expect(err.status).toBe(403);
  expect(err.message).toMatch(/denied/i);
});

test('login throws 401 for unknown mobile', () => {
  let err;
  try { login({ mobile: '0000000000', password: 'whatever' }); }
  catch (e) { err = e; }
  expect(err.status).toBe(401);
});

// ── safeUser ─────────────────────────────────────────────────────────────────
test('safeUser strips password_hash from user object', () => {
  const raw = { id: 1, mobile: '9876543210', password_hash: 'secret', name: 'Alice', role: 'user' };
  const safe = safeUser(raw);
  expect(safe.password_hash).toBeUndefined();
  expect(safe.mobile).toBe('9876543210');
  expect(safe.name).toBe('Alice');
});

// ── issueTokens ───────────────────────────────────────────────────────────────
test('issueTokens returns a valid JWT with sub and role claims', () => {
  const fakeUser = { id: 42, role: 'user' };
  const { accessToken, refreshToken } = issueTokens(fakeUser);

  const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
  expect(decoded.sub).toBe(42);
  expect(decoded.role).toBe('user');

  const decodedR = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  expect(decodedR.sub).toBe(42);
});

test('issueTokens refresh token has a longer TTL than access token', () => {
  const fakeUser = { id: 99, role: 'admin' };
  const { accessToken, refreshToken } = issueTokens(fakeUser);
  const access  = jwt.decode(accessToken);
  const refresh = jwt.decode(refreshToken);
  expect(refresh.exp - refresh.iat).toBeGreaterThan(access.exp - access.iat);
});
