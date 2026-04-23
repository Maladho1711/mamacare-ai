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
  // Tendance pondérée : semaine récente vs période antérieure
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

  // Fréquence des règles déclenchées
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
