import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

function StatCard({ label, value, color }) {
  return (
    <div className={`rounded-2xl p-5 text-center ${color}`}>
      <p className="text-3xl font-bold text-gray-800">{value ?? '—'}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(({ data }) => setStats(data)).catch(() => {});
  }, []);

  return (
    <div className="px-4 py-6 space-y-6">
      <h2 className="text-xl font-bold text-gray-800">{t('adminDashboard')}</h2>

      <div className="grid grid-cols-3 gap-3">
        <StatCard label={t('totalUsers')} value={stats?.totalUsers} color="bg-indigo-50" />
        <StatCard label={t('totalSessions')} value={stats?.totalSessions} color="bg-green-50" />
        <StatCard label={t('todayActive')} value={stats?.todayActive} color="bg-amber-50" />
        <StatCard label={t('badgesAwarded')} value={stats?.badgesAwarded} color="bg-purple-50" />
        <StatCard label={t('pendingFlags')} value={stats?.pendingFlags} color="bg-red-50" />
      </div>

      <div className="space-y-2">
        <Link
          to="/admin/users"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">👥 {t('users')}</p>
          <p className="text-sm text-gray-400">View all users, drill down, reset passwords</p>
        </Link>
        <Link
          to="/admin/badges"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">🏅 {t('badgeManager')}</p>
          <p className="text-sm text-gray-400">View all badges and award counts</p>
        </Link>
        <Link
          to="/admin/flags"
          className="block w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-left shadow-sm hover:border-indigo-300 transition-colors"
        >
          <p className="font-semibold text-gray-800">⚑ {t('flagManager')}</p>
          <p className="text-sm text-gray-400">Review user-reported question issues</p>
          {stats?.pendingFlags > 0 && (
            <span className="inline-block mt-1 bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">
              {stats.pendingFlags} {t('flagPending')}
            </span>
          )}
        </Link>
      </div>
    </div>
  );
}
