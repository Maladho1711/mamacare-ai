/** Formate une date ISO en "3 jan", "15 mars", etc. */
export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

/** Retourne "Aujourd'hui", "Hier", "Il y a N j", ou "Jamais" */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return 'Jamais';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return `Il y a ${diff} j`;
}

/** Retourne une chaîne 'YYYY-MM-DD' depuis un objet Date */
export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0] ?? '';
}

/** Vérifie si une date ISO correspond à aujourd'hui */
export function isToday(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return (iso.split('T')[0] ?? '') === toDateStr(new Date());
}
