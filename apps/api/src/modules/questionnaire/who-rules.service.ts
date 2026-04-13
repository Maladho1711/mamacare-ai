import { Injectable } from '@nestjs/common';
import { AlertLevel, QuestionnaireType } from '@mamacare/shared-types';
import type { IWhoRuleResult } from '@mamacare/shared-types';

/**
 * Contexte supplémentaire nécessaire pour certaines règles OMS.
 * Ces données doivent être calculées par QuestionnaireService avant l'appel.
 */
export interface IEvaluationContext {
  /** Semaine de grossesse (pour activer les questions bébé à partir de S14) */
  pregnancyWeek?: number;
  /** Type de questionnaire : grossesse ou post-natal */
  type?: QuestionnaireType;
  /** Jour de vie du bébé — pour la règle jaunisse J1-J3 (post-natal) */
  babyDayOfLife?: number;
  /**
   * Nombre total de jours consécutifs (aujourd'hui inclus) où Q10 = 'non'.
   * Calculé par QuestionnaireService à partir de l'historique Supabase.
   * Règle déclenchée si >= 3.
   */
  consecutiveDaysWithoutWater?: number;
  /** true si aujourd'hui est vendredi — active les questions santé mentale Q12/Q13 */
  isWeeklyDay?: boolean;
}

/**
 * RÈGLE DE SÉCURITÉ CRITIQUE — NE JAMAIS MODIFIER SANS VALIDATION MÉDICALE.
 *
 * Ce service implémente les règles OMS statiques pour la détection des signes
 * de danger maternels et néonataux. Claude API ne doit JAMAIS prendre ces
 * décisions — il génère uniquement les messages explicatifs.
 *
 * Source : PRD.md section 5 — Questionnaires & Règles Médicales OMS
 */
@Injectable()
export class WhoRulesService {
  evaluate(
    responses: Record<string, string>,
    context: IEvaluationContext = {},
  ): IWhoRuleResult {
    const type = context.type ?? QuestionnaireType.PREGNANCY;

    if (type === QuestionnaireType.POSTNATAL) {
      return this.evaluatePostnatal(responses, context);
    }
    return this.evaluatePregnancy(responses, context);
  }

  // ---------------------------------------------------------------------------
  // Questionnaire GROSSESSE
  // ---------------------------------------------------------------------------

  private evaluatePregnancy(
    responses: Record<string, string>,
    context: IEvaluationContext,
  ): IWhoRuleResult {
    const triggeredRules: string[] = [];
    let alertLevel = AlertLevel.GREEN;

    const upgrade = (level: AlertLevel) => {
      if (level === AlertLevel.RED) {
        alertLevel = AlertLevel.RED;
      } else if (level === AlertLevel.ORANGE && alertLevel === AlertLevel.GREEN) {
        alertLevel = AlertLevel.ORANGE;
      }
    };

    // ── BLOC 1 — Signes vitaux (tous trimestres) ─────────────────────────────

    // Q4 — Saignements vaginaux → ROUGE immédiat
    if (responses['Q4'] === 'oui') {
      triggeredRules.push('SAIGNEMENTS_VAGINAUX');
      upgrade(AlertLevel.RED);
    }

    // Q2 — Troubles visuels seuls → ROUGE (signe prééclampsie)
    if (responses['Q2'] === 'oui') {
      triggeredRules.push('TROUBLES_VISUELS');
      upgrade(AlertLevel.RED);
    }

    // Q1 + Q2 — Maux de tête + troubles visuels → ROUGE (prééclampsie confirmée)
    if (responses['Q1'] === 'oui' && responses['Q2'] === 'oui') {
      triggeredRules.push('PREECLAMPSIE_CEPHALEES_VISION');
      upgrade(AlertLevel.RED);
    }

    // Q3 — Douleurs abdominales fortes ou très fortes → ROUGE
    if (responses['Q3'] === 'forte' || responses['Q3'] === 'tres_forte') {
      triggeredRules.push('DOULEURS_ABDOMINALES_FORTES');
      upgrade(AlertLevel.RED);
    }

    // Q5 — Fièvre → ORANGE
    if (responses['Q5'] === 'oui') {
      triggeredRules.push('FIEVRE');
      upgrade(AlertLevel.ORANGE);
    }

    // Q6 — Gonflement important visage/mains/pieds → ORANGE
    if (responses['Q6'] === 'oui_beaucoup') {
      triggeredRules.push('OEDEME_IMPORTANT');
      upgrade(AlertLevel.ORANGE);
    }

    // ── BLOC 2 — Mouvements bébé (2e et 3e trimestre uniquement, S >= 14) ───

    const pregnancyWeek = context.pregnancyWeek ?? 0;
    if (pregnancyWeek >= 14) {
      if (responses['Q7'] === 'pas_du_tout') {
        triggeredRules.push('ABSENCE_MOUVEMENTS_FOETAUX');
        upgrade(AlertLevel.RED);
      } else if (responses['Q7'] === 'moins_quavant') {
        triggeredRules.push('DIMINUTION_MOUVEMENTS_FOETAUX');
        upgrade(AlertLevel.ORANGE);
      }
    }

    // ── BLOC 3 — Bien-être général (tous trimestres) ─────────────────────────

    // Q8 — Ressenti général mauvais → ORANGE
    if (responses['Q8'] === 'mal') {
      triggeredRules.push('MAL_ETRE_GENERAL');
      upgrade(AlertLevel.ORANGE);
    }

    // Q9 — Plus de suppléments (fer, acide folique) → INFO médecin (vert)
    if (responses['Q9'] === 'plus_de_stock') {
      triggeredRules.push('SUPPLEMENTS_EPUISES');
      // Niveau reste VERT — information transmise au médecin via triggered_rules
    }

    // Q10 — Pas bu suffisamment d'eau 3 jours consécutifs → ORANGE
    const consecutiveDays = context.consecutiveDaysWithoutWater ?? 0;
    if (responses['Q10'] === 'non' && consecutiveDays >= 3) {
      triggeredRules.push('DESHYDRATATION_3_JOURS');
      upgrade(AlertLevel.ORANGE);
    }

    // Q11 — Difficultés respiratoires → ORANGE
    if (responses['Q11'] === 'oui') {
      triggeredRules.push('DIFFICULTES_RESPIRATOIRES');
      upgrade(AlertLevel.ORANGE);
    }

    // ── BLOC 4 — Santé mentale (vendredi uniquement) ─────────────────────────

    if (context.isWeeklyDay === true) {
      // Q12 — Tristesse/anxiété fréquente cette semaine → ORANGE
      if (responses['Q12'] === 'souvent') {
        triggeredRules.push('DEPRESSION_ANXIETE_FREQUENTE');
        upgrade(AlertLevel.ORANGE);
      }

      // Q13 — Pensées négatives → ORANGE
      if (responses['Q13'] === 'oui') {
        triggeredRules.push('PENSEES_NEGATIVES');
        upgrade(AlertLevel.ORANGE);
      }
    }

    return { alertLevel, triggeredRules };
  }

