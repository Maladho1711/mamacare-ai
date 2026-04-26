/**
 * Auth helpers pour les Edge Functions.
 *
 * Supporte trois modes :
 * 1. Token Supabase JWT → vérification via supabase.auth.getUser()
 * 2. Token dev (dev_...) → HMAC, mode démo uniquement
 * 3. Token phone (phone_...) → HMAC, vrais users OTP-vérifiés via Nimba SMS
 */

import { makeAdminClient } from './supabase.ts';
import {
  isDevMode,
  verifyDevToken,
  verifyPhoneToken,
  DevTokenPayload,
} from './dev-mode.ts';

export interface AuthUser {
  id: string;
  role: 'doctor' | 'patient' | 'admin';
  full_name: string;
  phone: string;
}

/**
 * Extrait et vérifie le token Bearer depuis les headers.
 * Retourne null si non authentifié ou token invalide.
 */
export async function getAuthUser(req: Request): Promise<AuthUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);

  // ── Token phone (vrai user OTP) ─────────────────────────────────────────────
  if (token.startsWith('phone_')) {
    try {
      const payload = await verifyPhoneToken(token);
      return {
        id: payload.sub,
        role: payload.role,
        full_name: payload.full_name,
        phone: payload.phone,
      };
    } catch {
      return null;
    }
  }

  // ── Token dev (mode démo) ──────────────────────────────────────────────────
  if (token.startsWith('dev_')) {
    if (!isDevMode()) return null;
    try {
      const payload = (await verifyDevToken(token)) as DevTokenPayload;
      return {
        id: payload.sub,
        role: payload.role,
        full_name: payload.full_name,
        phone: payload.phone,
      };
    } catch {
      return null;
    }
  }

  // ── Token Supabase JWT (legacy / fallback) ─────────────────────────────────
  try {
    const admin = makeAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, phone')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      role: (profile as { role: string }).role as 'doctor' | 'patient' | 'admin',
      full_name: (profile as { full_name: string }).full_name,
      phone: (profile as { phone: string }).phone,
    };
  } catch {
    return null;
  }
}

/** Require auth — retourne AuthUser ou throw Response 401 */
export async function requireAuth(req: Request): Promise<AuthUser> {
  const user = await getAuthUser(req);
  if (!user) throw new Response(JSON.stringify({ message: 'Non authentifié' }), { status: 401 });
  return user;
}

/** Require doctor role (admin a aussi accès) */
export async function requireDoctor(req: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== 'doctor' && user.role !== 'admin') {
    throw new Response(JSON.stringify({ message: 'Accès réservé aux médecins' }), { status: 403 });
  }
  return user;
}

/** Require patient role */
export async function requirePatient(req: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== 'patient') {
    throw new Response(JSON.stringify({ message: 'Accès réservé aux patientes' }), { status: 403 });
  }
  return user;
}

/** Require admin role */
export async function requireAdmin(req: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== 'admin') {
    throw new Response(JSON.stringify({ message: 'Accès réservé aux administrateurs' }), { status: 403 });
  }
  return user;
}
