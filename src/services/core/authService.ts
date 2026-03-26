// services/authService.ts
import { apiClient, storageKeys, saveTokens } from './apiClient';
import { AuthUser } from '../../types';

const INACTIVITY_LIMIT_MS = 30 * 24 * 60 * 60 * 1000;

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: 'bearer' | string;
  expires_in: number;
  user: AuthUser;
}

export interface MeResponse {
  id: string;
  email: string;
  name: string | null;
  role: AuthUser['role'];
  is_active: boolean;
  plan: AuthUser['plan'];
  trial_ends_at?: string | null;
  created_at?: string;
  updated_at?: string;
}

const nowIso = () => new Date().toISOString();

const readJson = <T>(key: string): T | null => {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

const writeJson = (key: string, value: unknown) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const clearSession = () => {
  apiClient.clearSession();
};

const getLastActivityAt = (): string | null => {
  return localStorage.getItem(storageKeys.lastActivityAt);
};

const setLastActivityAt = (value: string) => {
  localStorage.setItem(storageKeys.lastActivityAt, value);
};

const setToken = (token: string) => {
  localStorage.setItem(storageKeys.accessToken, token);
};

const setRefreshToken = (token: string) => {
  localStorage.setItem(storageKeys.refreshToken, token);
};

const setStoredUser = (user: AuthUser | MeResponse) => {
  writeJson(storageKeys.user, user);
};

const getStoredUser = <T extends AuthUser | MeResponse>(): T | null => {
  return readJson<T>(storageKeys.user);
};

const getToken = (): string | null => {
  return localStorage.getItem(storageKeys.accessToken);
};

const hasSession = (): boolean => {
  return Boolean(getToken());
};

const touchActivity = () => {
  setLastActivityAt(nowIso());
};

const isSessionExpiredByInactivity = (): boolean => {
  const lastActivityAt = getLastActivityAt();
  if (!lastActivityAt) return false;

  const lastActivityMs = new Date(lastActivityAt).getTime();
  if (Number.isNaN(lastActivityMs)) return false;

  return Date.now() - lastActivityMs > INACTIVITY_LIMIT_MS;
};

const requireActiveSession = () => {
  if (isSessionExpiredByInactivity()) {
    clearSession();
    throw new Error('Tu sesión expiró por inactividad. Inicia sesión nuevamente.');
  }
};

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    saveTokens(response.access_token, response.refresh_token);
    setStoredUser(response.user);
    touchActivity();

    return response;
  },

  async getMe(): Promise<MeResponse> {
    requireActiveSession();

    const response = await apiClient.get<MeResponse>('/auth/me');
    setStoredUser(response);
    touchActivity();

    return response;
  },

  logout() {
    clearSession();
  },

  getToken,

  getStoredUser,

  hasSession,

  touchActivity,

  getLastActivityAt,

  isSessionExpiredByInactivity,

  async updatePassword(newPassword: string): Promise<void> {
    await apiClient.post('/auth/change-password', { new_password: newPassword });
  },

  async bootstrapSession(): Promise<MeResponse | null> {
    const token = getToken();
    if (!token) return null;

    if (isSessionExpiredByInactivity()) {
      clearSession();
      return null;
    }

    try {
      return await this.getMe();
    } catch {
      clearSession();
      return null;
    }
  },
};