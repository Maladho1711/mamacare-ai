/**
 * ─── API Client — source unique des appels HTTP ─────────────────────────────
 *
 * Attache automatiquement le token depuis le cookie `mc_session`.
 * Aucun composant ne doit passer le token manuellement.
 *
 * Usage :
 *   const data = await apiClient.get<MyType>('/patients');
 *   await apiClient.post('/alerts/123/resolve', {});
 */

import { getSession } from '@/lib/auth/session';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/** Timeout 10s — contrainte réseau instable en Guinée (ARCHITECTURE.md) */
const TIMEOUT_MS = 10_000;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiFetchOptions extends RequestInit {
  /** Si true, n'attache PAS le token (pour endpoints publics comme /auth/dev-login) */
  skipAuth?: boolean;
}

async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { skipAuth, headers: extraHeaders, ...rest } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(extraHeaders as Record<string, string> | undefined),
  };

  if (!skipAuth) {
    const session = getSession();
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...rest,
      headers,
      signal: controller.signal,
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ message: `Erreur ${response.status}` }));
      const message =
        (err as { message?: string }).message ?? `Erreur ${response.status}`;
      throw new ApiError(message, response.status);
    }

    // 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if ((error as Error).name === 'AbortError') {
      throw new ApiError('Le serveur met trop de temps à répondre', 408);
    }
    throw new ApiError(
      (error as Error).message ?? 'Erreur réseau',
      0,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  patch: <T>(path: string, body?: unknown, options?: ApiFetchOptions) =>
    apiFetch<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }),

  delete: <T>(path: string, options?: ApiFetchOptions) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
