const { getDb } = require('../db/database');

function getDailyLeaderboard(userId) {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);
  const top10 = db.prepare(`
    SELECT u.id, u.name, u.functionary_type, ds.points,
           RANK() OVER (ORDER BY ds.points DESC) as rank
    FROM daily_scores ds
    JOIN users u ON u.id = ds.user_id
    WHERE ds.date = ?
    ORDER BY ds.points DESC
    LIMIT 10
  `).all(today);

  const userRow = db.prepare(`
    SELECT RANK() OVER (ORDER BY ds.points DESC) as rank, ds.points
    FROM daily_scores ds WHERE ds.user_id = ? AND ds.date = ?
  `).get(userId, today);

  return { leaderboard: top10, userRank: userRow || null };
}

function getOverallLeaderboard(userId) {
  const db = getDb();
  const top10 = db.prepare(`
    SELECT id, name, functionary_type, total_points as points,
           RANK() OVER (ORDER BY total_points DESC) as rank
    FROM users
    ORDER BY total_points DESC
    LIMIT 10
  `).all();

  const userRow = db.prepare(`
    SELECT RANK() OVER (ORDER BY total_points DESC) as rank, total_points as points
    FROM users WHERE id = ?
  `).get(userId);

  return { leaderboard: top10, userRank: userRow || null };
}

module.exports = { getDailyLeaderboard, getOverallLeaderboard };
