import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/client';

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-red-100 text-red-600',
  resolved: 'bg-green-100 text-green-700',
};

const CATEGORY_LABELS = {
  wrong_answer: 'wrongAnswer',
  unclear: 'questionUnclear',
  translation: 'translationError',
  other: 'otherIssue',
};

export default function MyFlagsPage() {
  const { t } = useTranslation();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/flags/mine')
      .then(({ data }) => setFlags(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-gray-400">{t('loading')}</div>;

  return (
    <div className="px-4 py-6 space-y-4">
      <h2 className="text-xl font-bold text-gray-800">{t('myFlags')}</h2>

      {flags.length === 0 ? (
        <p className="text-gray-400 text-sm">{t('noFlagsYet')}</p>
      ) : (
        <div className="space-y-3">
          {flags.map((f) => (
            <div key={f.id} className="bg-white rounded-2xl border border-gray-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 flex-1 leading-snug">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[f.status] || STATUS_STYLES.pending}`}>
                  {t(`flag${f.status.charAt(0).toUpperCase() + f.status.slice(1)}`)}
                </span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {t(CATEGORY_LABELS[f.category] || 'otherIssue')}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(f.created_at).toLocaleDateString('en-IN')}
                </span>
              </div>

              {f.status === 'resolved' && (
                <p className="text-xs font-semibold text-green-600">{t('pointsAwarded')}</p>
              )}

              {f.admin_note && f.status !== 'pending' && (
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500"><span className="font-medium">{t('adminNote')}:</span> {f.admin_note}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
