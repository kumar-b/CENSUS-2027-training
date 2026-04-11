import { useEffect, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
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

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
];

const STATUS_STYLE = {
  pending:  { bg: 'bg-orange-100', text: 'text-orange-700' },
  approved: { bg: 'bg-green-100',  text: 'text-green-700' },
  rejected: { bg: 'bg-red-100',    text: 'text-red-600' },
};

export default function AdminUserList() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ users: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);

  const statusFilter = searchParams.get('status') || '';
  const debouncedSearch = useDebounce(search, 300);

  const fetchUsers = useCallback(async (q, p, status) => {
    setLoading(true);
    try {
      const params = { page: p, limit: 50 };
      if (q) params.q = q;
      if (status) params.status = status;
      const { data } = await api.get('/admin/users', { params });
      setResult(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchUsers(debouncedSearch, page, statusFilter);
  }, [debouncedSearch, page, statusFilter, fetchUsers]);

  const setStatus = (key) => {
    setSearchParams(key ? { status: key } : {});
  };

  const updateUserStatus = async (userId, status, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await api.patch(`/admin/users/${userId}/status`, { status });
      setResult((prev) => ({
        ...prev,
        users: prev.users.map((u) => u.id === userId ? { ...u, status } : u),
      }));
    } catch {}
  };

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← {t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800 flex-1">{t('users')}</h2>
        <span className="text-xs text-gray-400">{result.total} total</span>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5">
        {STATUS_TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
              statusFilter === key
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {label}
          </button>
        ))}
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
        {!loading && result.users.map((u) => {
          const st = STATUS_STYLE[u.status] || {};
          return (
            <Link
              key={u.id}
              to={`/admin/users/${u.id}`}
              className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-indigo-200 transition-colors shadow-sm"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                    {u.name}
                    {u.role === 'admin' && (
                      <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">Admin</span>
                    )}
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${st.bg} ${st.text}`}>
                      {u.status}
                    </span>
                  </p>
                  <p className="text-xs text-gray-400">{u.mobile} · {u.functionary_type}</p>
                  <p className="text-xs text-gray-400">{u.district}, {u.state}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-indigo-600">{u.total_points}</p>
                  <p className="text-xs text-gray-400">pts</p>
                  {u.status === 'pending' && (
                    <div className="flex gap-1 mt-1.5">
                      <button
                        onClick={(e) => updateUserStatus(u.id, 'approved', e)}
                        className="px-2 py-1 text-xs font-semibold bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => updateUserStatus(u.id, 'rejected', e)}
                        className="px-2 py-1 text-xs font-semibold bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
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
