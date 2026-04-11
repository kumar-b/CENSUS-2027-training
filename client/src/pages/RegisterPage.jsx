import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/authStore';
import LanguageToggle from '../components/LanguageToggle';
import { BuildingIcon } from '../components/Icons';

const FUNCTIONARY_TYPES = [
  'Enumerator',
  'Supervisor',
  'Charge Officer',
  'Field Trainer',
  'Census Staff General',
];

export default function RegisterPage() {
  const { t } = useTranslation();
  const register = useAuthStore((s) => s.register);
  const [form, setForm] = useState({
    name: '', mobile: '', password: '',
    functionary_type: '', state: 'CG', district: 'Raipur',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || t('error'));
    } finally { setBusy(false); }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(160deg, var(--tc-primary-light) 0%, var(--tc-bg) 50%, #F7D8A8 100%)' }}>
        <div className="w-full max-w-sm">
          <div className="rounded-2xl p-8 text-center space-y-4" style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 6px 0 var(--tc-border)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-3xl" style={{ background: 'var(--tc-primary-light)' }}>
              ⏳
            </div>
            <h2 className="text-xl font-black" style={{ color: 'var(--tc-primary-dark)' }}>Registration Submitted!</h2>
            <p className="text-sm font-medium" style={{ color: 'var(--tc-text-sec)' }}>
              Your account is pending approval by the admin. You will be able to log in once your account is approved.
            </p>
            <p className="text-xs" style={{ color: 'var(--tc-text-sec)' }}>
              पंजीकरण सफल हुआ। व्यवस्थापक की स्वीकृति मिलने के बाद आप लॉगिन कर सकेंगे।
            </p>
            <Link to="/login" className="btn-3d btn-primary block mt-2">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8" style={{ background: 'linear-gradient(160deg, var(--tc-primary-light) 0%, var(--tc-bg) 50%, #F7D8A8 100%)' }}>
      <div className="absolute top-4 right-4"><LanguageToggle /></div>
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-2">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'var(--tc-primary)', boxShadow: '0 4px 0 var(--tc-primary-dark)' }}>
              <BuildingIcon size={28} color="#fff" sw={1.5} />
            </div>
          </div>
          <h1 className="text-3xl font-black" style={{ color: 'var(--tc-primary-dark)' }}>जनगणना 2027</h1>
          <p className="text-sm font-bold mt-1" style={{ color: 'var(--tc-text-sec)' }}>Census Training Platform</p>
        </div>

        {/* Form card */}
        <form onSubmit={submit} className="rounded-2xl p-6 space-y-4" style={{ background: 'var(--tc-card)', border: '2px solid var(--tc-border)', boxShadow: '0 6px 0 var(--tc-border)' }}>
          <h2 className="text-lg font-black" style={{ color: 'var(--tc-text)' }}>{t('register')}</h2>

          {error && (
            <div className="rounded-xl px-3 py-2 text-sm font-bold" style={{ background: '#FFEAEA', color: '#C1440E', border: '2px solid #FFBBBB' }}>
              {error}
            </div>
          )}

          {[
            { key: 'name', label: t('name'), type: 'text', placeholder: 'Full name' },
            { key: 'mobile', label: t('mobile'), type: 'tel', maxLength: 10, placeholder: '10-digit number' },
            { key: 'password', label: t('password'), type: 'password', placeholder: '6+ characters' },
          ].map(({ key, label, type, maxLength, placeholder }) => (
            <div key={key}>
              <label className="sec-label block">{label}</label>
              <input
                type={type} required maxLength={maxLength}
                className="fancy-input"
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
              />
            </div>
          ))}

          <div>
            <label className="sec-label block">{t('functionary_type')}</label>
            <select
              required
              className="fancy-input"
              value={form.functionary_type}
              onChange={(e) => set('functionary_type', e.target.value)}
            >
              <option value="">— Select role —</option>
              {FUNCTIONARY_TYPES.map((ft) => (
                <option key={ft} value={ft}>{t(`functionary.${ft}`)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="sec-label block">{t('state')}</label>
              <input
                type="text" required
                className="fancy-input"
                value={form.state}
                onChange={(e) => set('state', e.target.value)}
              />
            </div>
            <div>
              <label className="sec-label block">{t('district')}</label>
              <input
                type="text" required
                className="fancy-input"
                value={form.district}
                onChange={(e) => set('district', e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit" disabled={busy}
            className="btn-3d btn-primary"
          >
            {busy ? t('loading') : t('register')}
          </button>
        </form>

        <p className="text-center text-sm font-bold mt-5" style={{ color: 'var(--tc-text-sec)' }}>
          {t('haveAccount')}{' '}
          <Link to="/login" className="font-black underline" style={{ color: 'var(--tc-primary)' }}>{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}
