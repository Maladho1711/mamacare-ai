import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/**
 * Client Supabase frontend (anon key).
 * Utilise uniquement pour Realtime — toutes les requetes
 * REST passent par le backend NestJS via apiClient.
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
