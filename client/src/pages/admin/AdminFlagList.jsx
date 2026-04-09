import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

const TABS = ['pending', 'approved', 'dismissed', 'resolved'];

const STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-600',
  approved: 'bg-blue-100 text-blue-700',
  dismissed: 'bg-red-100 text-red-600',
  resolved: 'bg-green-100 text-green-700',
};

const CATEGORY_LABELS = {
  wrong_answer: 'Wrong answer',
  unclear: 'Unclear',
  translation: 'Translation error',
  other: 'Other',
};

export default function AdminFlagList() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('pending');
  const [flags, setFlags] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  const fetchFlags = async (status) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/admin/flags?status=${status}`);
      setFlags(data);
    } catch {}
    setLoading(false);
  };

  const fetchCounts = async () => {
    try {
      const results = await Promise.all(
        TABS.map(s => api.get(`/admin/flags?status=${s}`).then(r => [s, r.data.length]))
      );
      setCounts(Object.fromEntries(results));
    } catch {}
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  useEffect(() => {
    fetchFlags(activeTab);
  }, [activeTab]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← Admin</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('flagManager')}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${activeTab === tab ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab}
            {counts[tab] > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${tab === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-600'}`}>
                {counts[tab]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-10 text-gray-400">{t('loading')}</div>
      ) : flags.length === 0 ? (
        <p className="text-gray-400 text-sm text-center py-10">No {activeTab} flags</p>
      ) : (
        <div className="space-y-2">
          {flags.map((f) => (
            <Link
              key={f.id}
              to={`/admin/flags/${f.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-700 flex-1 leading-snug">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_STYLES[f.status]}`}>
                  {f.status}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                  {CATEGORY_LABELS[f.category] || f.category}
                </span>
                <span className="text-xs text-gray-500">{f.reporter_name}</span>
                <span className="text-xs text-gray-400">{new Date(f.created_at).toLocaleDateString('en-IN')}</span>
              </div>
              {f.note && (
                <p className="text-xs text-gray-400 mt-1 italic">"{f.note}"</p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
