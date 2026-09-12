import { useQueryClient } from '@tanstack/react-query';
import * as SecureStore from 'expo-secure-store';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { api, setToken } from '@/api/client';
import type { AuthResponse, Me, Mode } from '@/api/types';

interface AuthState {
  loading: boolean;
  token: string | null;
  me: Me | null;
  login: (email: string, password: string) => Promise<Me>;
  signup: (body: { name: string; email: string; password: string; university: string }) => Promise<Me>;
  logout: () => Promise<void>;
  setMode: (mode: Mode) => Promise<Me>;
  refresh: () => Promise<Me | null>;
}

const AuthContext = createContext<AuthState | null>(null);
const KEY = 'subswipe.token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [token, setTok] = useState<string | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const qc = useQueryClient();

  const refresh = useCallback(async () => {
    try {
      const m = await api<Me>('/auth/me');
      setMe(m);
      return m;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await SecureStore.getItemAsync(KEY);
        if (saved) {
          setToken(saved);
          setTok(saved);
          const m = await refresh();
          if (!m) {
            setToken(null);
            setTok(null);
            await SecureStore.deleteItemAsync(KEY);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const accept = useCallback(async (res: AuthResponse) => {
    setToken(res.token);
    setTok(res.token);
    await SecureStore.setItemAsync(KEY, res.token);
    const m: Me = { user: res.user, has_renter_profile: res.has_renter_profile, listing_id: res.listing_id };
    setMe(m);
    qc.clear();
    return m;
  }, [qc]);

  const value = useMemo<AuthState>(() => ({
    loading, token, me, refresh,
    login: async (email, password) => accept(await api<AuthResponse>('/auth/login', { method: 'POST', body: { email, password } })),
    signup: async (body) => accept(await api<AuthResponse>('/auth/signup', { method: 'POST', body })),
    logout: async () => {
      setToken(null);
      setTok(null);
      setMe(null);
      qc.clear();
      await SecureStore.deleteItemAsync(KEY);
    },
    setMode: async (mode) => {
      const m = await api<Me>('/auth/me', { method: 'PATCH', body: { mode } });
      setMe(m);
      qc.invalidateQueries({ queryKey: ['matches'] });
      return m;
    },
  }), [loading, token, me, refresh, accept, qc]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
