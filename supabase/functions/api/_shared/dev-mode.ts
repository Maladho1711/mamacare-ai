/**
 * Dev mode — port Deno de apps/api/src/shared/dev-mode.ts
 *
 * Utilise Web Crypto API (compatible Deno) au lieu de node:crypto.
 * Logique HMAC identique à la version NestJS.
 */

export function isDevMode(): boolean {
  return Deno.env.get('DEV_MODE') === 'true';
}

function getSigningKey(): string {
  return Deno.env.get('DEV_MODE_SECRET') ?? 'mamacare-dev-signing-key-not-for-prod';
}

export type DevRole = 'doctor' | 'patient';

export interface DevTokenPayload {
  sub: string;
  role: DevRole;
  full_name: string;
  phone: string;
  iat: number;
}

export const DEV_PHONE = '+224623436513';

export const DEV_PROFILES: Record<DevRole, Omit<DevTokenPayload, 'iat'>> = {
  doctor: {
    sub: 'dev-doctor-001',
    role: 'doctor',
    full_name: 'Dr. Maladho Barry (TEST)',
    phone: DEV_PHONE,
  },
  patient: {
    sub: 'dev-patient-001',
    role: 'patient',
    full_name: 'Maladho Barry (TEST)',
    phone: DEV_PHONE,
  },
};

// ─── Web Crypto helpers ────────────────────────────────────────────────────────

function base64urlEncode(buffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob(padded);
  return new Uint8Array([...raw].map((c) => c.charCodeAt(0)));
}

async function getCryptoKey(signingKey: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

/** Génère un token dev signé HMAC. Format : `dev_<base64url(payload)>.<hmac>` */
export async function signDevToken(role: DevRole): Promise<string> {
  const payload: DevTokenPayload = { ...DEV_PROFILES[role], iat: Date.now() };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getCryptoKey(getSigningKey());
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const signature = base64urlEncode(sigBuffer);
  return `dev_${payloadB64}.${signature}`;
}

/** Valide un token dev et retourne son payload. Lance une Error si invalide. */
export async function verifyDevToken(token: string): Promise<DevTokenPayload> {
  if (!token.startsWith('dev_')) throw new Error('Not a dev token');
  const [payloadB64, signature] = token.slice(4).split('.');
  if (!payloadB64 || !signature) throw new Error('Malformed dev token');

  const key = await getCryptoKey(getSigningKey());
  const sigBytes = base64urlDecode(signature);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payloadB64),
  );

  if (!valid) throw new Error('Invalid dev token signature');

  return JSON.parse(new TextDecoder().decode(base64urlDecode(payloadB64))) as DevTokenPayload;
}

// ─── Phone tokens (vrais utilisateurs OTP-vérifiés) ──────────────────────────

/** Payload d'un token OTP-vérifié — vrai utilisateur en prod */
export interface PhoneTokenPayload {
  sub: string;
  role: 'doctor' | 'patient' | 'admin';
  full_name: string;
  phone: string;
  iat: number;
  exp: number;
}

/** Durée de validité d'un token phone — 30 jours */
const PHONE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/** Génère un token signé HMAC pour un utilisateur OTP-vérifié.
 *  Format : `phone_<base64url(payload)>.<hmac>` */
export async function signPhoneToken(profile: {
  sub: string;
  role: 'doctor' | 'patient' | 'admin';
  full_name: string;
  phone: string;
}): Promise<string> {
  const now = Date.now();
  const payload: PhoneTokenPayload = {
    ...profile,
    iat: now,
    exp: now + PHONE_TOKEN_TTL_MS,
  };
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await getCryptoKey(getSigningKey());
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payloadB64));
  const signature = base64urlEncode(sigBuffer);
  return `phone_${payloadB64}.${signature}`;
}

/** Valide un token phone — vérifie signature ET expiration */
export async function verifyPhoneToken(token: string): Promise<PhoneTokenPayload> {
  if (!token.startsWith('phone_')) throw new Error('Not a phone token');
  const [payloadB64, signature] = token.slice(6).split('.');
  if (!payloadB64 || !signature) throw new Error('Malformed phone token');

  const key = await getCryptoKey(getSigningKey());
  const sigBytes = base64urlDecode(signature);
  const valid = await crypto.subtle.verify(
    'HMAC',
    key,
    sigBytes,
    new TextEncoder().encode(payloadB64),
  );

  if (!valid) throw new Error('Invalid phone token signature');

  const payload = JSON.parse(
    new TextDecoder().decode(base64urlDecode(payloadB64)),
  ) as PhoneTokenPayload;

  if (Date.now() > payload.exp) throw new Error('Phone token expired');
  return payload;
}
