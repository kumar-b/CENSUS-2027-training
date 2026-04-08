const { getDb } = require('../db/database');

function awardBadges(userId) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(userId);
  if (!user) return [];

  const allBadges = db.prepare('SELECT * FROM badges').all();
  const alreadyEarned = new Set(
    db.prepare('SELECT badge_id FROM user_badges WHERE user_id=?').all(userId).map(r => r.badge_id)
  );

  const newBadges = [];

  for (const badge of allBadges) {
    if (alreadyEarned.has(badge.id)) continue;

    let earned = false;

    if (badge.criteria_type === 'quizzes_completed') {
      const count = db.prepare("SELECT COUNT(*) as c FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).c;
      earned = count >= badge.criteria_value;

    } else if (badge.criteria_type === 'streak') {
      const max = db.prepare("SELECT MAX(streak_max) as m FROM quiz_sessions WHERE user_id=? AND completed=1").get(userId).m || 0;
      earned = max >= badge.criteria_value;

    } else if (badge.criteria_type === 'daily_streak') {
      const days = db.prepare(
        "SELECT date(started_at) as d FROM quiz_sessions WHERE user_id=? AND mode='daily' AND completed=1 ORDER BY started_at DESC"
      ).all(userId).map(r => r.d);
      let streak = 0;
      let expected = new Date();
      for (const d of days) {
        const day = new Date(d);
        if (day.toISOString().slice(0, 10) === expected.toISOString().slice(0, 10)) {
          streak++;
          expected.setDate(expected.getDate() - 1);
        } else break;
      }
      earned = streak >= badge.criteria_value;

    } else if (badge.criteria_type === 'perfect_timed') {
      const count = db.prepare(
        "SELECT COUNT(*) as c FROM quiz_sessions WHERE user_id=? AND mode='timed' AND completed=1 AND score=max_score AND max_score > 0"
      ).get(userId).c;
      earned = count >= badge.criteria_value;

    } else if (badge.criteria_type === 'perfect_chapter') {
      // Count distinct chapters where the user scored 100% in practice mode
      const perfectChapters = db.prepare(
        "SELECT COUNT(DISTINCT chapter) as c FROM quiz_sessions WHERE user_id=? AND mode='practice' AND completed=1 AND score=max_score AND max_score > 0"
      ).get(userId).c;
      earned = perfectChapters >= badge.criteria_value;

    } else if (badge.criteria_type === 'chapters_completed') {
      const completedChapters = db.prepare(
        "SELECT COUNT(DISTINCT chapter) as c FROM quiz_sessions WHERE user_id=? AND mode='practice' AND completed=1"
      ).get(userId).c;
      earned = completedChapters >= badge.criteria_value;

    } else if (badge.criteria_type === 'points') {
      earned = user.total_points >= badge.criteria_value;

    } else if (badge.criteria_type === 'daily_rank_1') {
      const today = new Date().toISOString().slice(0, 10);
      const top = db.prepare("SELECT user_id FROM daily_scores WHERE date=? ORDER BY points DESC LIMIT 1").get(today);
      earned = top?.user_id === userId;

    } else if (badge.criteria_type === 'total_correct') {
      const total = db.prepare(
        "SELECT COUNT(*) as c FROM quiz_answers WHERE session_id IN (SELECT id FROM quiz_sessions WHERE user_id=?) AND is_correct=1"
      ).get(userId).c;
      earned = total >= badge.criteria_value;

    } else if (badge.criteria_type === 'all_modes') {
      const modes = db.prepare(
        "SELECT DISTINCT mode FROM quiz_sessions WHERE user_id=? AND completed=1"
      ).all(userId).map(r => r.mode);
      earned = ['daily', 'timed', 'practice'].every(m => modes.includes(m));
    }

    if (earned) {
      try {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(userId, badge.id);
        newBadges.push(badge);
      } catch {}
    }
  }

  return newBadges;
}

module.exports = { awardBadges };
