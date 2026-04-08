import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';

const FUNCTIONARY_TYPES = [
  'Enumerator',
  'Supervisor',
  'Charge Officer',
  'Field Trainer',
  'Census Staff General',
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    name: '', mobile: '', password: '',
    functionary_type: '', state: 'CG', district: 'Raipur',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{10}$/.test(form.mobile)) { setError(t('invalidMobile')); return; }
    if (form.password.length < 6) { setError(t('passwordTooShort')); return; }
    if (!form.functionary_type) { setError(t('fieldRequired')); return; }
    setBusy(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white px-4 py-8">
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-indigo-700 text-center mb-1">जनगणना 2027</h1>
        <p className="text-center text-gray-500 mb-6 text-sm">Census Training Platform</p>

        <form onSubmit={submit} className="bg-white rounded-2xl shadow-md p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">{t('register')}</h2>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {[
            { key: 'name', label: t('name'), type: 'text' },
            { key: 'mobile', label: t('mobile'), type: 'tel', maxLength: 10 },
            { key: 'password', label: t('password'), type: 'password' },
          ].map(({ key, label, type, maxLength }) => (
            <div key={key}>
              <label className="block text-sm text-gray-600 mb-1">{label}</label>
              <input
                type={type} required maxLength={maxLength}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="block text-sm text-gray-600 mb-1">{t('functionary_type')}</label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.functionary_type}
              onChange={(e) => set('functionary_type', e.target.value)}
            >
              <option value="">—</option>
              {FUNCTIONARY_TYPES.map((ft) => (
                <option key={ft} value={ft}>{t(`functionary.${ft}`)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('state')}</label>
              <input
                type="text" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('district')}</label>
              <input
                type="text" required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit" disabled={busy}
            className="w-full bg-indigo-600 text-white rounded-lg py-2.5 font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors"
          >
            {busy ? t('loading') : t('register')}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          {t('haveAccount')}{' '}
          <Link to="/login" className="text-indigo-600 font-medium hover:underline">{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}
