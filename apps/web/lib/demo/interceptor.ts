/**
 * ─── Intercepteur API — Mode Démo ────────────────────────────────────────────
 *
 * Intercepte tous les appels `apiClient` quand NEXT_PUBLIC_DEMO_MODE=true.
 * Retourne des données mockées cohérentes sans aucun appel réseau.
 *
 * Endpoints couverts :
 *   GET  /patients                    → liste patientes (médecin)
 *   GET  /patients/me                 → profil patiente connectée
 *   GET  /patients/me/doctor          → médecin de la patiente
 *   GET  /patients/:id                → détail d'une patiente
 *   POST /patients                    → créer une patiente (réponse simulée)
 *   PATCH /patients/:id               → modifier une patiente (simulé)
 *   GET  /alerts                      → liste alertes
 *   PATCH /alerts/:id/resolve         → résoudre une alerte
 *   GET  /questionnaire/my-history    → historique patiente
 *   GET  /questionnaire/history/:id   → historique d'une patiente (médecin)
 *   POST /questionnaire/submit        → soumettre questionnaire
 */

import {
  DEMO_PATIENTS,
  DEMO_PATIENT_SELF,
  DEMO_DOCTOR,
  DEMO_ALERTS,
  DEMO_HISTORY_PATIENT,
  DEMO_HISTORY_DOCTOR,
} from './mock-data';

// Alerts state mutable pour simuler la résolution
type AlertState = Omit<(typeof DEMO_ALERTS)[number], 'resolved_at'> & { resolved_at: string | null };
let alertsState: AlertState[] = DEMO_ALERTS.map((a) => ({ ...a }));

export function getDemoResponse<T>(path: string, method: string): T {
  // ── GET /patients ────────────────────────────────────────────────────────
  if (method === 'GET' && path === '/patients') {
    return DEMO_PATIENTS as unknown as T;
  }

  // ── GET /patients/me ─────────────────────────────────────────────────────
  if (method === 'GET' && path === '/patients/me') {
    return DEMO_PATIENT_SELF as unknown as T;
  }

  // ── GET /patients/me/doctor ──────────────────────────────────────────────
  if (method === 'GET' && path === '/patients/me/doctor') {
    return { fullName: 'Dr. Maladho Barry', phone: DEMO_DOCTOR.phone } as unknown as T;
  }

  // ── GET /patients/:id ────────────────────────────────────────────────────
  const patientMatch = path.match(/^\/patients\/([^/]+)$/);
  if (method === 'GET' && patientMatch) {
    const id = patientMatch[1];
    const patient =
      DEMO_PATIENTS.find((p) => p.id === id) ??
      DEMO_PATIENTS[0]!;
    return patient as unknown as T;
  }

  // ── POST /patients ───────────────────────────────────────────────────────
  if (method === 'POST' && path === '/patients') {
    return {
      id:          `demo-patient-new-${Date.now()}`,
      userId:      null,
      doctorId:    DEMO_DOCTOR.id,
      fullName:    'Nouvelle Patiente',
      phone:       '+224 600 00 00 00',
      status:      'pregnant',
      riskLevel:   'green',
      createdAt:   new Date().toISOString(),
      updatedAt:   new Date().toISOString(),
    } as unknown as T;
  }

  // ── PATCH /patients/:id ─────────────────────────────────────────────────
  if (method === 'PATCH' && patientMatch) {
    const id = patientMatch[1];
    const patient = DEMO_PATIENTS.find((p) => p.id === id) ?? DEMO_PATIENTS[0]!;
    return { ...patient, updatedAt: new Date().toISOString() } as unknown as T;
  }

  // ── GET /alerts ──────────────────────────────────────────────────────────
  if (method === 'GET' && path === '/alerts') {
    return alertsState as unknown as T;
  }

  // ── PATCH /alerts/:id/resolve ────────────────────────────────────────────
  const alertResolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (method === 'PATCH' && alertResolveMatch) {
    const id = alertResolveMatch[1];
    alertsState = alertsState.map((a) =>
      a.id === id ? { ...a, resolved_at: new Date().toISOString() } : a,
    );
    return {} as T;
  }

  // ── GET /questionnaire/my-history ────────────────────────────────────────
  if (method === 'GET' && path === '/questionnaire/my-history') {
    return DEMO_HISTORY_PATIENT as unknown as T;
  }

  // ── GET /questionnaire/history/:id ──────────────────────────────────────
  if (method === 'GET' && /^\/questionnaire\/history\/[^/]+$/.test(path)) {
    return DEMO_HISTORY_DOCTOR as unknown as T;
  }

  // ── GET /questionnaire/today ─────────────────────────────────────────────
  if (method === 'GET' && path === '/questionnaire/today') {
    return { submitted: false } as unknown as T;
  }

  // ── POST /questionnaire/submit ───────────────────────────────────────────
  if (method === 'POST' && path === '/questionnaire/submit') {
    return {
      alertLevel:     'green',
      explanation:    'Vos réponses indiquent que tout se passe bien. Continuez à vous hydrater, prenez vos suppléments et reposez-vous correctement.',
      triggeredRules: [],
    } as unknown as T;
  }

  // ── GET /auth/me ─────────────────────────────────────────────────────────
  if (method === 'GET' && path === '/auth/me') {
    return {
      id:       DEMO_PATIENT_SELF.id,
      role:     'patient',
      fullName: DEMO_PATIENT_SELF.fullName,
      phone:    DEMO_PATIENT_SELF.phone,
    } as unknown as T;
  }

  // ── Fallback : tout autre endpoint → objet vide sans erreur ─────────────
  return {} as T;
}

/**
 * Détecté au runtime via le cookie — fiable même sans variable d'env.
 * Le token 'DEMO_TOKEN' est posé par handleDemoLogin dans login/page.tsx.
 */
export function isDemoMode(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.includes('mc_session=') &&
    decodeURIComponent(document.cookie).includes('"token":"DEMO_TOKEN"');
}
