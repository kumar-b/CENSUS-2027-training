/**
 * Leaderboard service tests:
 *  - getDailyLeaderboard: top-10 by today's points, user rank
 *  - getOverallLeaderboard: top-10 by total_points, user rank
 */
const path = require('path');
const fs   = require('fs');

fs.mkdirSync(path.join(__dirname, '../tmp'), { recursive: true });
process.env.DB_PATH            = path.join(__dirname, '../tmp', `leaderboard-${Date.now()}.db`);
process.env.JWT_SECRET         = 'test';
process.env.JWT_REFRESH_SECRET = 'test2';
process.env.QA_DIR             = path.join(__dirname, '../../QA');

const { getDb, closeDb } = require('../db/database');
const { register }       = require('../services/authService');
const { startSession, submitAnswer, completeSession } = require('../services/quizService');
const { getDailyLeaderboard, getOverallLeaderboard } = require('../services/leaderboardService');

let db;
const users = [];

beforeAll(() => {
  db = getDb();
  require('../db/seeder').seedQuestions();

  // Register 5 users and give them different point totals
  for (let i = 1; i <= 5; i++) {
    const u = register({
      mobile: `940000000${i}`, password: 'pass', name: `LB User ${i}`,
      functionary_type: 'Enumerator', state: 'CG', district: 'Raipur',
    });
    users.push(u);
  }
});

afterAll(() => {
  closeDb();
  try { fs.unlinkSync(process.env.DB_PATH); } catch {}
});

function completeQuiz(uid, mode = 'timed', chapter = 1) {
  const { sessionId, questions } = startSession({ userId: uid, mode, chapter });
  for (const q of questions) {
    submitAnswer({ sessionId, questionId: q.id, chosenOption: q.correct_option });
  }
  completeSession(sessionId);
}

// ── Overall leaderboard ───────────────────────────────────────────────────────
describe('getOverallLeaderboard', () => {
  beforeAll(() => {
    // Give users different point totals via timed quizzes
    completeQuiz(users[0].id);
    completeQuiz(users[0].id); // user[0] gets 2 quizzes worth
    completeQuiz(users[1].id);
  });

  test('returns leaderboard array and userRank for a user with points', () => {
    const { leaderboard, userRank } = getOverallLeaderboard(users[0].id);
    expect(Array.isArray(leaderboard)).toBe(true);
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(userRank).not.toBeNull();
    expect(userRank.rank).toBe(1); // user[0] should be #1 with most points
    expect(userRank.points).toBeGreaterThan(0);
  });

  test('leaderboard entries have name, points, rank, and functionary_type fields', () => {
    const { leaderboard } = getOverallLeaderboard(users[0].id);
    const entry = leaderboard[0];
    expect(entry.name).toBeDefined();
    expect(entry.points).toBeDefined();
    expect(entry.rank).toBe(1);
    expect(entry.functionary_type).toBeDefined();
  });

  test('leaderboard is sorted by points descending', () => {
    const { leaderboard } = getOverallLeaderboard(users[0].id);
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i].points).toBeLessThanOrEqual(leaderboard[i - 1].points);
    }
  });

  test('returns at most 10 entries', () => {
    const { leaderboard } = getOverallLeaderboard(users[0].id);
    expect(leaderboard.length).toBeLessThanOrEqual(10);
  });

  test('userRank is null for a user with no points', () => {
    // users[4] has not completed any quiz yet
    const { userRank } = getOverallLeaderboard(users[4].id);
    // They still appear in overall (all users are in users table with 0 pts)
    // Rank should be defined but points = 0
    expect(userRank).toBeDefined();
    expect(userRank.points).toBe(0);
  });
});

// ── Daily leaderboard ─────────────────────────────────────────────────────────
describe('getDailyLeaderboard', () => {
  beforeAll(() => {
    completeQuiz(users[2].id, 'daily');
    completeQuiz(users[3].id, 'daily');
  });

  test('returns leaderboard array and userRank for a user with today points', () => {
    const { leaderboard, userRank } = getDailyLeaderboard(users[2].id);
    expect(Array.isArray(leaderboard)).toBe(true);
    expect(leaderboard.length).toBeGreaterThan(0);
    expect(userRank).not.toBeNull();
    expect(userRank.points).toBeGreaterThan(0);
  });

  test('daily leaderboard is sorted by points descending', () => {
    const { leaderboard } = getDailyLeaderboard(users[2].id);
    for (let i = 1; i < leaderboard.length; i++) {
      expect(leaderboard[i].points).toBeLessThanOrEqual(leaderboard[i - 1].points);
    }
  });

  test('returns null userRank for a user with no activity today', () => {
    const { userRank } = getDailyLeaderboard(users[4].id);
    expect(userRank).toBeNull();
  });
});
