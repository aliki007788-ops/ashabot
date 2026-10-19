import axios from 'axios';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export const api = axios.create({ baseURL: API_URL, headers: { 'Content-Type': 'application/json' } });

export const getToken = (): string | null => {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  } catch {
    return null;
  }
};
export const setToken = (t: string | null): void => {
  try {
    if (t) localStorage.setItem('accessToken', t);
    else localStorage.removeItem('accessToken');
  } catch {
    /* ignore */
  }
};

api.interceptors.request.use((config) => {
  const t = getToken();
  if (t) config.headers.Authorization = `Bearer ${t}`;
  return config;
});

export const extractError = (err: unknown): string => {
  if (axios.isAxiosError(err)) {
    const d = err.response?.data as { error?: string } | undefined;
    return d?.error || err.message;
  }
  return err instanceof Error ? err.message : 'خطای نامشخص';
};
