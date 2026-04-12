import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { StarIcon, ClockIcon, BookIcon, UsersIcon } from '../components/Icons';
import BadgeIcon from '../components/BadgeIcon';
import LevelProgressBar from '../components/LevelProgressBar';

const MODE_COLORS = {
  daily:     { top: '#C1440E', topDark: '#9A3409', bg: '#FAE0D3', border: '#C1440E' },
  timed:     { top: '#D4843A', topDark: '#AA6520', bg: '#FFF0E0', border: '#D4843A' },
  practice:  { top: '#2D6A4F', topDark: '#1B4332', bg: '#E8F5EE', border: '#2D6A4F' },
  challenge: { top: '#7C3AED', topDark: '#5B21B6', bg: '#EDE9FE', border: '#7C3AED' },
};

export default function HomePage() {
  const { t } = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [dailyDone, setDailyDone] = useState(false);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    api.get('/quiz/daily-status').then(({ data }) => setDailyDone(data.completed)).catch(() => {});
    api.get('/user/me').then(({ data }) => setBadges(data.badges.filter(b => b.earned).slice(0, 3))).catch(() => {});
  }, []);

  const cards = [
    {
      key: 'daily',
      label: t('dailyQuiz'),
      desc: dailyDone ? t('dailyQuizDone') : '10 random questions · 60s each',
      Icon: StarIcon,
      badge: dailyDone ? 'Done' : 'Daily',
      onClick: () => navigate('/quiz/daily'),
    },
    {
      key: 'timed',
      label: t('timedQuiz'),
      desc: '10 questions · 10 min · by chapter',
      Icon: ClockIcon,
      badge: '10 min',
      onClick: () => navigate('/quiz/timed'),
    },
    {
      key: 'practice',
      label: t('practice'),
      desc: 'All questions · no timer · resumable',
      Icon: BookIcon,
      badge: 'Anytime',
      onClick: () => navigate('/quiz/practice'),
    },
    {
      key: 'challenge',
      label: t('challengeFriend'),
      desc: t('challengeFriendDesc'),
      Icon: UsersIcon,
      badge: 'NEW',
      onClick: () => navigate('/challenge'),
    },
  ];

  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <div className="px-4 py-5 space-y-5 pb-4">

      {/* Greeting banner */}
      <div className="rounded-2xl p-4 flex flex-col gap-3"
        style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-orange) 100%)', boxShadow: '0 5px 0 var(--tc-primary-dark)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center font-black text-base flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '2.5px solid rgba(255,255,255,0.5)' }}>
              {initials}
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('welcome')}</p>
              <p className="font-black text-base" style={{ color: '#fff' }}>{user?.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-black text-2xl" style={{ color: '#fff' }}>{user?.total_points ?? 0}</p>
            <p className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>{t('totalPoints')}</p>
          </div>
        </div>
        <LevelProgressBar totalPoints={user?.total_points ?? 0} compact />
      </div>

      {/* Quiz mode cards */}
      <div>
        <p className="sec-label mb-3">Choose a Quiz Mode</p>
        <div className="space-y-3">
          {cards.map((c) => {
            const colors = MODE_COLORS[c.key];
            return (
              <button
                key={c.key}
                onClick={c.onClick}
                disabled={c.disabled}
                className="w-full text-left rounded-2xl overflow-hidden transition-all"
                style={{
                  background: 'var(--tc-card)',
                  border: `2.5px solid var(--tc-border)`,
                  boxShadow: `0 4px 0 var(--tc-border)`,
                  opacity: c.disabled ? 0.5 : 1,
                }}
              >
                <div className="flex items-center gap-3 px-4 py-3.5">
                  <span className="flex-shrink-0"><c.Icon size={24} color={MODE_COLORS[c.key].top} /></span>
                  <div className="flex-1">
                    <p className="font-black text-sm" style={{ color: 'var(--tc-text)' }}>{c.label}</p>
                    <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--tc-text-sec)' }}>{c.desc}</p>
                  </div>
                  <span className="text-xs font-black px-2.5 py-1 rounded-full"
                    style={{ background: colors.bg, color: colors.topDark, border: `2px solid ${colors.top}` }}>
                    {c.badge}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent badges */}
      {badges.length > 0 && (
        <div>
          <p className="sec-label mb-2">{t('badges')}</p>
          <div className="flex gap-2 flex-wrap">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 3px 0 var(--tc-border)' }}>
                <BadgeIcon icon={b.icon} size={22} color="var(--tc-primary)" />
                <span className="text-xs font-bold" style={{ color: 'var(--tc-text)' }}>{b.name_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="text-center pt-1">
        <button
          onClick={logout}
          className="text-xs font-bold px-4 py-2 rounded-xl"
          style={{ color: 'var(--tc-text-muted)', border: '2px solid var(--tc-border)', background: 'transparent' }}
        >
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
