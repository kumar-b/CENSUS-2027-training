import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../api/client';

export default function AdminUserList() {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => setUsers(data)).catch(() => {});
  }, []);

  const filtered = users.filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.mobile.includes(search) ||
    u.functionary_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="px-4 py-6 space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/admin" className="text-indigo-600 text-sm">← {t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800 flex-1">{t('users')}</h2>
        <span className="text-xs text-gray-400">{users.length} total</span>
      </div>

      <input
        type="text"
        placeholder="Search name, mobile, type…"
        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="space-y-2">
        {filtered.map((u) => (
          <Link
            key={u.id}
            to={`/admin/users/${u.id}`}
            className="block bg-white rounded-xl border border-gray-100 px-4 py-3 hover:border-indigo-200 transition-colors shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-800">{u.name} {u.role === 'admin' && <span className="text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded ml-1">Admin</span>}</p>
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
        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-8">No users found</p>
        )}
      </div>
    </div>
  );
}
