/**
 * --- Session management — source unique frontend -----------------------------
 *
 * Deux couches :
 * 1. Cookie `mc_token`  — JWT, HttpOnly, posé par le backend — protégé XSS
 * 2. Cookie `mc_session` — {userId, role, fullName, token} — lu par le middleware
 *    et apiClient. Contient le token uniquement pour le mode démo (DEMO_TOKEN).
 *
 * En production (OTP flow) : le vrai JWT est dans mc_token (HttpOnly).
 *   - apiClient envoie credentials:'include' → le cookie est transmis auto.
 *   - mc_session contient token='' (vide) — uniquement les métadonnées UI.
 *
 * En démo : mc_session contient token='DEMO_TOKEN' pour que isDemoMode() fonctionne.
 */

export interface Session {
  token:    string;
  userId:   string;
  role:     'doctor' | 'patient';
  fullName: string;
}

const COOKIE_NAME    = 'mc_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 jours en secondes

// --- Client-side (browser) ----------------------------------------------------

export function saveSession(session: Session): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=strict${secure}`;
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
  // Supprimer le cookie UI
  document.cookie = `${COOKIE_NAME}=; path=/; max-age=0`;
  // Demander au backend de supprimer le cookie HttpOnly mc_token
  void fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => {});
}

// --- Server-side (middleware / Server Components) ---------------------------

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
