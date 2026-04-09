import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [form, setForm] = useState({ mobile: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const ADMIN_MOBILES = new Set(['9873647919', '9713156166', '9669577888']);
  const isAdmin = useMemo(() => ADMIN_MOBILES.has(form.mobile), [form.mobile]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(form.mobile)) { setError(t('invalidMobile')); return; }
    setBusy(true);
    try {
      await login(form.mobile, form.password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-indigo-700 text-center mb-1">जनगणना 2027</h1>
        <p className="text-center text-gray-500 mb-8 text-sm">Census Training Platform</p>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">{t('login')}</h2>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('mobile')}</label>
            <input
              type="tel" maxLength={10} required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-1">
              {isAdmin ? 'Admin Passphrase' : t('password')}
            </label>
            <input
              type="password" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="submit" disabled={busy}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {busy ? t('loading') : t('login')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('noAccount')}{' '}
          <Link to="/register" className="text-indigo-600 font-medium hover:underline">{t('register')}</Link>
        </p>
      </div>
    </div>
  );
}
