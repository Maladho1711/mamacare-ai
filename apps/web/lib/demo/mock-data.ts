/**
 * --- Données de démonstration MamaCare ------------------------------------
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

// --- Médecin démo -------------------------------------------------------------

export const DEMO_DOCTOR = {
  id:       'demo-doctor-1',
  fullName: 'Dr. Maladho Barry',
  phone:    '+224 624 12 34 56',
  role:     'doctor' as const,
};

// --- Administrateur démo (fondateur / superviseur plateforme) -----------------

export const DEMO_ADMIN = {
  id:       'demo-admin-1',
  fullName: 'Maladho Barry',
  phone:    '+224 623 43 65 13',
  role:     'admin' as const,
};

/** Liste de tous les médecins sur la plateforme — vue admin. */
export const DEMO_ALL_DOCTORS = [
  {
    id:             'demo-doctor-1',
    fullName:       'Dr. Maladho Barry',
    phone:          '+224 624 12 34 56',
    hospital:       'CS de Pita',
    patientsCount:  4,
    activeAlerts:   2,
    createdAt:      daysAgo(120),
    lastActive:     daysAgo(0),
  },
  {
    id:             'demo-doctor-2',
    fullName:       'Dr. Aïssatou Camara',
    phone:          '+224 628 45 67 89',
    hospital:       'Hôpital Ignace Deen',
    patientsCount:  12,
    activeAlerts:   5,
    createdAt:      daysAgo(95),
    lastActive:     daysAgo(1),
  },
  {
    id:             'demo-doctor-3',
    fullName:       'Dr. Mamadou Diallo',
    phone:          '+224 625 78 90 12',
    hospital:       'CHU Donka',
    patientsCount:  8,
    activeAlerts:   1,
    createdAt:      daysAgo(60),
    lastActive:     daysAgo(0),
  },
  {
    id:             'demo-doctor-4',
    fullName:       'Dr. Fatoumata Bah',
    phone:          '+224 629 34 56 78',
    hospital:       'Clinique Pasteur',
    patientsCount:  6,
    activeAlerts:   0,
    createdAt:      daysAgo(30),
    lastActive:     daysAgo(2),
  },
];

/** Stats globales de la plateforme — vue admin. */
export const DEMO_ADMIN_STATS = {
  totalDoctors:     4,
  totalPatients:    30,
  activeAlerts:     8,
  questionnairesToday: 22,
  complianceRate:   73, // % de patientes ayant rempli aujourd'hui
  redAlertsWeek:    3,
  orangeAlertsWeek: 12,
  newPatientsWeek:  5,
};

// --- Patiente démo (connectée côté patient) -----------------------------------

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

// --- Liste patientes (vue médecin) --------------------------------------------

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

// --- Alertes (vue médecin) ----------------------------------------------------

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

// --- Historique questionnaire (30 jours) -------------------------------------

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

// --- Rendez-vous démo (5 RDV répartis passé + à venir) -----------------------

function apptAt(hoursFromNow: number): string {
  return new Date(Date.now() + hoursFromNow * 3_600_000).toISOString();
}

export const DEMO_APPOINTMENTS = [
  {
    id:          'demo-appt-1',
    patientId:   'demo-patient-1',
    doctorId:    DEMO_DOCTOR.id,
    type:        'cpn' as const,
    title:       'CPN 3 — Mesure TA, poids, hauteur utérine',
    description: 'Consultation prénatale trimestrielle',
    scheduledAt: apptAt(4), // dans 4h
    location:    'CS de Pita',
    status:      'scheduled' as const,
    notes:       null,
  },
  {
    id:          'demo-appt-2',
    patientId:   'demo-patient-2',
    doctorId:    DEMO_DOCTOR.id,
    type:        'ultrasound' as const,
    title:       'Échographie morphologique',
    description: 'T2 — contrôle développement foetal',
    scheduledAt: apptAt(26), // demain
    location:    'Hôpital Ignace Deen',
    status:      'scheduled' as const,
    notes:       null,
  },
  {
    id:          'demo-appt-3',
    patientId:   'demo-patient-1',
    doctorId:    DEMO_DOCTOR.id,
    type:        'vaccination' as const,
    title:       'Vaccin antitétanique — 2ème dose',
    description: null,
    scheduledAt: apptAt(72), // dans 3j
    location:    'CS de Pita',
    status:      'scheduled' as const,
    notes:       null,
  },
  {
    id:          'demo-appt-4',
    patientId:   'demo-patient-3',
    doctorId:    DEMO_DOCTOR.id,
    type:        'consultation' as const,
    title:       'Suivi post-natal — 6 semaines',
    description: 'Contrôle récupération + allaitement',
    scheduledAt: apptAt(120), // dans 5j
    location:    'Cabinet Dr. Barry',
    status:      'scheduled' as const,
    notes:       null,
  },
  {
    id:          'demo-appt-5',
    patientId:   'demo-patient-1',
    doctorId:    DEMO_DOCTOR.id,
    type:        'cpn' as const,
    title:       'CPN 2',
    description: null,
    scheduledAt: apptAt(-48), // il y a 2 jours
    location:    'CS de Pita',
    status:      'completed' as const,
    notes:       'Tout va bien. TA : 110/70. Poids : 62 kg (+1kg).',
  },
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
