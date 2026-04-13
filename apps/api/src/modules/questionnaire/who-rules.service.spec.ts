import { WhoRulesService } from './who-rules.service';
import { AlertLevel, QuestionnaireType } from '@mamacare/shared-types';

describe('WhoRulesService', () => {
  let service: WhoRulesService;

  beforeEach(() => {
    service = new WhoRulesService();
  });

  // ===========================================================================
  // GROSSESSE — Alertes ROUGE
  // ===========================================================================

  describe('Grossesse — ROUGE', () => {
    it('Q4: saignements vaginaux → ROUGE', () => {
      const result = service.evaluate({ Q4: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('SAIGNEMENTS_VAGINAUX');
    });

    it('Q2: troubles visuels seuls → ROUGE (prééclampsie)', () => {
      const result = service.evaluate({ Q2: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('TROUBLES_VISUELS');
    });

    it('Q1 + Q2: maux de tête + troubles visuels → ROUGE (prééclampsie confirmée)', () => {
      const result = service.evaluate({ Q1: 'oui', Q2: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('PREECLAMPSIE_CEPHALEES_VISION');
      expect(result.triggeredRules).toContain('TROUBLES_VISUELS');
    });

    it('Q3 forte: douleurs abdominales fortes → ROUGE', () => {
      const result = service.evaluate({ Q3: 'forte' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('DOULEURS_ABDOMINALES_FORTES');
    });

    it('Q3 tres_forte: douleurs abdominales très fortes → ROUGE', () => {
      const result = service.evaluate({ Q3: 'tres_forte' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('DOULEURS_ABDOMINALES_FORTES');
    });

    it('Q7 pas_du_tout: absence mouvements fœtaux (S20) → ROUGE', () => {
      const result = service.evaluate({ Q7: 'pas_du_tout' }, { pregnancyWeek: 20 });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('ABSENCE_MOUVEMENTS_FOETAUX');
    });

    it('Q7 pas_du_tout: ignoré avant S14 → VERT', () => {
      const result = service.evaluate({ Q7: 'pas_du_tout' }, { pregnancyWeek: 10 });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).not.toContain('ABSENCE_MOUVEMENTS_FOETAUX');
    });
  });

  // ===========================================================================
  // GROSSESSE — Alertes ORANGE
  // ===========================================================================

  describe('Grossesse — ORANGE', () => {
    it('Q5: fièvre → ORANGE', () => {
      const result = service.evaluate({ Q5: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('FIEVRE');
    });

    it('Q6 oui_beaucoup: gonflement important → ORANGE', () => {
      const result = service.evaluate({ Q6: 'oui_beaucoup' });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('OEDEME_IMPORTANT');
    });

    it('Q6 un_peu: gonflement léger → VERT (pas d\'alerte)', () => {
      const result = service.evaluate({ Q6: 'un_peu' });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });

    it('Q7 moins_quavant: diminution mouvements fœtaux (S16) → ORANGE', () => {
      const result = service.evaluate({ Q7: 'moins_quavant' }, { pregnancyWeek: 16 });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('DIMINUTION_MOUVEMENTS_FOETAUX');
    });

    it('Q7 moins_quavant: ignoré avant S14 → VERT', () => {
      const result = service.evaluate({ Q7: 'moins_quavant' }, { pregnancyWeek: 12 });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });

    it('Q8 mal: mal-être général → ORANGE', () => {
      const result = service.evaluate({ Q8: 'mal' });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('MAL_ETRE_GENERAL');
    });

    it('Q10 non + 3 jours consécutifs: déshydratation → ORANGE', () => {
      const result = service.evaluate(
        { Q10: 'non' },
        { consecutiveDaysWithoutWater: 3 },
      );
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('DESHYDRATATION_3_JOURS');
    });

    it('Q10 non + seulement 2 jours: pas encore d\'alerte → VERT', () => {
      const result = service.evaluate(
        { Q10: 'non' },
        { consecutiveDaysWithoutWater: 2 },
      );
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });

    it('Q11: difficultés respiratoires → ORANGE', () => {
      const result = service.evaluate({ Q11: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('DIFFICULTES_RESPIRATOIRES');
    });

    it('Q12 souvent le vendredi: anxiété fréquente → ORANGE', () => {
      const result = service.evaluate(
        { Q12: 'souvent' },
        { isWeeklyDay: true },
      );
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('DEPRESSION_ANXIETE_FREQUENTE');
    });

    it('Q12 souvent un autre jour: ignoré → VERT', () => {
      const result = service.evaluate(
        { Q12: 'souvent' },
        { isWeeklyDay: false },
      );
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });

    it('Q13 oui le vendredi: pensées négatives → ORANGE', () => {
      const result = service.evaluate(
        { Q13: 'oui' },
        { isWeeklyDay: true },
      );
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('PENSEES_NEGATIVES');
    });

    it('Q13 oui un autre jour: ignoré → VERT', () => {
      const result = service.evaluate(
        { Q13: 'oui' },
        { isWeeklyDay: false },
      );
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });
  });

  // ===========================================================================
  // GROSSESSE — INFO médecin (reste VERT)
  // ===========================================================================

  describe('Grossesse — INFO (VERT avec règle déclenchée)', () => {
    it('Q9 plus_de_stock: suppléments épuisés → VERT mais règle enregistrée', () => {
      const result = service.evaluate({ Q9: 'plus_de_stock' });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).toContain('SUPPLEMENTS_EPUISES');
    });
  });

  // ===========================================================================
  // GROSSESSE — VERT (aucune alerte)
  // ===========================================================================

  describe('Grossesse — VERT', () => {
    it('toutes les réponses normales → VERT sans règles déclenchées', () => {
      const result = service.evaluate({
        Q1: 'non',
        Q2: 'non',
        Q3: 'non',
        Q4: 'non',
        Q5: 'non',
        Q6: 'non',
        Q7: 'beaucoup',
        Q8: 'bien',
        Q9: 'oui',
        Q10: 'oui',
        Q11: 'non',
        Q12: 'non',
        Q13: 'non',
      }, { pregnancyWeek: 20, isWeeklyDay: true });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).toHaveLength(0);
    });

    it('Q1 oui seul (sans Q2): maux de tête sans trouble visuel → VERT', () => {
      const result = service.evaluate({ Q1: 'oui', Q2: 'non' });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).not.toContain('PREECLAMPSIE_CEPHALEES_VISION');
    });

    it('Q3 legere: douleur légère → VERT', () => {
      const result = service.evaluate({ Q3: 'legere' });
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
    });

    it('réponses vides → VERT sans règles', () => {
      const result = service.evaluate({});
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  // ===========================================================================
  // GROSSESSE — Priorité : ROUGE écrase ORANGE
  // ===========================================================================

  describe('Grossesse — priorité des niveaux', () => {
    it('ROUGE écrase ORANGE quand plusieurs règles déclenchées', () => {
      const result = service.evaluate({
        Q4: 'oui', // ROUGE
        Q5: 'oui', // ORANGE
        Q6: 'oui_beaucoup', // ORANGE
      });
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('SAIGNEMENTS_VAGINAUX');
      expect(result.triggeredRules).toContain('FIEVRE');
      expect(result.triggeredRules).toContain('OEDEME_IMPORTANT');
    });

    it('plusieurs règles ORANGE → reste ORANGE', () => {
      const result = service.evaluate({
        Q5: 'oui',
        Q6: 'oui_beaucoup',
        Q11: 'oui',
      });
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toHaveLength(3);
    });
  });

  // ===========================================================================
  // POST-NATAL — Alertes ROUGE
  // ===========================================================================

  describe('Post-natal — ROUGE', () => {
    const postnatal = { type: QuestionnaireType.POSTNATAL };

    it('N1 non: bébé ne tète pas → ROUGE', () => {
      const result = service.evaluate({ N1: 'non' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('BEBE_NE_TETE_PAS');
    });

    it('N3 oui: bébé chaud (sepsis) → ROUGE', () => {
      const result = service.evaluate({ N3: 'oui' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('FIEVRE_BEBE_SEPSIS');
    });

    it('N4 oui: détresse respiratoire bébé → ROUGE', () => {
      const result = service.evaluate({ N4: 'oui' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('DETRESSE_RESPIRATOIRE_BEBE');
    });

    it('N5 oui J1: jaunisse précoce → ROUGE', () => {
      const result = service.evaluate(
        { N5: 'oui' },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 1 },
      );
      expect(result.alertLevel).toBe(AlertLevel.RED);
      expect(result.triggeredRules).toContain('JAUNISSE_PRECOCE_J1_J3');
    });

    it('N5 oui J2: jaunisse précoce → ROUGE', () => {
      const result = service.evaluate(
        { N5: 'oui' },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 2 },
      );
      expect(result.alertLevel).toBe(AlertLevel.RED);
    });

    it('N5 oui J3: jaunisse précoce → ROUGE', () => {
      const result = service.evaluate(
        { N5: 'oui' },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 3 },
      );
      expect(result.alertLevel).toBe(AlertLevel.RED);
    });
  });

  // ===========================================================================
  // POST-NATAL — Alertes ORANGE
  // ===========================================================================

  describe('Post-natal — ORANGE', () => {
    const postnatal = { type: QuestionnaireType.POSTNATAL };

    it('N1 difficulte: bébé tète avec difficulté → ORANGE', () => {
      const result = service.evaluate({ N1: 'difficulte' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('DIFFICULTE_TETER');
    });

    it('N2 oui: rougeur/écoulement nombril → ORANGE', () => {
      const result = service.evaluate({ N2: 'oui' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('INFECTION_NOMBRIL');
    });

    it('N5 oui J4: jaunisse tardive → ORANGE', () => {
      const result = service.evaluate(
        { N5: 'oui' },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 4 },
      );
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('JAUNISSE_TARDIVE');
    });

    it('N5 oui J10: jaunisse tardive → ORANGE', () => {
      const result = service.evaluate(
        { N5: 'oui' },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 10 },
      );
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
    });

    it('N6 non: pas allaité depuis 6h → ORANGE', () => {
      const result = service.evaluate({ N6: 'non' }, postnatal);
      expect(result.alertLevel).toBe(AlertLevel.ORANGE);
      expect(result.triggeredRules).toContain('ALLAITEMENT_ABSENT_6H');
    });
  });

  // ===========================================================================
  // POST-NATAL — VERT
  // ===========================================================================

  describe('Post-natal — VERT', () => {
    it('toutes les réponses normales → VERT', () => {
      const result = service.evaluate(
        {
          N1: 'oui',
          N2: 'non',
          N3: 'non',
          N4: 'non',
          N5: 'non',
          N6: 'oui',
        },
        { type: QuestionnaireType.POSTNATAL, babyDayOfLife: 5 },
      );
      expect(result.alertLevel).toBe(AlertLevel.GREEN);
      expect(result.triggeredRules).toHaveLength(0);
    });
  });

  // ===========================================================================
  // Typage de retour
  // ===========================================================================

  describe('Structure de retour', () => {
    it('retourne toujours alertLevel et triggeredRules', () => {
      const result = service.evaluate({});
      expect(result).toHaveProperty('alertLevel');
      expect(result).toHaveProperty('triggeredRules');
      expect(Array.isArray(result.triggeredRules)).toBe(true);
    });

    it('type POSTNATAL par défaut si context.type = POSTNATAL', () => {
      const result = service.evaluate(
        { N3: 'oui' },
        { type: QuestionnaireType.POSTNATAL },
      );
      expect(result.alertLevel).toBe(AlertLevel.RED);
    });

    it('type PREGNANCY par défaut si aucun contexte', () => {
      const result = service.evaluate({ Q4: 'oui' });
      expect(result.alertLevel).toBe(AlertLevel.RED);
    });
  });
});
