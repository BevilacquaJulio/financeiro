import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, ApiError, Auth, subscribeAuth } from './api';
import type { UserOut, UserPreferences } from './types';
import { applyAccentColor } from '../theme/applyAccent';
import { mergePreferences } from '../theme/preferences';

interface SessionValue {
  user: UserOut | null;
  preferences: UserPreferences;
  currency: string;
  loading: boolean;
  loggingOut: boolean;
  setUser: (user: UserOut) => void;
  setPreferences: (prefs: UserPreferences) => void;
  logout: () => void;
  finishLogout: () => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession precisa estar dentro de <SessionProvider>');
  return ctx;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [authRevision, setAuthRevision] = useState(0);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => subscribeAuth(() => setAuthRevision((n) => n + 1)), []);

  const token = useMemo(() => Auth.token, [authRevision]);
  const cachedUser = useMemo(() => Auth.user, [authRevision]);

  const { data, isPending, isError, error } = useQuery({
    queryKey: ['me'],
    queryFn: () => api<UserOut>('/users/me'),
    enabled: Boolean(token),
    placeholderData: cachedUser ?? undefined,
    retry: false,
    staleTime: 60_000,
  });

  const user = data ?? cachedUser ?? null;
  // So bloqueia a UI quando ainda nao ha usuario algum (nem cache).
  const loading = Boolean(token) && !user && isPending;

  useEffect(() => {
    if (!isError) return;
    if (error instanceof ApiError) {
      if (error.status === 401) return;
      if (error.status === 403 && error.message.toLowerCase().includes('pendente')) {
        window.location.href = '/status';
        return;
      }
    }
    Auth.token = null;
    Auth.user = null;
    window.location.href = '/';
  }, [isError, error]);

  const preferences = useMemo(
    () => mergePreferences(user?.preferences),
    [user?.preferences],
  );

  useEffect(() => {
    applyAccentColor(preferences.accent_color);
  }, [preferences.accent_color]);

  useEffect(() => {
    if (user) Auth.user = user;
  }, [user]);

  const setUser = useCallback(
    (u: UserOut) => {
      qc.setQueryData(['me'], u);
      Auth.user = u;
    },
    [qc],
  );

  const setPreferences = useCallback(
    (prefs: UserPreferences) => {
      qc.setQueryData(['me'], (old: UserOut | undefined) =>
        old ? { ...old, preferences: prefs } : old,
      );
    },
    [qc],
  );

  const logout = useCallback(() => {
    setLoggingOut(true);
  }, []);

  const finishLogout = useCallback(() => {
    qc.clear();
    Auth.clearSession();
    setLoggingOut(false);
    navigate('/', { replace: true });
  }, [qc, navigate]);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      preferences,
      currency: user?.currency ?? 'R$',
      loading,
      loggingOut,
      setUser,
      setPreferences,
      logout,
      finishLogout,
    }),
    [user, preferences, loading, loggingOut, setUser, setPreferences, logout, finishLogout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
