/** Calcule la semaine d'aménorrhée (SA) depuis la date de début */
export function calcPregnancyWeek(pregnancyStart: string): number {
  return Math.max(
    0,
    Math.floor((Date.now() - new Date(pregnancyStart).getTime()) / 604_800_000),
  );
}

/** Calcule le jour de vie du bébé (post-natal) depuis le terme */
export function calcBabyDayOfLife(expectedTerm: string): number {
  return Math.max(
    1,
    Math.floor((Date.now() - new Date(expectedTerm).getTime()) / 86_400_000) + 1,
  );
}

/** Texte lisible : "Semaine 28" ou "J+5" */
export function pregnancyLabel(
  status: string,
  pregnancyWeek: number,
  babyDayOfLife: number,
): string {
  if (status === 'postnatal') return `J+${babyDayOfLife}`;
  return `SA ${pregnancyWeek}`;
}

/** Prochaines consultations recommandées par l'OMS */
export function nextConsultations(week: number): string {
  const key = [8, 16, 24, 28, 32, 36, 38].find((w) => w > week);
  return key
    ? `Prochaine consultation recommandée à la semaine ${key}`
    : 'Suivi hebdomadaire recommandé';
}
