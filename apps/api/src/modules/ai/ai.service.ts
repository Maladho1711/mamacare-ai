import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AlertLevel } from '@mamacare/shared-types';
import { MEDICAL_SYSTEM_PROMPT } from './prompts/medical.prompt';

/** Messages de fallback si Claude API est indisponible — règle de sécurité. */
const FALLBACK_MESSAGES: Record<AlertLevel, string> = {
  [AlertLevel.RED]:
    'Votre médecin a été alerté. Contactez-le immédiatement.',
  [AlertLevel.ORANGE]:
    'Certains symptômes méritent attention. Appelez votre médecin.',
  [AlertLevel.GREEN]:
    'Tout semble normal. Continuez à prendre soin de vous.',
};

/** Libellés lisibles pour le contexte envoyé à Claude */
const RULE_LABELS: Record<string, string> = {
  SAIGNEMENTS_VAGINAUX: 'saignements vaginaux',
  TROUBLES_VISUELS: 'troubles visuels',
  PREECLAMPSIE_CEPHALEES_VISION: 'maux de tête avec troubles visuels (prééclampsie)',
  DOULEURS_ABDOMINALES_FORTES: 'douleurs abdominales fortes',
  FIEVRE: 'fièvre',
  OEDEME_IMPORTANT: 'gonflement important du visage ou des membres',
  ABSENCE_MOUVEMENTS_FOETAUX: 'absence de mouvements du bébé',
  DIMINUTION_MOUVEMENTS_FOETAUX: 'diminution des mouvements du bébé',
  MAL_ETRE_GENERAL: 'malaise général',
  SUPPLEMENTS_EPUISES: 'suppléments épuisés (fer / acide folique)',
  DESHYDRATATION_3_JOURS: 'hydratation insuffisante depuis 3 jours',
  DIFFICULTES_RESPIRATOIRES: 'difficultés respiratoires',
  DEPRESSION_ANXIETE_FREQUENTE: 'anxiété ou tristesse fréquente',
  PENSEES_NEGATIVES: 'pensées négatives sur la grossesse',
  BEBE_NE_TETE_PAS: 'le bébé ne tète pas',
  DIFFICULTE_TETER: 'difficulté à téter',
  INFECTION_NOMBRIL: 'rougeur ou écoulement au nombril',
  FIEVRE_BEBE_SEPSIS: 'bébé chaud — suspicion de sepsis',
  DETRESSE_RESPIRATOIRE_BEBE: 'détresse respiratoire du bébé',
  JAUNISSE_PRECOCE_J1_J3: 'jaunisse précoce (J1-J3)',
  JAUNISSE_TARDIVE: 'jaunisse',
  ALLAITEMENT_ABSENT_6H: 'bébé non allaité depuis plus de 6 heures',
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly anthropic: Anthropic;

  constructor(private readonly config: ConfigService) {
    this.anthropic = new Anthropic({
      apiKey: this.config.getOrThrow<string>('ANTHROPIC_API_KEY'),
    });
  }

  /**
   * Génère un message d'explication en français pour la patiente.
   *
   * RÈGLE CRITIQUE — Claude décide UNIQUEMENT du message, jamais du niveau d'alerte.
   * Le niveau est passé en paramètre depuis who-rules.service.ts.
   */
  async generateExplanation(
    responses: Record<string, string>,
    alertLevel: AlertLevel,
    triggeredRules: string[],
  ): Promise<string> {
    try {
      const userMessage = this.buildUserMessage(responses, alertLevel, triggeredRules);

      const completion = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        system: MEDICAL_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      });

      const block = completion.content[0];
      if (block && block.type === 'text') {
        return block.text;
      }

      return FALLBACK_MESSAGES[alertLevel];
    } catch (error) {
      this.logger.error(
        'Claude API indisponible — message de fallback utilisé',
        error,
      );
      return FALLBACK_MESSAGES[alertLevel];
    }
  }

  private buildUserMessage(
    responses: Record<string, string>,
    alertLevel: AlertLevel,
    triggeredRules: string[],
  ): string {
    const levelLabel: Record<AlertLevel, string> = {
      [AlertLevel.RED]: 'URGENT (rouge)',
      [AlertLevel.ORANGE]: 'À surveiller (orange)',
      [AlertLevel.GREEN]: 'Normal (vert)',
    };

    const symptomsText =
      triggeredRules.length > 0
        ? triggeredRules
            .map((r) => `- ${RULE_LABELS[r] ?? r}`)
            .join('\n')
        : '- Aucun signe d\'alerte détecté';

    const responsesText = Object.entries(responses)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');

    return `Niveau d'alerte : ${levelLabel[alertLevel]}

Signes détectés :
${symptomsText}

Réponses brutes au questionnaire : ${responsesText}

Génère un message d'explication simple et rassurant (ou d'alerte selon le niveau) pour la patiente.`;
  }
}
