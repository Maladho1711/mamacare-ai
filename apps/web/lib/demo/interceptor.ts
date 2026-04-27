/**
 * --- Intercepteur API — Mode Démo --------------------------------------------
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
 *   PATCH /patients/:id/archive       → archiver une patiente (simulé)
 *   PATCH /patients/:id/reactivate    → réactiver une patiente (simulé)
 *   GET  /patients/:id/summary        → résumé IA 7 jours (simulé)
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
  DEMO_APPOINTMENTS,
} from './mock-data';

// Alerts state mutable pour simuler la résolution
type AlertState = Omit<(typeof DEMO_ALERTS)[number], 'resolved_at'> & { resolved_at: string | null };
let alertsState: AlertState[] = DEMO_ALERTS.map((a) => ({ ...a }));

// Appointments state mutable pour simuler create/update/delete
// Type relâché pour permettre null dans description/location/notes à la création
interface AppointmentState {
  id: string;
  patientId: string;
  doctorId: string;
  type: 'cpn' | 'vaccination' | 'ultrasound' | 'consultation' | 'postnatal';
  title: string;
  description: string | null;
  scheduledAt: string;
  location: string | null;
  status: 'scheduled' | 'completed' | 'missed' | 'cancelled';
  notes: string | null;
}
let appointmentsState: AppointmentState[] = DEMO_APPOINTMENTS.map((a) => ({ ...a }));

export function getDemoResponse<T>(rawPath: string, method: string): T {
  // Strip query string — '/appointments?from=X&to=Y' → '/appointments'
  const path = rawPath.split('?')[0];
  // -- GET /patients --------------------------------------------------------
  if (method === 'GET' && path === '/patients') {
    return DEMO_PATIENTS as unknown as T;
  }

  // -- GET /patients/me -----------------------------------------------------
  if (method === 'GET' && path === '/patients/me') {
    return DEMO_PATIENT_SELF as unknown as T;
  }

  // -- GET /patients/me/doctor ----------------------------------------------
  if (method === 'GET' && path === '/patients/me/doctor') {
    return { fullName: 'Dr. Maladho Barry', phone: DEMO_DOCTOR.phone } as unknown as T;
  }

  // -- GET /patients/:id ----------------------------------------------------
  const patientMatch = path.match(/^\/patients\/([^/]+)$/);
  if (method === 'GET' && patientMatch) {
    const id = patientMatch[1];
    const patient =
      DEMO_PATIENTS.find((p) => p.id === id) ??
      DEMO_PATIENTS[0]!;
    return patient as unknown as T;
  }

  // -- POST /patients -------------------------------------------------------
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

  // -- PATCH /patients/:id -------------------------------------------------
  if (method === 'PATCH' && patientMatch) {
    const id = patientMatch[1];
    const patient = DEMO_PATIENTS.find((p) => p.id === id) ?? DEMO_PATIENTS[0]!;
    return { ...patient, updatedAt: new Date().toISOString() } as unknown as T;
  }

  // -- PATCH /patients/:id/archive -----------------------------------------
  const patientArchiveMatch = path.match(/^\/patients\/([^/]+)\/archive$/);
  if (method === 'PATCH' && patientArchiveMatch) {
    return {} as T;
  }

  // -- PATCH /patients/:id/reactivate --------------------------------------
  const patientReactivateMatch = path.match(/^\/patients\/([^/]+)\/reactivate$/);
  if (method === 'PATCH' && patientReactivateMatch) {
    return {} as T;
  }

  // -- GET /patients/:id/summary --------------------------------------------
  const patientSummaryMatch = path.match(/^\/patients\/([^/]+)\/summary$/);
  if (method === 'GET' && patientSummaryMatch) {
    return {
      summary:     'Sur les 7 derniers jours, la patiente présente une évolution globalement stable. Un épisode de niveau orange a été relevé (fièvre modérée), suivi d\'un retour à un état normal. Aucun signe d\'alerte rouge n\'a été signalé. La compliance au questionnaire quotidien est bonne. Continuez la surveillance habituelle.',
      generatedAt: new Date().toISOString(),
      cached:      false,
    } as unknown as T;
  }

  // -- GET /alerts ----------------------------------------------------------
  if (method === 'GET' && path === '/alerts') {
    return alertsState as unknown as T;
  }

  // -- PATCH /alerts/:id/resolve --------------------------------------------
  const alertResolveMatch = path.match(/^\/alerts\/([^/]+)\/resolve$/);
  if (method === 'PATCH' && alertResolveMatch) {
    const id = alertResolveMatch[1];
    alertsState = alertsState.map((a) =>
      a.id === id ? { ...a, resolved_at: new Date().toISOString() } : a,
    );
    return {} as T;
  }

  // -- GET /questionnaire/my-history ----------------------------------------
  if (method === 'GET' && path === '/questionnaire/my-history') {
    return DEMO_HISTORY_PATIENT as unknown as T;
  }

  // -- GET /questionnaire/history/:id --------------------------------------
  if (method === 'GET' && /^\/questionnaire\/history\/[^/]+$/.test(path)) {
    return DEMO_HISTORY_DOCTOR as unknown as T;
  }

  // -- GET /questionnaire/today ---------------------------------------------
  if (method === 'GET' && path === '/questionnaire/today') {
    return { submitted: false } as unknown as T;
  }

  // -- POST /questionnaire/submit -------------------------------------------
  if (method === 'POST' && path === '/questionnaire/submit') {
    return {
      alertLevel:     'green',
      explanation:    'Vos réponses indiquent que tout se passe bien. Continuez à vous hydrater, prenez vos suppléments et reposez-vous correctement.',
      triggeredRules: [],
    } as unknown as T;
  }

  // -- GET /auth/me ---------------------------------------------------------
  if (method === 'GET' && path === '/auth/me') {
    return {
      id:       DEMO_PATIENT_SELF.id,
      role:     'patient',
      fullName: DEMO_PATIENT_SELF.fullName,
      phone:    DEMO_PATIENT_SELF.phone,
    } as unknown as T;
  }

  // ═══ APPOINTMENTS ═════════════════════════════════════════════════════════

  // -- GET /appointments (avec query from/to filtrage) ---------------------
  if (method === 'GET' && path === '/appointments') {
    return appointmentsState as unknown as T;
  }

  // -- POST /appointments --------------------------------------------------
  if (method === 'POST' && path === '/appointments') {
    const newAppt: AppointmentState = {
      id:          `demo-appt-${Date.now()}`,
      patientId:   DEMO_PATIENTS[0]!.id,
      doctorId:    DEMO_DOCTOR.id,
      type:        'cpn',
      title:       'Nouveau rendez-vous',
      description: null,
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
      location:    null,
      status:      'scheduled',
      notes:       null,
    };
    appointmentsState = [...appointmentsState, newAppt];
    return newAppt as unknown as T;
  }

  // -- PATCH /appointments/:id ---------------------------------------------
  const apptMatch = path.match(/^\/appointments\/([^/]+)$/);
  if (method === 'PATCH' && apptMatch) {
    const id = apptMatch[1];
    appointmentsState = appointmentsState.map((a) =>
      a.id === id ? { ...a, status: 'completed' as const } : a,
    );
    return (appointmentsState.find((a) => a.id === id) ?? appointmentsState[0]!) as unknown as T;
  }

  // -- DELETE /appointments/:id --------------------------------------------
  if (method === 'DELETE' && apptMatch) {
    const id = apptMatch[1];
    appointmentsState = appointmentsState.filter((a) => a.id !== id);
    return {} as T;
  }

  // -- Fallback : tout autre endpoint → tableau vide si GET, objet vide sinon
  // (évite les crashs .filter/.map sur les endpoints non mockés)
  if (method === 'GET') return [] as unknown as T;
  return {} as T;
}

/**
 * Mode démo désactivé en production réelle.
 * Plus aucun bouton démo n'est exposé sur /login depuis avril 2026 — toutes les
 * connexions passent par le vrai flux OTP. L'intercepteur reste dans le code
 * pour pouvoir réactiver le mode démo en dev (NEXT_PUBLIC_DEMO_MODE=true).
 */
export function isDemoMode(): boolean {
  if (typeof document === 'undefined') return false;
  // Activable uniquement en dev local avec env var explicite
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== 'true') return false;
  return document.cookie.includes('mc_session=') &&
    decodeURIComponent(document.cookie).includes('"token":"DEMO_TOKEN"');
}
