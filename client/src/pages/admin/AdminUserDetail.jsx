import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

export default function AdminUserDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const currentUser = useAuthStore((s) => s.user);
  const [data, setData] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    api.get(`/admin/users/${id}`).then(({ data: d }) => setData(d)).catch(() => {});
  }, [id]);

  const resetPassword = async (e) => {
    e.preventDefault();
    setPwError(''); setPwMsg('');
    try {
      await api.patch(`/admin/users/${id}/reset-password`, { newPassword: newPw });
      setPwMsg(t('passwordReset'));
      setNewPw('');
    } catch (err) {
      setPwError(err.response?.data?.error || t('error'));
    }
  };

  const toggleRole = async () => {
    const newRole = data.user.role === 'admin' ? 'user' : 'admin';
    try {
      await api.patch(`/admin/users/${id}/role`, { role: newRole });
      setData((d) => ({ ...d, user: { ...d.user, role: newRole } }));
    } catch {}
  };

  if (!data) return <div className="p-6 text-center text-gray-400">{t('loading')}</div>;

  const { user, badges, sessions, flags: userFlags } = data;

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/users" className="text-indigo-600 text-sm">← {t('back')}</Link>
        <h2 className="text-xl font-bold text-gray-800">{t('userDetail')}</h2>
      </div>

      {/* User info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-2">
        <p className="font-bold text-gray-800 text-lg">{user.name}</p>
        <p className="text-sm text-gray-500">{user.mobile} · {user.functionary_type}</p>
        <p className="text-sm text-gray-400">{user.district}, {user.state}</p>
        <div className="flex gap-4 pt-2">
          <div><p className="text-2xl font-bold text-indigo-600">{user.total_points}</p><p className="text-xs text-gray-400">Total Points</p></div>
          <div><p className="text-2xl font-bold text-green-600">{badges.length}</p><p className="text-xs text-gray-400">Badges</p></div>
          <div><p className="text-2xl font-bold text-gray-700">{sessions.length}</p><p className="text-xs text-gray-400">Sessions</p></div>
        </div>
      </div>

      {/* Role management (can't demote yourself) */}
      {currentUser?.id !== user.id && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-sm font-semibold text-gray-600 mb-2">Role: <span className="text-indigo-600">{user.role}</span></p>
          <button
            onClick={toggleRole}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${user.role === 'admin' ? 'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100' : 'bg-indigo-50 border border-indigo-200 text-indigo-600 hover:bg-indigo-100'}`}
          >
            {user.role === 'admin' ? t('removeAdmin') : t('makeAdmin')}
          </button>
        </div>
      )}

      {/* Reset password */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <p className="text-sm font-semibold text-gray-600 mb-3">{t('resetPassword')}</p>
        <form onSubmit={resetPassword} className="space-y-2">
          <input
            type="text"
            placeholder={t('newPassword')}
            minLength={6} required
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
          />
          {pwMsg && <p className="text-green-600 text-xs">{pwMsg}</p>}
          {pwError && <p className="text-red-500 text-xs">{pwError}</p>}
          <button type="submit" className="w-full bg-gray-800 text-white rounded-xl py-2.5 text-sm font-medium hover:bg-gray-900 transition-colors">
            {t('confirm')}
          </button>
        </form>
      </div>

      {/* Badges */}
      {badges.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">{t('badges')}</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((b) => (
              <div key={b.id} className="flex items-center gap-1.5 bg-yellow-50 border border-yellow-100 rounded-xl px-3 py-1.5">
                <span>{b.icon}</span>
                <span className="text-xs font-medium text-gray-700">{b.name_en}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sessions */}
      {sessions.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">Sessions</p>
          <div className="space-y-1.5">
            {sessions.slice(0, 20).map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                <div>
                  <span className="text-xs font-medium text-gray-600 capitalize">{s.mode}</span>
                  {s.chapter && <span className="text-xs text-gray-400 ml-1">Ch {s.chapter}</span>}
                  <p className="text-xs text-gray-300">{new Date(s.started_at).toLocaleDateString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-indigo-600">{s.score}</p>
                  <p className="text-xs text-gray-400">/{s.max_score}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* Flags submitted */}
      {userFlags?.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-500 mb-2">{t('flagsSubmitted')}</p>
          <div className="space-y-1.5">
            {userFlags.map((f) => (
              <div key={f.id} className="flex items-center justify-between bg-white border border-gray-100 rounded-xl px-4 py-2.5">
                <p className="text-xs text-gray-600 flex-1 truncate">{f.question_excerpt}…</p>
                <span className={`text-xs font-semibold ml-2 px-2 py-0.5 rounded-full flex-shrink-0 ${
                  f.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  f.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                  f.status === 'dismissed' ? 'bg-red-100 text-red-600' :
                  'bg-gray-100 text-gray-600'
                }`}>{f.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
