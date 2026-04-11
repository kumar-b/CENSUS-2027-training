import { useTranslation } from 'react-i18next';
import api from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const current = i18n.language;

  const toggle = async () => {
    const next = current === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(next);
    localStorage.setItem('lang', next);
    if (user) {
      try {
        await api.patch('/user/me', { lang: next });
        updateUser({ lang: next });
      } catch {}
    }
  };

  return (
    <button
      onClick={toggle}
      className="px-3 py-1 rounded-full text-sm font-black transition-all"
      style={{ border: '2px solid var(--tc-primary)', color: 'var(--tc-primary-dark)', background: 'var(--tc-primary-light)', boxShadow: '0 2px 0 var(--tc-primary-dark)' }}
    >
      {current === 'en' ? 'हिं' : 'EN'}
    </button>
  );
}
