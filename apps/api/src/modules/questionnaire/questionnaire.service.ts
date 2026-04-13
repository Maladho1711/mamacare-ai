import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { AlertLevel, QuestionnaireType } from '@mamacare/shared-types';
import { SupabaseService } from '../../shared/supabase/supabase.service';
import { isDevMode } from '../../shared/dev-mode';
import { buildDevHistory } from '../../shared/dev-mocks';
import { AlertsService } from '../alerts/alerts.service';
import { AiService } from '../ai/ai.service';
import { PatientsService } from '../patients/patients.service';
import { WhoRulesService, IEvaluationContext } from './who-rules.service';
import { SubmitQuestionnaireDto } from './dto/submit-questionnaire.dto';

type QuestionnaireRow = {
  id: string;
  patient_id: string;
  type: string;
  responses: Record<string, string>;
  alert_level: string;
  triggered_rules: string[];
  ai_analysis: string | null;
  submitted_at: string;
};

export interface SubmitResult {
  alertLevel: AlertLevel;
  triggeredRules: string[];
  explanation: string;
}

@Injectable()
export class QuestionnaireService {
  constructor(
    private readonly supabase: SupabaseService,
    private readonly whoRules: WhoRulesService,
    private readonly alerts: AlertsService,
    private readonly ai: AiService,
    private readonly patients: PatientsService,
  ) {}

  /**
   * ORDRE IMPÉRATIF — CLAUDE.md + PRD F02/F03.
   * Ne jamais inverser les étapes a → g.
   *
   * a. Vérifier questionnaire déjà soumis → 400 si oui
   * b. WHO rules (statiques) → alertLevel + triggeredRules
   * c. triggerAlert() AVANT Claude si RED ou ORANGE
   * d. Claude → explanation
   * e. INSERT questionnaire_responses
   * f. Lier responseId à l'alerte créée en c
   * g. updateRiskLevel patient
   * h. Retourner { alertLevel, triggeredRules, explanation }
   */
  async submit(patientId: string, dto: SubmitQuestionnaireDto): Promise<SubmitResult> {
    // ── Mode DEV : évaluation WHO locale + pas d'INSERT ──────────────────────
    if (isDevMode()) {
      const context: IEvaluationContext = {
        pregnancyWeek:               dto.pregnancyWeek,
        type:                        dto.type,
        babyDayOfLife:               dto.babyDayOfLife,
        consecutiveDaysWithoutWater: dto.responses['Q10'] === 'non' ? 1 : 0,
        isWeeklyDay:                 new Date().getDay() === 5,
      };
      const { alertLevel, triggeredRules } = this.whoRules.evaluate(dto.responses, context);
      return {
        alertLevel,
        triggeredRules,
        explanation: this.buildDevExplanation(alertLevel, triggeredRules),
      };
    }

    // ── a. Vérifier soumission du jour ───────────────────────────────────────
    const alreadySubmitted = await this.checkAlreadySubmittedToday(patientId);
    if (alreadySubmitted) {
      throw new BadRequestException(
        'Questionnaire déjà soumis aujourd\'hui. Revenez demain.',
      );
    }

    // ── b. Règles OMS statiques ──────────────────────────────────────────────
    const consecutiveDaysWithoutWater =
      await this.getConsecutiveDaysWithoutWater(patientId, dto.responses);

    const context: IEvaluationContext = {
      pregnancyWeek: dto.pregnancyWeek,
      type: dto.type,
      babyDayOfLife: dto.babyDayOfLife,
      consecutiveDaysWithoutWater,
      isWeeklyDay: new Date().getDay() === 5, // 5 = vendredi
    };

    const { alertLevel, triggeredRules } = this.whoRules.evaluate(
      dto.responses,
      context,
    );

    // ── c. Alerte AVANT Claude (ordre CLAUDE.md Règle 2) ────────────────────
    let alertId: string | null = null;

    if (alertLevel === AlertLevel.RED || alertLevel === AlertLevel.ORANGE) {
      const notifMessage = this.buildNotificationMessage(alertLevel, triggeredRules);
      alertId = await this.alerts.triggerAlert(
        patientId,
        null, // responseId inconnu à ce stade — mis à jour en étape f
        alertLevel,
        notifMessage,
      );
    }

    // ── d. Claude API → explication en français ──────────────────────────────
    const explanation = await this.ai.generateExplanation(
      dto.responses,
      alertLevel,
      triggeredRules,
    );

    // ── e. INSERT questionnaire_responses ────────────────────────────────────
    const { data: response, error: insertError } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .insert({
        patient_id: patientId,
        type: dto.type,
        responses: dto.responses,
        alert_level: alertLevel,
        triggered_rules: triggeredRules,
        ai_analysis: explanation,
      })
      .select()
      .single();

    if (insertError || !response) {
      throw new InternalServerErrorException(
        'Erreur lors de l\'enregistrement du questionnaire',
      );
    }

    const responseId = (response as QuestionnaireRow).id;

    // ── f + g. En parallèle : lier l'alerte ET mettre à jour le risque patient
    // Les deux sont indépendants → Promise.all divise la latence par ~2
    await Promise.all([
      alertId
        ? this.supabase.getClient().from('alerts').update({ response_id: responseId }).eq('id', alertId)
        : Promise.resolve(),
      this.patients.updateRiskLevel(patientId, alertLevel),
    ]);

    // ── h. Résultat pour l'écran "Résultat immédiat" (PRD F03) ───────────────
    return { alertLevel, triggeredRules, explanation };
  }

