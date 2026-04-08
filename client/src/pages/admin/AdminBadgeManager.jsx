import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

export default function AdminBadgeManager() {
  const { t } = useTranslation();
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    api.get('/admin/badges').then(({ data }) => setBadges(data)).catch(() => {});
  }, []);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← {t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('badgeManager')}</h2>
      </div>

      <div className="space-y-2">
        {badges.map((b) => (
          <div key={b.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 shadow-sm">
            <span className="text-3xl">{b.icon}</span>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{b.name_en}</p>
              <p className="text-xs text-gray-400">{b.description_en}</p>
              <p className="text-xs text-gray-300 mt-0.5 capitalize">{b.criteria_type} ≥ {b.criteria_value}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-indigo-600 text-lg">{b.earned_count}</p>
              <p className="text-xs text-gray-400">{t('earnedCount')}</p>
            </div>
          </div>
        ))}
        {badges.length === 0 && (
          <p className="text-center text-gray-400 py-8">{t('loading')}</p>
        )}
      </div>
    </div>
  );
}
