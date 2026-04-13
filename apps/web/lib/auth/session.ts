/**
 * ─── Session management — source unique frontend ─────────────────────────────
 *
 * Stocke l'auth state dans un SEUL cookie `mc_session` (JSON-encoded).
 * Le cookie est lisible par le middleware Next.js (server-side) ET par le
 * client (pour attacher le token aux appels API).
 *
 * ⚠️ Cookie non-HttpOnly : acceptable en dev. En prod, utiliser httpOnly via
 * un endpoint /auth/set-cookie qui pose le cookie depuis le backend.
 */

export interface Session {
  token:    string;
  userId:   string;
  role:     'doctor' | 'patient';
  fullName: string;
}

const COOKIE_NAME = 'mc_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours

// ─── Client-side (browser) ────────────────────────────────────────────────────

export function saveSession(session: Session): void {
  if (typeof document === 'undefined') return;
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function getSession(): Session | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.substring(COOKIE_NAME.length + 1));
    return JSON.parse(value) as Session;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
}

// ─── Server-side (middleware / Server Components) ───────────────────────────

/**
 * Parse un cookie depuis un header `Cookie` (middleware Next.js).
 * Utilisé par middleware.ts qui n'a pas accès à document.cookie.
 */
export function parseSessionFromCookieHeader(
  cookieHeader: string | null | undefined,
): Session | null {
  if (!cookieHeader) return null;
  const match = cookieHeader
    .split('; ')
    .find((row) => row.startsWith(`${COOKIE_NAME}=`));
  if (!match) return null;
  try {
    const value = decodeURIComponent(match.substring(COOKIE_NAME.length + 1));
    return JSON.parse(value) as Session;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
