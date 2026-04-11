import { create } from 'zustand';
import i18n from '../i18n/index';
import api from '../api/client';

export const useAuthStore = create((set) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) { set({ loading: false }); return; }
    try {
      const { data } = await api.get('/user/me');
      set({ user: data.user, loading: false });
      // Sync language from server
      if (data.user.language) {
        localStorage.setItem('lang', data.user.language);
        i18n.changeLanguage(data.user.language);
      }
    } catch {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      set({ user: null, loading: false });
    }
  },

  login: async (mobile, password) => {
    const { data } = await api.post('/auth/login', { mobile, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: data.user });
    return data.user;
  },

  register: async (payload) => {
    await api.post('/auth/register', payload);
    // No tokens issued — user must be approved by admin before login
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null });
  },

  updateUser: (updates) => set((s) => ({ user: { ...s.user, ...updates } })),
}));
