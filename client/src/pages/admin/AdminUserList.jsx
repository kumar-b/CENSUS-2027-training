import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function AdminUserList() {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const fetchUsers = useCallback(async (q, p) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/users', { params: { q, page: p, limit: 50 } });
      setResult(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  useEffect(() => {
    fetchUsers(debouncedSearch, page);
  }, [debouncedSearch, page, fetchUsers]);

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← {t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800 flex-1">{t('users')}</h2>
        <span className="text-xs text-gray-400">{result.total} total</span>
      </div>

      <input
        type="text"
        placeholder="Search name, mobile, type…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {loading && (
          <p className="text-center text-gray-400 py-4 text-sm">{t('loading')}</p>
        )}
        {!loading && result.users.map((u) => (
          <Link
            key={u.id}
            to={`/admin/users/${u.id}`}
            className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-indigo-200 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">
                  {u.name}
                  {u.role === 'admin' && (
                    <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-1">Admin</span>
                  )}
                </p>
                <p className="text-xs text-gray-400">{u.mobile} · {u.functionary_type}</p>
                <p className="text-xs text-gray-400">{u.district}, {u.state}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-indigo-600">{u.total_points}</p>
                <p className="text-xs text-gray-400">pts</p>
              </div>
            </div>
          </Link>
        ))}
        {!loading && result.users.length === 0 && (
          <p className="text-center text-gray-400 py-8">No users found</p>
        )}
      </div>

      {result.pages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-indigo-300 transition-colors"
          >
            ← Prev
          </button>
          <span className="text-xs text-gray-400">Page {page} of {result.pages}</span>
          <button
            disabled={page >= result.pages}
            onClick={() => setPage((p) => p + 1)}
            className="px-4 py-2 text-sm rounded-xl border border-gray-200 text-gray-600 disabled:opacity-40 hover:border-indigo-300 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
