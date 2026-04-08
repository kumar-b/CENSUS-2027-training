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
      className="px-3 py-1 rounded-full text-sm font-medium border border-indigo-300 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
    >
      {current === 'en' ? 'हिं' : 'EN'}
    </button>
  );
}
