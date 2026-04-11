import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';
import { TrophyIcon, StarIcon, MedalIcon } from '../components/Icons';

const AVATAR_COLORS = ['#C1440E', '#D4843A', '#2D6A4F', '#9A3409', '#AA6520'];

function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function LeaderboardTable({ data, userRank, userId }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2 px-4">
      {data.map((row, idx) => {
        const isMe = row.id === userId;
        const medalColor = row.rank === 1 ? '#FFD700' : row.rank === 2 ? '#9E9E9E' : row.rank === 3 ? '#CD7F32' : null;
        const avatarColor = AVATAR_COLORS[idx % AVATAR_COLORS.length];
        return (
          <div
            key={row.id}
            className="flex items-center gap-3 rounded-xl px-3 py-3"
            style={{
              background: isMe ? 'var(--tc-primary-light)' : 'var(--tc-card)',
              border: isMe ? '2px solid var(--tc-primary)' : '2px solid var(--tc-border)',
              boxShadow: isMe ? '0 3px 0 var(--tc-primary-dark)' : '0 3px 0 var(--tc-border)',
            }}
          >
            {/* Rank */}
            <div className="w-8 flex items-center justify-center flex-shrink-0">
              {medalColor
                ? <MedalIcon size={20} color={medalColor} sw={2} />
                : <span className="font-black text-sm" style={{ color: 'var(--tc-text-sec)' }}>#{row.rank}</span>
              }
            </div>
            {/* Avatar */}
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0" style={{ background: avatarColor, color: '#fff' }}>
              {initials(row.name)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--tc-text)' }}>
                {row.name} {isMe && <span className="text-xs font-black" style={{ color: 'var(--tc-primary)' }}>(You)</span>}
              </p>
              <p className="text-xs font-semibold" style={{ color: 'var(--tc-text-muted)' }}>{row.functionary_type}</p>
            </div>
            <span className="font-black text-sm flex items-center gap-1" style={{ color: 'var(--tc-xp-dark)' }}><StarIcon size={14} color="var(--tc-xp-dark)" sw={2.5} /> {row.points}</span>
          </div>
        );
      })}

      {userRank && !data.find((r) => r.id === userId) && (
        <div className="flex items-center gap-3 rounded-xl px-3 py-3 mt-2"
          style={{ background: 'var(--tc-primary-light)', border: '2px solid var(--tc-primary)', boxShadow: '0 3px 0 var(--tc-primary-dark)' }}>
          <div className="w-8 text-center font-black text-sm" style={{ color: 'var(--tc-text-sec)' }}>#{userRank.rank}</div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs" style={{ background: 'var(--tc-primary)', color: '#fff' }}>Me</div>
          <div className="flex-1">
            <p className="font-bold text-sm" style={{ color: 'var(--tc-text)' }}>You</p>
          </div>
          <span className="font-black text-sm flex items-center gap-1" style={{ color: 'var(--tc-xp-dark)' }}><StarIcon size={14} color="var(--tc-xp-dark)" sw={2.5} /> {userRank.points}</span>
        </div>
      )}

      {(!data || data.length === 0) && (
        <p className="text-center py-8 font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('noRankYet')}</p>
      )}
    </div>
  );
}

export default function LeaderboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [tab, setTab] = useState('daily');
  const [daily, setDaily] = useState(null);
  const [overall, setOverall] = useState(null);

  useEffect(() => {
    api.get('/leaderboard/daily').then(({ data }) => setDaily(data)).catch(() => {});
    api.get('/leaderboard/overall').then(({ data }) => setOverall(data)).catch(() => {});
  }, []);

  const current = tab === 'daily' ? daily : overall;

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="px-4 pt-5 pb-4 text-center" style={{ background: 'linear-gradient(135deg, var(--tc-primary) 0%, var(--tc-orange) 100%)' }}>
        <div className="flex justify-center mb-1"><TrophyIcon size={32} color="#fff" sw={1.5} /></div>
        <h2 className="text-xl font-black" style={{ color: '#fff' }}>{t('leaderboard')}</h2>
        <p className="text-xs font-bold mt-1" style={{ color: 'rgba(255,255,255,0.75)' }}>Raipur District Rankings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4 mb-4">
        {['daily', 'overall'].map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className="flex-1 py-2.5 rounded-full text-sm font-black transition-all"
            style={tab === t_
              ? { background: 'var(--tc-primary)', color: '#fff', border: '2px solid var(--tc-primary-dark)', boxShadow: '0 3px 0 var(--tc-primary-dark)' }
              : { background: 'var(--tc-card)', color: 'var(--tc-text-sec)', border: '2px solid var(--tc-border)' }
            }
          >
            {t(t_)}
          </button>
        ))}
      </div>

      {!current ? (
        <p className="text-center py-8 font-bold" style={{ color: 'var(--tc-text-muted)' }}>{t('loading')}</p>
      ) : (
        <LeaderboardTable
          data={current.leaderboard}
          userRank={current.userRank}
          userId={user?.id}
        />
      )}
    </div>
  );
}
