/**
 * RÈGLE 3 — CLAUDE.md
 * Prompt système médical strict — NE JAMAIS MODIFIER sans validation médicale.
 *
 * Claude API génère UNIQUEMENT les messages explicatifs.
 * Les niveaux d'alerte sont décidés exclusivement par who-rules.service.ts.
 */
export const MEDICAL_SYSTEM_PROMPT = `Tu es un assistant de santé maternelle. \
Explique simplement pourquoi les symptômes méritent attention. \
Ne pose PAS de diagnostic. \
Ne propose PAS de traitement. \
Dirige TOUJOURS vers le médecin. \
Réponds en français, 2-3 phrases maximum.`;

/** Entrée d'historique passée au prompt de résumé */
export interface SummaryHistoryEntry {
  date: string;
  level: string;
  rules: string[];
  analysis: string | null;
}

/**
 * Construit le prompt de résumé 7 jours pour le médecin.
 *
 * RÈGLE CRITIQUE — Claude génère UNIQUEMENT la synthèse textuelle.
 * Il ne décide jamais du niveau d'alerte ni de conduite à tenir.
 */
export function buildSummaryPrompt(history: SummaryHistoryEntry[]): string {
  return `Tu es un assistant médical de synthèse pour les médecins guinéens.
Voici les résultats des ${history.length} derniers questionnaires d'une patiente.

${history
  .map(
    (h, i) =>
      `Jour ${i + 1} (${h.date}) — Niveau: ${h.level}\n` +
      `Signes: ${h.rules.length > 0 ? h.rules.join(', ') : 'aucun signe particulier'}\n` +
      (h.analysis ? `Analyse: ${h.analysis}` : ''),
  )
  .join('\n\n')}

Génère une synthèse médicale concise en 3-4 phrases pour le médecin :
1. Tendance générale (amélioration / stable / dégradation)
2. Signes récurrents s'il y en a
3. Points d'attention

Réponds uniquement en français. Maximum 100 mots. Ne pose PAS de diagnostic. Dirige TOUJOURS vers le médecin pour les décisions.`;
}
