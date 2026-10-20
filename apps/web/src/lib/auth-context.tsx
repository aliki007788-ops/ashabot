'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, getRefreshToken, setAccessToken, setOnUnauthorized, setSession } from './api';

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt?: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  refreshUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get<{ user: User }>('/api/auth/me');
      setUser(data.user);
    } catch {
      setUser(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setLoading(false);
      return;
    }
    setAccessToken(token);
    fetchMe();
  }, [fetchMe]);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      router.push('/login');
    });
  }, [router]);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    setSession(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.push(data.user?.role === 'ADMIN' ? '/admin' : '/account');
  };

  const register = async (name: string, email: string, password: string) => {
    const { data } = await api.post('/api/auth/register', { name, email, password });
    setSession(data.accessToken, data.refreshToken);
    setUser(data.user);
    router.push(data.user?.role === 'ADMIN' ? '/admin' : '/onboarding');
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout', { refreshToken: getRefreshToken() });
    } catch {}
    setAccessToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin: user?.role === 'ADMIN', refreshUser: fetchMe }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