  // ---------------------------------------------------------------------------
  // Questionnaire POST-NATAL (J1 à J28)
  // ---------------------------------------------------------------------------

  private evaluatePostnatal(
    responses: Record<string, string>,
    context: IEvaluationContext,
  ): IWhoRuleResult {
    const triggeredRules: string[] = [];
    let alertLevel = AlertLevel.GREEN;

    const upgrade = (level: AlertLevel) => {
      if (level === AlertLevel.RED) {
        alertLevel = AlertLevel.RED;
      } else if (level === AlertLevel.ORANGE && alertLevel === AlertLevel.GREEN) {
        alertLevel = AlertLevel.ORANGE;
      }
    };

    // N1 — Allaitement : bébé ne tète pas → ROUGE / difficulté → ORANGE
    if (responses['N1'] === 'non') {
      triggeredRules.push('BEBE_NE_TETE_PAS');
      upgrade(AlertLevel.RED);
    } else if (responses['N1'] === 'difficulte') {
      triggeredRules.push('DIFFICULTE_TETER');
      upgrade(AlertLevel.ORANGE);
    }

    // N3 — Bébé chaud au toucher → ROUGE (suspicion sepsis néonatal)
    if (responses['N3'] === 'oui') {
      triggeredRules.push('FIEVRE_BEBE_SEPSIS');
      upgrade(AlertLevel.RED);
    }

    // N4 — Difficultés respiratoires bébé → ROUGE immédiat
    if (responses['N4'] === 'oui') {
      triggeredRules.push('DETRESSE_RESPIRATOIRE_BEBE');
      upgrade(AlertLevel.RED);
    }

    // N5 — Jaunisse J1-J3 → ROUGE / après J3 → ORANGE (moins urgente)
    if (responses['N5'] === 'oui') {
      const dayOfLife = context.babyDayOfLife ?? 0;
      if (dayOfLife >= 1 && dayOfLife <= 3) {
        triggeredRules.push('JAUNISSE_PRECOCE_J1_J3');
        upgrade(AlertLevel.RED);
      } else if (dayOfLife > 3) {
        triggeredRules.push('JAUNISSE_TARDIVE');
        upgrade(AlertLevel.ORANGE);
      }
    }

    // N2 — Rougeur ou écoulement nombril → ORANGE (infection ombilicale)
    if (responses['N2'] === 'oui') {
      triggeredRules.push('INFECTION_NOMBRIL');
      upgrade(AlertLevel.ORANGE);
    }

    // N6 — Pas allaité dans les 6 dernières heures → ORANGE
    if (responses['N6'] === 'non') {
      triggeredRules.push('ALLAITEMENT_ABSENT_6H');
      upgrade(AlertLevel.ORANGE);
    }

    return { alertLevel, triggeredRules };
  }
}
