import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';
import { BuildingIcon } from '../components/Icons';

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
      const serverMsg = err.response?.data?.error;
      if (err.response?.status === 403) {
        setError(serverMsg || 'Account pending admin approval');
      } else {
        setError(serverMsg || t('error'));
      }
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(160deg, var(--tc-primary-light) 0%, var(--tc-bg) 50%, #F7D8A8 100%)' }}>
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'var(--tc-primary)', boxShadow: '0 4px 0 var(--tc-primary-dark)' }}>
              <BuildingIcon size={32} color="#fff" sw={1.5} />
            </div>
          </div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--tc-primary-dark)', letterSpacing: '-0.5px' }}>जनगणना 2027</h1>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--tc-text-sec)' }}>Census Training Platform</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 6px 0 var(--tc-border)' }}>
          <h2 className="text-lg font-black" style={{ color: 'var(--tc-text)' }}>{t('login')}</h2>

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: '#FFEAEA', color: '#C1440E', border: '2px solid #FFBBBB' }}>
              {error}
            </div>
          )}

          <div>
            <label className="sec-label block">{t('mobile')}</label>
            <input
              type="tel" maxLength={10} required
              className="fancy-input"
              placeholder="10-digit mobile number"
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          <div>
            <label className="sec-label block">
              {isAdmin ? 'Admin Passphrase' : t('password')}
            </label>
            <input
              type="password" required
              className="fancy-input"
              placeholder="••••••"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>

          <button
            type="button"
            onClick={submit}
            disabled={busy}
            className="btn-3d btn-primary"
          >
            {busy ? t('loading') : t('login')}
          </button>
        </div>

        <p className="text-center text-sm font-bold mt-5" style={{ color: 'var(--tc-text-sec)' }}>
          {t('noAccount')}{' '}
          <Link to="/register" className="font-black underline" style={{ color: 'var(--tc-primary)' }}>{t('register')}</Link>
        </p>
      </div>
    </div>
  );
}
