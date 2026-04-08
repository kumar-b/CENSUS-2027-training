import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './en';
import hi from './hi';

i18n.use(initReactI18next).init({
  resources: { en, hi },
  lng: localStorage.getItem('lang') || 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
