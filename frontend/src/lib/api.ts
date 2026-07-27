/**
 * Porte de `frontend/js/api.js`.
 *
 * Paridade mantida de proposito (plano, 3.3):
 *  - prefixo `/api`
 *  - Bearer no header (nao cookie)
 *  - token em `localStorage` sob a chave `fin_token`
 *  - 401 limpa o token e joga para a tela de login
 *  - a mensagem de erro sai de `data.detail`
 *
 * DIVIDA ACEITA (plano, 6.4): JWT em localStorage e vulneravel a XSS. A troca
 * por cookie httpOnly + refresh token e item da Fase 7 — nao e "esquecimento".
 */
import type { UserOut } from './types';

const TOKEN_KEY = 'fin_token';
const USER_KEY = 'fin_user';
const AUTH_EVENT = 'fin-auth-change';

function notifyAuthChange(): void {
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function subscribeAuth(callback: () => void): () => void {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

export const Auth = {
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  set token(v: string | null) {
    const prev = localStorage.getItem(TOKEN_KEY);
    const next = v ?? null;
    if (prev === next) return;
    if (v) localStorage.setItem(TOKEN_KEY, v);
    else localStorage.removeItem(TOKEN_KEY);
    notifyAuthChange();
  },
  get user(): UserOut | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as UserOut) : null;
    } catch {
      return null;
    }
  },
  set user(u: UserOut | null) {
    const prev = localStorage.getItem(USER_KEY);
    const next = u ? JSON.stringify(u) : null;
    if (prev === next) return;
    if (u) localStorage.setItem(USER_KEY, JSON.stringify(u));
    else localStorage.removeItem(USER_KEY);
    notifyAuthChange();
  },
  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    notifyAuthChange();
  },
  /** Logout imediato — use `useSession().logout()` para animacao na UI. */
  logout(): void {
    this.clearSession();
    window.location.href = '/';
  },
};

export interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  auth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T = unknown>(
  path: string,
  { method = 'GET', body, auth = true }: ApiOptions = {},
): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth && Auth.token) headers.Authorization = `Bearer ${Auth.token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && auth) {
    Auth.token = null;
    Auth.user = null;
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new ApiError('Sessao expirada.', 401);
  }

  let data: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : detail
          ? JSON.stringify(detail)
          : 'Erro inesperado.';
    throw new ApiError(message, res.status);
  }

  return data as T;
}

/** Monta querystring omitindo vazios — igual ao que o dashboard.js fazia. */
export function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}
