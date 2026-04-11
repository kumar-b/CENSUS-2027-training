const path = require('path');
const fs = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH = path.join(__dirname, '../tmp', `auth-test-${Date.now()}.db`);
process.env.JWT_SECRET = 'test-secret-access';
process.env.JWT_REFRESH_SECRET = 'test-secret-refresh';
process.env.QA_DIR = path.join(__dirname, '../tmp/no-qa');

const { register, login, refresh } = require('../services/authService');
const { getDb, closeDb } = require('../db/database');

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

const user = {
  mobile: '9876543210',
  password: 'Password123',
  name: 'Test User',
  functionary_type: 'Enumerator',
  state: 'Chhattisgarh',
  district: 'Raipur',
};

test('register creates a new user', () => {
  const result = register(user);
  expect(result.id).toBeDefined();
  expect(result.mobile).toBe(user.mobile);
  // Approve the test user so login tests can proceed
  getDb().prepare("UPDATE users SET status='approved' WHERE mobile=?").run(user.mobile);
});

test('register rejects duplicate mobile', () => {
  expect(() => register(user)).toThrow('Mobile already registered');
});

test('register rejects invalid functionary type', () => {
  expect(() => register({ ...user, mobile: '1111111111', functionary_type: 'Hacker' })).toThrow('Invalid functionary type');
});

test('login returns tokens and user for valid credentials', () => {
  const result = login({ mobile: user.mobile, password: user.password });
  expect(result.tokens.accessToken).toBeDefined();
  expect(result.tokens.refreshToken).toBeDefined();
  expect(result.user.password_hash).toBeUndefined();
});

test('login rejects wrong password', () => {
  expect(() => login({ mobile: user.mobile, password: 'wrong' })).toThrow('Invalid credentials');
});

test('refresh issues new tokens from valid refresh token', () => {
  const { tokens } = login({ mobile: user.mobile, password: user.password });
  const result = refresh(tokens.refreshToken);
  expect(result.tokens.accessToken).toBeDefined();
});

test('refresh rejects invalid token', () => {
  expect(() => refresh('bad-token')).toThrow('Invalid refresh token');
});
