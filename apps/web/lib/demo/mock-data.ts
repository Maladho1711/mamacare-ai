/**
 * ─── Données de démonstration MamaCare ────────────────────────────────────
 *
 * Toutes les données sont réalistes et en français guinéen.
 * Les dates sont calculées dynamiquement pour toujours être cohérentes.
 */

const DAY = 86_400_000;

function daysAgo(n: number): string {
  return new Date(Date.now() - n * DAY).toISOString();
}

function daysFromNow(n: number): string {
  return new Date(Date.now() + n * DAY).toISOString();
}

// SA → date de début de grossesse = aujourd'hui - (SA * 7 jours)
function pregnancyStartFromSA(sa: number): string {
  return daysAgo(sa * 7);
}

// SA → terme prévu = début + 280 jours (40 SA)
function expectedTermFromSA(sa: number): string {
  return daysFromNow((40 - sa) * 7);
}

// ─── Médecin démo ─────────────────────────────────────────────────────────────

export const DEMO_DOCTOR = {
  id:       'demo-doctor-1',
  fullName: 'Dr. Maladho Barry',
  phone:    '+224 624 12 34 56',
  role:     'doctor' as const,
};

// ─── Patiente démo (connectée côté patient) ───────────────────────────────────

export const DEMO_PATIENT_SELF = {
  id:              'demo-patient-self',
  userId:          'demo-user-patient',
  doctorId:        'demo-doctor-1',
  fullName:        'Aïssatou Diallo',
  phone:           '+224 611 45 67 89',
  pregnancyStart:  pregnancyStartFromSA(24),
  expectedTerm:    expectedTermFromSA(24),
  status:          'pregnant',
  riskLevel:       'green',
  notes:           '',
  createdAt:       daysAgo(45),
  updatedAt:       daysAgo(0),
};

// ─── Liste patientes (vue médecin) ────────────────────────────────────────────

export const DEMO_PATIENTS = [
  {
    id:               'demo-patient-1',
    userId:           null,
    doctorId:         'demo-doctor-1',
    fullName:         'Fatoumata Camara',
    phone:            '+224 622 34 56 78',
    pregnancyStart:   pregnancyStartFromSA(30),
    expectedTerm:     expectedTermFromSA(30),
    status:           'pregnant',
    riskLevel:        'red',
    lastSubmittedAt:  daysAgo(1),
    notes:            'Hypertension artérielle préexistante. Antécédents familiaux de prééclampsie.',
    createdAt:        daysAgo(80),
    updatedAt:        daysAgo(1),
  },
  {
    id:               'demo-patient-2',
    userId:           null,
    doctorId:         'demo-doctor-1',
    fullName:         'Mariama Kouyaté',
    phone:            '+224 655 78 90 12',
    pregnancyStart:   pregnancyStartFromSA(22),
    expectedTerm:     expectedTermFromSA(22),
    status:           'pregnant',
    riskLevel:        'orange',
    lastSubmittedAt:  daysAgo(0),
    notes:            'Première grossesse. Suivie de près pour fièvre récurrente.',
    createdAt:        daysAgo(60),
    updatedAt:        daysAgo(0),
  },
  {
    id:               'demo-patient-3',
    userId:           null,
    doctorId:         'demo-doctor-1',
    fullName:         'Kadiatou Bah',
    phone:            '+224 628 11 22 33',
    pregnancyStart:   pregnancyStartFromSA(14),
    expectedTerm:     expectedTermFromSA(14),
    status:           'pregnant',
    riskLevel:        'green',
    lastSubmittedAt:  daysAgo(2),
    notes:            '',
    createdAt:        daysAgo(30),
    updatedAt:        daysAgo(2),
  },
  {
    id:               'demo-patient-4',
    userId:           null,
    doctorId:         'demo-doctor-1',
    fullName:         'Aminata Soumah',
    phone:            '+224 664 55 44 33',
    pregnancyStart:   pregnancyStartFromSA(38),
    expectedTerm:     daysFromNow(12),
    status:           'postnatal',
    riskLevel:        'green',
    lastSubmittedAt:  daysAgo(0),
    notes:            'Accouchement naturel. Bébé en bonne santé.',
    createdAt:        daysAgo(100),
    updatedAt:        daysAgo(0),
  },
];

// ─── Alertes (vue médecin) ────────────────────────────────────────────────────

