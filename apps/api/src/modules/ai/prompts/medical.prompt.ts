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
