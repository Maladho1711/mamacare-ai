import { createClient } from '@supabase/supabase-js';

/**
 * URLs de secours utilisees UNIQUEMENT au build time / prerender
 * quand les env vars ne sont pas disponibles (ex: Vercel preview sans config).
 * A runtime, les vraies env vars Vercel sont utilisees.
 *
 * Ces valeurs sont des placeholders syntaxiquement valides qui permettent
 * a createClient() de ne pas throw pendant le SSG de Next.js.
 */
const FALLBACK_URL = 'https://placeholder.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder.placeholder';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || FALLBACK_KEY;

/**
 * Client Supabase frontend (anon key).
 * Utilise uniquement pour Realtime — toutes les requetes
 * REST passent par le backend NestJS via apiClient.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