export const DEMO_ALERTS = [
  {
    id:            'demo-alert-1',
    patient_id:    'demo-patient-1',
    alert_type:    'red',
    message:       'Fatoumata Camara signale de violents maux de tête accompagnés de troubles visuels (vision floue) depuis ce matin. Ces symptômes associés à son HTA constituent un signe clinique urgent de prééclampsie sévère.',
    whatsapp_sent: true,
    sms_sent:      false,
    resolved_at:   null,
    created_at:    daysAgo(1),
    patient: {
      id:        'demo-patient-1',
      full_name: 'Fatoumata Camara',
      phone:     '+224 622 34 56 78',
    },
  },
  {
    id:            'demo-alert-2',
    patient_id:    'demo-patient-2',
    alert_type:    'orange',
    message:       'Mariama Kouyaté rapporte une fièvre supérieure à 38°C depuis 2 jours, accompagnée de fatigue intense. Une consultation rapide est recommandée pour écarter une infection urinaire ou palustre.',
    whatsapp_sent: true,
    sms_sent:      false,
    resolved_at:   null,
    created_at:    daysAgo(0),
    patient: {
      id:        'demo-patient-2',
      full_name: 'Mariama Kouyaté',
      phone:     '+224 655 78 90 12',
    },
  },
];

// ─── Historique questionnaire (30 jours) ─────────────────────────────────────

function historyEntry(
  daysBack: number,
  level: string,
  rules: string[],
  analysis: string,
): object {
  return {
    submitted_at:    daysAgo(daysBack),
    alert_level:     level,
    ai_analysis:     analysis,
    triggered_rules: rules,
    responses: {
      headache:        rules.includes('SEVERE_HEADACHE') ? 'severe' : 'none',
      visual_changes:  rules.includes('VISUAL_DISTURBANCE') ? 'yes' : 'no',
      fever:           rules.includes('FEVER') ? 'yes' : 'no',
      swelling:        rules.includes('SEVERE_SWELLING') ? 'severe' : 'none',
      fetal_movement:  'normal',
      abdominal_pain:  'none',
      vaginal_bleeding:'none',
      general_feeling: level === 'green' ? 'good' : level === 'orange' ? 'fair' : 'poor',
    },
  };
}

export const DEMO_HISTORY_DOCTOR = [
  historyEntry(1, 'red',    ['SEVERE_HEADACHE', 'VISUAL_DISTURBANCE'],
    'Les symptômes rapportés (maux de tête sévères et troubles visuels) sont des signes d\'alerte majeurs nécessitant une évaluation médicale immédiate, pouvant indiquer une prééclampsie.'),
  historyEntry(4, 'orange', ['FEVER'],
    'Une fièvre modérée est signalée. Bien que non urgente, une consultation médicale dans les 24h est recommandée pour exclure une infection.'),
  historyEntry(8, 'green',  [],
    'Tous les paramètres sont dans la normale. Continuez à bien vous hydrater et reposez-vous suffisamment.'),
  historyEntry(12, 'green', [],
    'Bonne santé générale. Les mouvements foetaux sont normaux.'),
  historyEntry(15, 'orange', ['SEVERE_SWELLING'],
    'Un oedème important aux chevilles est signalé. Il est conseillé de surélever les membres inférieurs et de consulter si cela persiste.'),
  historyEntry(20, 'green', [],
    'Tout va bien. Continuez vos suppléments prénataux.'),
  historyEntry(25, 'green', [],
    'Bonne évolution générale. Prochain rendez-vous dans une semaine.'),
];

export const DEMO_HISTORY_PATIENT = [
  historyEntry(0, 'green',  [],
    'Tout va bien aujourd\'hui. Continuez à prendre soin de vous.'),
  historyEntry(3, 'green',  [],
    'Bonne santé générale. Les mouvements foetaux sont perçus normalement.'),
  historyEntry(7, 'orange', ['FEVER'],
    'Une légère fièvre a été signalée. Buvez beaucoup d\'eau et consultez votre médecin si elle persiste plus de 24h.'),
  historyEntry(10, 'green', [],
    'Récupération complète. Tous les paramètres sont normaux.'),
  historyEntry(14, 'green', [],
    'Très bon suivi. Continuez ainsi.'),
  historyEntry(18, 'green', [],
    'Tout va bien. N\'oubliez pas vos rendez-vous prénataux.'),
];
