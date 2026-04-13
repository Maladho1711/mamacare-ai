/**
 * ─── Dev Mode — Source de vérité unique ──────────────────────────────────────
 *
 * Active le mode démo/test quand DEV_MODE=true dans .env
 * Ce flag contrôle :
 *   - L'acceptation des tokens dev signés par JwtGuard
 *   - Les données mock retournées par les services (patients, questionnaire, alerts)
 *   - Le skip des appels Supabase / Anthropic / WhatsApp / SMS
 *
 * ⚠️ En production : DEV_MODE doit être absent ou 'false'.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

// ─── Activation ───────────────────────────────────────────────────────────────

/**
 * Évalué à l'EXÉCUTION (pas au chargement du module) pour que ConfigModule
 * ait le temps de charger .env avant le premier appel.
 */
export function isDevMode(): boolean {
  return process.env['DEV_MODE'] === 'true';
}

// ─── Signature HMAC des tokens dev ────────────────────────────────────────────

/**
 * Clé de signature — lue à l'exécution.
 * En dev : fallback sur une constante pour éviter les erreurs de config.
 * En prod : devrait être dans .env mais dev mode ne s'active pas en prod.
 */
function getSigningKey(): string {
  return process.env['DEV_MODE_SECRET'] ?? 'mamacare-dev-signing-key-not-for-prod';
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type DevRole = 'doctor' | 'patient';

export interface DevTokenPayload {
  sub:        string;    // user id (ex: dev-doctor-001)
  role:       DevRole;
  full_name:  string;
  phone:      string;
  iat:        number;    // issued at (timestamp ms)
}

// ─── Comptes de test ──────────────────────────────────────────────────────────

export const DEV_PHONE = '+224623436513';

export const DEV_PROFILES: Record<DevRole, Omit<DevTokenPayload, 'iat'>> = {
  doctor: {
    sub:        'dev-doctor-001',
    role:       'doctor',
    full_name:  'Dr. Maladho Barry (TEST)',
    phone:      DEV_PHONE,
  },
  patient: {
    sub:        'dev-patient-001',
    role:       'patient',
    full_name:  'Maladho Barry (TEST)',
    phone:      DEV_PHONE,
  },
};

// ─── Génération / validation des tokens ──────────────────────────────────────

/**
 * Génère un token dev signé HMAC.
 * Format : `dev_<base64url(payload)>.<hmac(payload)>`
 */
export function signDevToken(role: DevRole): string {
  const payload: DevTokenPayload = {
    ...DEV_PROFILES[role],
    iat: Date.now(),
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature  = createHmac('sha256', getSigningKey())
    .update(payloadB64)
    .digest('base64url');
  return `dev_${payloadB64}.${signature}`;
}

/**
 * Valide un token dev et retourne son payload.
 * Lance une erreur si la signature est invalide ou le format incorrect.
 */
export function verifyDevToken(token: string): DevTokenPayload {
  if (!token.startsWith('dev_')) {
    throw new Error('Not a dev token');
  }

  const [payloadB64, signature] = token.slice(4).split('.');
  if (!payloadB64 || !signature) {
    throw new Error('Malformed dev token');
  }

  // Recalculer la signature attendue
  const expected = createHmac('sha256', getSigningKey())
    .update(payloadB64)
    .digest('base64url');

  // Comparaison en temps constant (évite les attaques timing)
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error('Invalid dev token signature');
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, 'base64url').toString('utf-8'),
  ) as DevTokenPayload;

  return payload;
}
