/**
 * WHO Rules — port Deno de apps/api/src/modules/questionnaire/who-rules.service.ts
 *
 * ⚠️ RÈGLE DE SÉCURITÉ CRITIQUE — NE JAMAIS MODIFIER SANS VALIDATION MÉDICALE.
 * Logique identique à la version NestJS (évaluée par tests unitaires).
 */

export type AlertLevel = 'green' | 'orange' | 'red';
export type QuestionnaireType = 'pregnancy' | 'postnatal';

export interface EvaluationContext {
  pregnancyWeek?: number;
  type?: QuestionnaireType;
  babyDayOfLife?: number;
  consecutiveDaysWithoutWater?: number;
  isWeeklyDay?: boolean;
}

export interface WhoRuleResult {
  alertLevel: AlertLevel;
  triggeredRules: string[];
}

export function evaluateWhoRules(
  responses: Record<string, string>,
  context: EvaluationContext = {},
): WhoRuleResult {
  const type = context.type ?? 'pregnancy';
  return type === 'postnatal'
    ? evaluatePostnatal(responses, context)
    : evaluatePregnancy(responses, context);
}

function upgradeLevel(current: AlertLevel, next: AlertLevel): AlertLevel {
  if (next === 'red') return 'red';
  if (next === 'orange' && current === 'green') return 'orange';
  return current;
}

function evaluatePregnancy(
  responses: Record<string, string>,
  context: EvaluationContext,
): WhoRuleResult {
  const triggeredRules: string[] = [];
  let alertLevel: AlertLevel = 'green';

  // BLOC 1 — Signes vitaux
  if (responses['Q4'] === 'oui') {
    triggeredRules.push('SAIGNEMENTS_VAGINAUX');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }
  if (responses['Q2'] === 'oui') {
    triggeredRules.push('TROUBLES_VISUELS');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }
  if (responses['Q1'] === 'oui' && responses['Q2'] === 'oui') {
    triggeredRules.push('PREECLAMPSIE_CEPHALEES_VISION');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }
  if (responses['Q3'] === 'forte' || responses['Q3'] === 'tres_forte') {
    triggeredRules.push('DOULEURS_ABDOMINALES_FORTES');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }
  if (responses['Q5'] === 'oui') {
    triggeredRules.push('FIEVRE');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }
  if (responses['Q6'] === 'oui_beaucoup') {
    triggeredRules.push('OEDEME_IMPORTANT');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }

  // BLOC 2 — Mouvements bébé (S >= 14)
  const pregnancyWeek = context.pregnancyWeek ?? 0;
  if (pregnancyWeek >= 14) {
    if (responses['Q7'] === 'pas_du_tout') {
      triggeredRules.push('ABSENCE_MOUVEMENTS_FOETAUX');
      alertLevel = upgradeLevel(alertLevel, 'red');
    } else if (responses['Q7'] === 'moins_quavant') {
      triggeredRules.push('DIMINUTION_MOUVEMENTS_FOETAUX');
      alertLevel = upgradeLevel(alertLevel, 'orange');
    }
  }

  // BLOC 3 — Bien-être général
  if (responses['Q8'] === 'mal') {
    triggeredRules.push('MAL_ETRE_GENERAL');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }
  if (responses['Q9'] === 'plus_de_stock') {
    triggeredRules.push('SUPPLEMENTS_EPUISES');
  }
  const consecutiveDays = context.consecutiveDaysWithoutWater ?? 0;
  if (responses['Q10'] === 'non' && consecutiveDays >= 3) {
    triggeredRules.push('DESHYDRATATION_3_JOURS');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }
  if (responses['Q11'] === 'oui') {
    triggeredRules.push('DIFFICULTES_RESPIRATOIRES');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }

  // BLOC 4 — Santé mentale (vendredi)
  if (context.isWeeklyDay === true) {
    if (responses['Q12'] === 'souvent') {
      triggeredRules.push('DEPRESSION_ANXIETE_FREQUENTE');
      alertLevel = upgradeLevel(alertLevel, 'orange');
    }
    if (responses['Q13'] === 'oui') {
      triggeredRules.push('PENSEES_NEGATIVES');
      alertLevel = upgradeLevel(alertLevel, 'orange');
    }
  }

  return { alertLevel, triggeredRules };
}

function evaluatePostnatal(
  responses: Record<string, string>,
  context: EvaluationContext,
): WhoRuleResult {
  const triggeredRules: string[] = [];
  let alertLevel: AlertLevel = 'green';

  if (responses['N1'] === 'non') {
    triggeredRules.push('BEBE_NE_TETE_PAS');
    alertLevel = upgradeLevel(alertLevel, 'red');
  } else if (responses['N1'] === 'difficulte') {
    triggeredRules.push('DIFFICULTE_TETER');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }

  if (responses['N3'] === 'oui') {
    triggeredRules.push('FIEVRE_BEBE_SEPSIS');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }

  if (responses['N4'] === 'oui') {
    triggeredRules.push('DETRESSE_RESPIRATOIRE_BEBE');
    alertLevel = upgradeLevel(alertLevel, 'red');
  }

  if (responses['N5'] === 'oui') {
    const dayOfLife = context.babyDayOfLife ?? 0;
    if (dayOfLife >= 1 && dayOfLife <= 3) {
      triggeredRules.push('JAUNISSE_PRECOCE_J1_J3');
      alertLevel = upgradeLevel(alertLevel, 'red');
    } else if (dayOfLife > 3) {
      triggeredRules.push('JAUNISSE_TARDIVE');
      alertLevel = upgradeLevel(alertLevel, 'orange');
    }
  }

  if (responses['N2'] === 'oui') {
    triggeredRules.push('INFECTION_NOMBRIL');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }

  if (responses['N6'] === 'non') {
    triggeredRules.push('ALLAITEMENT_ABSENT_6H');
    alertLevel = upgradeLevel(alertLevel, 'orange');
  }

  return { alertLevel, triggeredRules };
}
