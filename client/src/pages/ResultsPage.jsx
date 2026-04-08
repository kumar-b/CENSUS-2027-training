import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

function BadgeCard({ badge }) {
  return (
    <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
      <span className="text-3xl">{badge.icon}</span>
      <div>
        <p className="font-semibold text-gray-800 text-sm">{badge.name_en}</p>
        <p className="text-xs text-gray-500">{badge.description_en}</p>
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const navigate = useNavigate();
  const result = state?.result;

  if (!result) {
    navigate('/');
    return null;
  }

  const { totalPoints, correctCount, totalQuestions, streakMax, newBadges = [] } = result;
  const pct = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="text-center">
        <div className="text-5xl mb-2">{pct >= 80 ? '🏆' : pct >= 50 ? '🎯' : '📚'}</div>
        <h2 className="text-2xl font-bold text-gray-800">{t('quizComplete')}</h2>
      </div>

      {/* Score card */}
      <div className="bg-indigo-50 rounded-2xl p-5 grid grid-cols-2 gap-4 text-center">
        <div>
          <p className="text-3xl font-bold text-indigo-600">{totalPoints}</p>
          <p className="text-xs text-gray-500">{t('yourScore')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-green-600">{correctCount}/{totalQuestions}</p>
          <p className="text-xs text-gray-500">{t('correctAnswers')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-orange-500">{streakMax}</p>
          <p className="text-xs text-gray-500">{t('maxStreak')}</p>
        </div>
        <div>
          <p className="text-3xl font-bold text-gray-700">{pct}%</p>
          <p className="text-xs text-gray-500">Accuracy</p>
        </div>
      </div>

      {/* New badges */}
      {newBadges.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">🎉 {t('newBadges')}</h3>
          {newBadges.map((b) => <BadgeCard key={b.id} badge={b} />)}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        <button
          onClick={() => navigate('/leaderboard')}
          className="w-full bg-indigo-600 text-white rounded-xl py-3 font-semibold hover:bg-indigo-700 transition-colors"
        >
          {t('viewLeaderboard')}
        </button>
        <button
          onClick={() => navigate('/')}
          className="w-full bg-white border border-gray-200 text-gray-700 rounded-xl py-3 font-semibold hover:bg-gray-50 transition-colors"
        >
          {t('goHome')}
        </button>
      </div>
    </div>
  );
}
