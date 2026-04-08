import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

const BADGE_EMOJI = { '🎯': true };

export default function HomePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dailyDone, setDailyDone] = useState(false);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    api.get('/quiz/daily-status').then(({ data }) => setDailyDone(data.completed)).catch(() => {});
    api.get('/user/me').then(({ data }) => setBadges(data.badges.slice(0, 3))).catch(() => {});
  }, []);

  const cards = [
    {
      label: t('dailyQuiz'),
      desc: dailyDone ? t('dailyQuizDone') : '10 random questions · 60s each',
      color: 'bg-amber-50 border-amber-200',
      icon: '🌟',
      onClick: () => navigate('/quiz/daily'),
      disabled: dailyDone,
    },
    {
      label: t('timedQuiz'),
      desc: '15 questions · 15 min · by chapter',
      color: 'bg-blue-50 border-blue-200',
      icon: '⏱',
      onClick: () => navigate('/quiz/timed'),
    },
    {
      label: t('practice'),
      desc: 'All questions · no timer · resumable',
      color: 'bg-green-50 border-green-200',
      icon: '📖',
      onClick: () => navigate('/quiz/practice'),
    },
  ];

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{t('welcome')},</p>
          <h2 className="text-xl font-bold text-gray-800">{user?.name}</h2>
          <p className="text-indigo-600 font-semibold">{user?.total_points ?? 0} {t('totalPoints')}</p>
        </div>
        <button
          onClick={logout}
          className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5"
        >
          {t('logout')}
        </button>
      </div>

      {/* Quiz cards */}
      <div className="space-y-3">
        {cards.map((c) => (
          <button
            key={c.label}
            onClick={c.onClick}
            disabled={c.disabled}
            className={`w-full text-left rounded-2xl border p-4 transition-all ${c.color} ${c.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md active:scale-98'}`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">{c.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{c.label}</p>
                <p className="text-sm text-gray-500">{c.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Recent badges */}
      {badges.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">{t('badges')}</h3>
          <div className="flex gap-2 flex-wrap">
            {badges.map((b) => (
              <div key={b.id} className="bg-white rounded-xl border border-gray-200 px-3 py-2 flex items-center gap-2 shadow-sm">
                <span className="text-xl">{b.icon}</span>
                <span className="text-sm font-medium text-gray-700">{b.name_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
