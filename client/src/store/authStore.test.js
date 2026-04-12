import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('../i18n/index', () => ({
  default: {
    changeLanguage: vi.fn(),
  },
}));

import api from '../api/client';
import i18n from '../i18n/index';
import { useAuthStore } from './authStore';

const INITIAL_STATE = { user: null, loading: true };

// jsdom localStorage mock (jsdom v29 has quirks with --localstorage-file)
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  useAuthStore.setState(INITIAL_STATE);
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ── logout ────────────────────────────────────────────────────────────────────
describe('logout', () => {
  it('clears user from state', () => {
    useAuthStore.setState({ user: { id: 1, name: 'Alice' }, loading: false });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('removes tokens from localStorage', () => {
    localStorage.setItem('accessToken', 'tok-a');
    localStorage.setItem('refreshToken', 'tok-r');
    useAuthStore.getState().logout();
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────
describe('updateUser', () => {
  it('merges partial updates into existing user', () => {
    useAuthStore.setState({ user: { id: 1, name: 'Alice', total_points: 100 } });
    useAuthStore.getState().updateUser({ total_points: 250, language: 'hi' });
    const { user } = useAuthStore.getState();
    expect(user.id).toBe(1);
    expect(user.name).toBe('Alice');
    expect(user.total_points).toBe(250);
    expect(user.language).toBe('hi');
  });

  it('does nothing harmful when user is null', () => {
    useAuthStore.setState({ user: null });
    // Should not throw
    expect(() => useAuthStore.getState().updateUser({ foo: 'bar' })).not.toThrow();
  });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe('login', () => {
  it('stores tokens in localStorage and sets user in state', async () => {
    const mockUser = { id: 5, name: 'Bob', role: 'user' };
    api.post.mockResolvedValueOnce({
      data: { accessToken: 'acc-123', refreshToken: 'ref-456', user: mockUser },
    });

    const returned = await useAuthStore.getState().login('9000000000', 'pass');

    expect(api.post).toHaveBeenCalledWith('/auth/login', { mobile: '9000000000', password: 'pass' });
    expect(localStorage.getItem('accessToken')).toBe('acc-123');
    expect(localStorage.getItem('refreshToken')).toBe('ref-456');
    expect(returned).toEqual(mockUser);
    expect(useAuthStore.getState().user).toEqual(mockUser);
  });
});

// ── register ──────────────────────────────────────────────────────────────────
describe('register', () => {
  it('calls POST /auth/register with the payload', async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    const payload = { mobile: '9111111111', password: 'pass', name: 'Carol', functionary_type: 'Enumerator', state: 'CG', district: 'Raipur' };
    await useAuthStore.getState().register(payload);
    expect(api.post).toHaveBeenCalledWith('/auth/register', payload);
  });

  it('does not set user in state after register (requires admin approval)', async () => {
    api.post.mockResolvedValueOnce({ data: {} });
    await useAuthStore.getState().register({ mobile: '9', password: 'p', name: 'D', functionary_type: 'Enumerator', state: 'CG', district: 'R' });
    expect(useAuthStore.getState().user).toBeNull();
  });
});

// ── init ──────────────────────────────────────────────────────────────────────
describe('init', () => {
  it('sets loading=false and user=null if no token in localStorage', async () => {
    await useAuthStore.getState().init();
    expect(useAuthStore.getState().loading).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('fetches /user/me and sets user when token exists', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    const mockUser = { id: 7, name: 'Dave', language: 'en' };
    api.get.mockResolvedValueOnce({ data: { user: mockUser } });

    await useAuthStore.getState().init();

    expect(api.get).toHaveBeenCalledWith('/user/me');
    expect(useAuthStore.getState().user).toEqual(mockUser);
    expect(useAuthStore.getState().loading).toBe(false);
  });

  it('syncs language from user profile during init', async () => {
    localStorage.setItem('accessToken', 'valid-token');
    const mockUser = { id: 8, name: 'Eve', language: 'hi' };
    api.get.mockResolvedValueOnce({ data: { user: mockUser } });

    await useAuthStore.getState().init();

    expect(localStorage.getItem('lang')).toBe('hi');
    expect(i18n.changeLanguage).toHaveBeenCalledWith('hi');
  });

  it('clears tokens and sets user=null if /user/me throws', async () => {
    localStorage.setItem('accessToken', 'expired');
    localStorage.setItem('refreshToken', 'expired-r');
    api.get.mockRejectedValueOnce(new Error('401'));

    await useAuthStore.getState().init();

    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().loading).toBe(false);
  });
});