  /** Historique 30 jours de la patiente elle-même (route /my-history). */
  async getMyHistory(patientId: string) {
    if (isDevMode()) {
      return buildDevHistory(patientId);
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select(
        'id, type, responses, alert_level, triggered_rules, ai_analysis, submitted_at',
      )
      .eq('patient_id', patientId)
      .gte('submitted_at', thirtyDaysAgo.toISOString())
      .order('submitted_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data ?? [];
  }

  /** Historique des 30 derniers jours — réservé au médecin (doctor only). */
  async getHistory(patientId: string, doctorId: string) {
    if (isDevMode()) {
      return buildDevHistory(patientId);
    }

    // Vérifier que le médecin a bien accès à cette patiente
    const { data: patient } = await this.supabase
      .getClient()
      .from('patients')
      .select('id')
      .eq('id', patientId)
      .eq('doctor_id', doctorId)
      .single();

    if (!patient) {
      throw new ForbiddenException('Accès refusé à cette patiente');
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data, error } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select(
        'id, type, responses, alert_level, triggered_rules, ai_analysis, submitted_at',
      )
      .eq('patient_id', patientId)
      .gte('submitted_at', thirtyDaysAgo.toISOString())
      .order('submitted_at', { ascending: false });

    if (error) throw new InternalServerErrorException(error.message);
    return data ?? [];
  }

  /** Statut du questionnaire aujourd'hui — utilisé par la patiente. */
  async getTodayStatus(
    patientId: string,
  ): Promise<{ submitted: boolean; alertLevel?: AlertLevel }> {
    if (isDevMode()) {
      // En dev : toujours non soumis → formulaire affiché
      return { submitted: false };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select('alert_level, submitted_at')
      .eq('patient_id', patientId)
      .gte('submitted_at', todayStart.toISOString())
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data) return { submitted: false };

    return {
      submitted: true,
      alertLevel: (data as QuestionnaireRow).alert_level as AlertLevel,
    };
  }

  // ---------------------------------------------------------------------------
  // Méthodes privées
  // ---------------------------------------------------------------------------

  private async checkAlreadySubmittedToday(patientId: string): Promise<boolean> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select('id')
      .eq('patient_id', patientId)
      .gte('submitted_at', todayStart.toISOString())
      .limit(1)
      .maybeSingle();

    return data !== null;
  }

  /**
   * Compte le total de jours consécutifs (aujourd'hui inclus) où Q10='non'.
   * Utilisé pour la règle déshydratation 3 jours consécutifs.
   */
  private async getConsecutiveDaysWithoutWater(
    patientId: string,
    currentResponses: Record<string, string>,
  ): Promise<number> {
    if (currentResponses['Q10'] !== 'non') return 0;

    // Récupérer les 5 dernières réponses pour chercher la série consécutive
    const { data } = await this.supabase
      .getClient()
      .from('questionnaire_responses')
      .select('responses, submitted_at')
      .eq('patient_id', patientId)
      .order('submitted_at', { ascending: false })
      .limit(5);

    let count = 1; // aujourd'hui = 1

    for (const row of (data ?? []) as QuestionnaireRow[]) {
      if ((row.responses as Record<string, string>)['Q10'] === 'non') {
        count++;
      } else {
        break; // série interrompue
      }
    }

    return count;
  }

  /** Explication simulée pour le mode dev (pas d'appel Claude). */
  private buildDevExplanation(level: AlertLevel, rules: string[]): string {
    if (level === AlertLevel.GREEN) {
      return "Tout semble bien aujourd'hui. Continuez à bien vous hydrater et à prendre vos suppléments.";
    }
    if (level === AlertLevel.ORANGE) {
      return `Quelques signes à surveiller : ${rules.slice(0, 2).join(', ')}. Contactez votre médecin dans la journée.`;
    }
    return `URGENCE : ${rules.slice(0, 2).join(', ')}. Rendez-vous immédiatement chez votre médecin ou aux urgences.`;
  }

  /** Message court pour WhatsApp/SMS — l'explication complète est en BDD. */
  private buildNotificationMessage(
    alertLevel: AlertLevel,
    triggeredRules: string[],
  ): string {
    const urgency =
      alertLevel === AlertLevel.RED ? 'URGENCE MamaCare' : 'Alerte MamaCare';
    const rulesSummary = triggeredRules.slice(0, 2).join(', ');
    return `${urgency} : ${rulesSummary}. Ouvrez votre dashboard pour le détail.`;
  }
}
