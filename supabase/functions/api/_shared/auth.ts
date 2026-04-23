/**
 * Auth helpers pour les Edge Functions.
 *
 * Supporte deux modes :
 * 1. Token Supabase JWT → vérification via supabase.auth.getUser()
 * 2. Token dev (dev_...) → vérification HMAC locale
 */

import { makeAdminClient } from './supabase.ts';
import { isDevMode, verifyDevToken, DevTokenPayload } from './dev-mode.ts';

export interface AuthUser {
  id: string;
  role: 'doctor' | 'patient';
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

  // ── Token dev ──────────────────────────────────────────────────────────────
  if (token.startsWith('dev_')) {
    if (!isDevMode()) return null; // Tokens dev refusés en prod
    try {
      const payload = await verifyDevToken(token) as DevTokenPayload;
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

  // ── Token Supabase JWT ─────────────────────────────────────────────────────
  try {
    const admin = makeAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    // Récupérer le profil depuis la table profiles
    const { data: profile } = await admin
      .from('profiles')
      .select('role, full_name, phone')
      .eq('id', user.id)
      .single();

    if (!profile) return null;

    return {
      id: user.id,
      role: (profile as { role: string }).role as 'doctor' | 'patient',
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

/** Require doctor role */
export async function requireDoctor(req: Request): Promise<AuthUser> {
  const user = await requireAuth(req);
  if (user.role !== 'doctor') {
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
