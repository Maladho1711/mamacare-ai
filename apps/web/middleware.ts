/**
 * ─── Middleware Next.js — protection des routes ─────────────────────────────
 *
 * Lit le cookie `mc_session` (posé par la page login) et redirige selon le rôle.
 * Aucun appel réseau → rapide sur toutes les requêtes.
 *
 * Règles :
 * - Route protégée sans session → /login
 * - Route d'auth avec session → /dashboard (doctor) ou /questionnaire (patient)
 * - Route protégée avec mauvais rôle → redirige vers la bonne page
 */

import { NextResponse, type NextRequest } from 'next/server';
import {
  parseSessionFromCookieHeader,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';

const DOCTOR_PREFIXES = ['/dashboard', '/patients', '/alerts'];
const PATIENT_PREFIXES = ['/questionnaire', '/result', '/history'];
const PROTECTED_PREFIXES = [...DOCTOR_PREFIXES, ...PATIENT_PREFIXES];

const AUTH_ROUTES = ['/login', '/verify'];
const PUBLIC_ROUTES = ['/'];

function matches(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = matches(pathname, PROTECTED_PREFIXES);
  const isAuthRoute = matches(pathname, AUTH_ROUTES);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Routes publiques (landing, assets…) → laisser passer sans aucun check
  if (isPublicRoute || (!isProtected && !isAuthRoute)) {
    return NextResponse.next();
  }

  // Lire le cookie de session (format JSON encodé)
  const cookieValue = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const cookieHeader = cookieValue
    ? `${SESSION_COOKIE_NAME}=${cookieValue}`
    : null;
  const session = parseSessionFromCookieHeader(cookieHeader);

  // ── Route d'auth (/login, /verify) ────────────────────────────────────────
  if (isAuthRoute) {
    if (session) {
      const dest = session.role === 'doctor' ? '/dashboard' : '/questionnaire';
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  // ── Route protégée ────────────────────────────────────────────────────────
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Vérification du rôle
  const isDoctorRoute = matches(pathname, DOCTOR_PREFIXES);
  const isPatientRoute = matches(pathname, PATIENT_PREFIXES);

  if (isDoctorRoute && session.role !== 'doctor') {
    return NextResponse.redirect(new URL('/questionnaire', request.url));
  }

  if (isPatientRoute && session.role !== 'patient') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclure tous les assets statiques et fichiers Next.js internes
    '/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|icons|sw\\.js|workbox-.*|.*\\.png$|.*\\.ico$).*)',
  ],
};
