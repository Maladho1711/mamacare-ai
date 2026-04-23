/**
 * Supabase clients pour les Edge Functions.
 *
 * - makeAdminClient() → service role, bypass RLS (pour les crons + opérations admin)
 * - makeUserClient(token) → user context, RLS appliquée automatiquement
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

/** Client admin — bypass RLS. À utiliser uniquement pour les opérations internes. */
export function makeAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Client utilisateur — RLS appliquée automatiquement.
 * Passe le JWT de l'utilisateur dans les headers.
 */
export function makeUserClient(token: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Auth client avec anon key — pour OTP send/verify */
export function makeAuthClient() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
