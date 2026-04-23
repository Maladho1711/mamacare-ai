/**
 * Claude AI — port Deno de apps/api/src/modules/ai/ai.service.ts
 *
 * Appel direct à l'API Anthropic (pas de SDK) pour éviter les imports lourds.
 * ⚠️ Claude décide UNIQUEMENT du message — jamais du niveau d'alerte (géré par who-rules).
 */

import type { AlertLevel } from './who-rules.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-haiku-4-5-20251001';

const MEDICAL_SYSTEM_PROMPT = `Tu es un assistant de santé maternelle. \
Explique simplement pourquoi les symptômes méritent attention. \
Ne pose PAS de diagnostic. \
Ne propose PAS de traitement. \
Dirige TOUJOURS vers le médecin. \
Réponds en français, 2-3 phrases maximum.`;

const FALLBACK_MESSAGES: Record<AlertLevel, string> = {
  red: 'Votre médecin a été alerté. Contactez-le immédiatement.',
  orange: 'Certains symptômes méritent attention. Appelez votre médecin.',
  green: 'Tout semble normal. Continuez à prendre soin de vous.',
};

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

type AnthropicResponse = {
  content?: Array<{ type: string; text?: string }>;
};

async function callAnthropic(params: {
  system?: string;
  userMessage: string;
  maxTokens: number;
}): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) {
    console.error('[claude] ANTHROPIC_API_KEY manquant');
    return null;
  }

  try {
    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: params.maxTokens,
      messages: [{ role: 'user', content: params.userMessage }],
    };
    if (params.system) body.system = params.system;

    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error(`[claude] API error ${response.status}: ${await response.text()}`);
      return null;
    }

    const data = (await response.json()) as AnthropicResponse;
    const block = data.content?.[0];
    return block?.type === 'text' ? (block.text ?? null) : null;
  } catch (error) {
    console.error('[claude] exception', error);
    return null;
  }
}

function buildUserMessage(
  responses: Record<string, string>,
  alertLevel: AlertLevel,
  triggeredRules: string[],
): string {
  const levelLabel: Record<AlertLevel, string> = {
    red: 'URGENT (rouge)',
    orange: 'À surveiller (orange)',
    green: 'Normal (vert)',
  };

  const symptomsText =
    triggeredRules.length > 0
      ? triggeredRules.map((r) => `- ${RULE_LABELS[r] ?? r}`).join('\n')
      : "- Aucun signe d'alerte détecté";

  const responsesText = Object.entries(responses)
    .map(([k, v]) => `${k}: ${v}`)
    .join(', ');

  return `Niveau d'alerte : ${levelLabel[alertLevel]}

Signes détectés :
${symptomsText}

Réponses brutes au questionnaire : ${responsesText}

Génère un message d'explication simple et rassurant (ou d'alerte selon le niveau) pour la patiente.`;
}

/** Génère l'explication patient après un questionnaire. */
export async function generateExplanation(
  responses: Record<string, string>,
  alertLevel: AlertLevel,
  triggeredRules: string[],
): Promise<string> {
  const userMessage = buildUserMessage(responses, alertLevel, triggeredRules);
  const text = await callAnthropic({
    system: MEDICAL_SYSTEM_PROMPT,
    userMessage,
    maxTokens: 1000,
  });
  return text ?? FALLBACK_MESSAGES[alertLevel];
}

// ─── Résumé 30 jours pour le médecin ──────────────────────────────────────────

export interface SummaryHistoryEntry {
  date: string;
  level: string;
  rules: string[];
  analysis: string | null;
}

export function buildSummaryPrompt(history: SummaryHistoryEntry[]): string {
  const weights: Record<string, number> = { red: 3, orange: 1, green: 0 };
  const scoreOf = (level: string): number => weights[level] ?? 0;

  const recent = history.slice(0, Math.min(7, history.length));
  const older = history.slice(7);
  const avgRecent =
    recent.reduce((s, h) => s + scoreOf(h.level), 0) / Math.max(recent.length, 1);
  const avgOlder =
    older.length > 0
      ? older.reduce((s, h) => s + scoreOf(h.level), 0) / older.length
      : avgRecent;
  const trend =
    avgRecent > avgOlder + 0.3
      ? 'DÉGRADATION (récent plus sévère)'
      : avgRecent < avgOlder - 0.3
        ? 'AMÉLIORATION (récent plus calme)'
        : 'STABLE';

  const ruleCount = new Map<string, number>();
  for (const h of history) {
    for (const r of h.rules) ruleCount.set(r, (ruleCount.get(r) ?? 0) + 1);
  }
  const recurrent = Array.from(ruleCount.entries())
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([r, n]) => `${r} (${n}×)`)
    .join(', ');

  const counts = {
    red: history.filter((h) => h.level === 'red').length,
    orange: history.filter((h) => h.level === 'orange').length,
    green: history.filter((h) => h.level === 'green').length,
  };

  return `Tu es un assistant médical de synthèse pour les médecins guinéens.
Voici l'analyse de ${history.length} questionnaires récents d'une patiente.

STATISTIQUES :
- Rouges : ${counts.red} | Oranges : ${counts.orange} | Verts : ${counts.green}
- Tendance calculée : ${trend}
- Signes récurrents : ${recurrent || 'aucun'}

DÉTAIL JOUR PAR JOUR (15 derniers max) :
${history
  .slice(0, 15)
  .map(
    (h, i) =>
      `J${i + 1} (${h.date}) — ${h.level.toUpperCase()} — ` +
      (h.rules.length > 0 ? h.rules.join(', ') : 'RAS'),
  )
  .join('\n')}

Génère une synthèse médicale en 4-5 phrases pour le médecin :
1. Tendance sur la période (confirme ou nuance le calcul)
2. Symptômes récurrents à surveiller
3. Niveau de vigilance recommandé (faible / modéré / élevé)
4. Action clinique suggérée (RDV rapproché, examen complémentaire, etc.)

Réponds uniquement en français. 80-120 mots. Ne pose PAS de diagnostic définitif. La décision reste au médecin.`;
}

export async function generatePatientSummary(history: SummaryHistoryEntry[]): Promise<string> {
  const FALLBACK = 'Résumé temporairement indisponible. Consultez le détail des questionnaires.';
  const text = await callAnthropic({
    userMessage: buildSummaryPrompt(history),
    maxTokens: 300,
  });
  return text ?? FALLBACK;
}
