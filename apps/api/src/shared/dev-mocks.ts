/**
 * ─── Dev Mocks — Données fictives pour le mode démo ──────────────────────────
 *
 * Ces constantes sont retournées par les services quand isDevMode() === true.
 * Évite tout appel à Supabase / Anthropic / WhatsApp / SMS en mode test.
 */

import { AlertLevel, IPatient, PatientStatus } from '@mamacare/shared-types';
import { DEV_PROFILES } from './dev-mode';

// ─── Types internes ──────────────────────────────────────────────────────────

export type DevAlertRow = {
  id: string;
  patient_id: string;
  response_id: string | null;
  alert_type: AlertLevel;
  message: string;
  whatsapp_sent: boolean;
  whatsapp_at: string | null;
  sms_sent: boolean;
  sms_at: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
  patient: {
    id: string;
    full_name: string;
    phone: string;
  };
};

const now = Date.now();
const day = 24 * 60 * 60 * 1000;
const week = 7 * day;

function iso(offsetMs: number): string {
  return new Date(now + offsetMs).toISOString();
}
function isoDate(offsetMs: number): string {
  return new Date(now + offsetMs).toISOString().split('T')[0] ?? '';
}

// ─── Patientes fictives ──────────────────────────────────────────────────────

export const DEV_PATIENTS: IPatient[] = [
  {
    id:              DEV_PROFILES.patient.sub,
    userId:          DEV_PROFILES.patient.sub,
    doctorId:        DEV_PROFILES.doctor.sub,
    fullName:        DEV_PROFILES.patient.full_name,
    phone:           DEV_PROFILES.patient.phone,
    pregnancyStart:  new Date(now - 20 * week),
    expectedTerm:    new Date(now + 20 * week),
    status:          PatientStatus.PREGNANT,
    riskLevel:       AlertLevel.GREEN,
    notes:           undefined,
    createdAt:       new Date(now - 20 * week),
    updatedAt:       new Date(now - 1 * day),
  },
  {
    id:              'dev-patient-002',
    userId:          'dev-patient-002',
    doctorId:        DEV_PROFILES.doctor.sub,
    fullName:        'Fatoumata Camara (TEST)',
    phone:           '+224620000002',
    pregnancyStart:  new Date(now - 28 * week),
    expectedTerm:    new Date(now + 12 * week),
    status:          PatientStatus.PREGNANT,
    riskLevel:       AlertLevel.ORANGE,
    notes:           'Gonflement des pieds signalé lundi',
    createdAt:       new Date(now - 28 * week),
    updatedAt:       new Date(now - 2 * day),
  },
  {
    id:              'dev-patient-003',
    userId:          'dev-patient-003',
    doctorId:        DEV_PROFILES.doctor.sub,
    fullName:        'Mariama Bah (TEST)',
    phone:           '+224630000003',
    pregnancyStart:  new Date(now - 32 * week),
    expectedTerm:    new Date(now + 8 * week),
    status:          PatientStatus.PREGNANT,
    riskLevel:       AlertLevel.RED,
    notes:           'Antécédent de prééclampsie',
    createdAt:       new Date(now - 32 * week),
    updatedAt:       new Date(now - 1 * day),
  },
];

// ─── Historique questionnaire (30 jours) ─────────────────────────────────────

export function buildDevHistory(patientId: string) {
  // Génère 15 entrées sur 30 jours pour une patiente donnée
  return Array.from({ length: 15 }, (_, i) => {
    const offset = -(i * 2 + 1) * day;
    const levelIdx = i % 7 === 0 ? 2 : i % 3 === 0 ? 1 : 0;
    const level = [AlertLevel.GREEN, AlertLevel.ORANGE, AlertLevel.RED][levelIdx];
    return {
      id:              `dev-resp-${patientId}-${i}`,
      type:            'pregnancy',
      responses:       { Q1: 'non', Q2: 'non', Q3: 'non' },
      alert_level:     level,
      triggered_rules: level === AlertLevel.GREEN ? [] : ['Symptômes à surveiller'],
      ai_analysis:     level === AlertLevel.GREEN
        ? 'Tout semble bien. Continuez votre suivi quotidien.'
        : 'Certains symptômes nécessitent une attention. Contactez votre médecin.',
      submitted_at:    iso(offset),
    };
  });
}

// ─── Alertes fictives ────────────────────────────────────────────────────────

export const DEV_ALERTS: DevAlertRow[] = [
  {
    id:            'dev-alert-001',
    patient_id:    'dev-patient-003',
    response_id:   'dev-resp-dev-patient-003-0',
    alert_type:    AlertLevel.RED,
    message:       'URGENCE : saignements vaginaux signalés + maux de tête intenses',
    whatsapp_sent: true,
    whatsapp_at:   iso(-2 * 60 * 60 * 1000), // il y a 2h
    sms_sent:      false,
    sms_at:        null,
    resolved_by:   null,
    resolved_at:   null,
    created_at:    iso(-2 * 60 * 60 * 1000),
    patient: {
      id:        'dev-patient-003',
      full_name: 'Mariama Bah (TEST)',
      phone:     '+224630000003',
    },
  },
  {
    id:            'dev-alert-002',
    patient_id:    'dev-patient-002',
    response_id:   'dev-resp-dev-patient-002-0',
    alert_type:    AlertLevel.ORANGE,
    message:       'Gonflement important des pieds et chevilles',
    whatsapp_sent: true,
    whatsapp_at:   iso(-1 * day),
    sms_sent:      false,
    sms_at:        null,
    resolved_by:   null,
    resolved_at:   null,
    created_at:    iso(-1 * day),
    patient: {
      id:        'dev-patient-002',
      full_name: 'Fatoumata Camara (TEST)',
      phone:     '+224620000002',
    },
  },
];

// ─── Helpers exportés pour les stats ─────────────────────────────────────────

export const DEV_MOCK_STATS = {
  totalPatients: DEV_PATIENTS.length,
  redCount:      DEV_PATIENTS.filter((p) => p.riskLevel === AlertLevel.RED).length,
  orangeCount:   DEV_PATIENTS.filter((p) => p.riskLevel === AlertLevel.ORANGE).length,
};

// Force l'utilisation des helpers iso/isoDate pour éviter les warnings
void isoDate;
