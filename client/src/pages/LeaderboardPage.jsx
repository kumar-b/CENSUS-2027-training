import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import api from '../api/client';

function LeaderboardTable({ data, userRank, userId }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      {data.map((row) => {
        const isMe = row.id === userId;
        return (
          <div
            key={row.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${isMe ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-gray-100'}`}
          >
            <span className={`w-8 text-center font-bold text-lg ${row.rank === 1 ? 'text-yellow-500' : row.rank === 2 ? 'text-gray-400' : row.rank === 3 ? 'text-amber-600' : 'text-gray-400'}`}>
              {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{row.name} {isMe && <span className="text-xs text-indigo-500">(You)</span>}</p>
              <p className="text-xs text-gray-400">{row.functionary_type}</p>
            </div>
            <span className="font-bold text-indigo-600">{row.points}</span>
          </div>
        );
      })}

      {userRank && !data.find((r) => r.id === userId) && (
        <div className="flex items-center gap-3 rounded-xl px-4 py-3 bg-indigo-50 border border-indigo-200 mt-2">
          <span className="w-8 text-center font-bold text-gray-500">#{userRank.rank}</span>
          <div className="flex-1">
            <p className="font-semibold text-gray-800">You</p>
          </div>
          <span className="font-bold text-indigo-600">{userRank.points}</span>
        </div>
      )}

      {(!data || data.length === 0) && (
        <p className="text-center text-gray-400 py-8">{t('noRankYet')}</p>
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
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{t('leaderboard')}</h2>

      {/* Tabs */}
      <div className="flex bg-gray-100 rounded-xl p-1">
        {['daily', 'overall'].map((t_) => (
          <button
            key={t_}
            onClick={() => setTab(t_)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t_ ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}
          >
            {t(t_)}
          </button>
        ))}
      </div>

      {!current ? (
        <p className="text-center text-gray-400 py-8">{t('loading')}</p>
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
