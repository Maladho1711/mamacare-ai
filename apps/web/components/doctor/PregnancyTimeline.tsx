'use client';

/**
 * --- PregnancyTimeline ------------------------------------------------------
 *
 * Frise chronologique des étapes clés d'une grossesse selon les standards OMS.
 * Affiche les 12 checkpoints CPN + vaccinations + échographies prévus entre
 * S0 et S40, avec le curseur actuel de la patiente.
 *
 * Usage :
 *   <PregnancyTimeline pregnancyStart="2025-08-15" />
 */

import { calcPregnancyWeek } from '@/lib/utils/pregnancy';

interface Milestone {
  week: number;
  label: string;
  description: string;
  type: 'cpn' | 'ultrasound' | 'vaccination' | 'labs' | 'delivery';
}

/** Étapes clés de grossesse — protocole OMS 2023 + adaptation Guinée */
const MILESTONES: Milestone[] = [
  { week: 8,  type: 'cpn',        label: 'CPN 1',           description: 'Premier examen : poids, TA, antécédents, vaccinations' },
  { week: 12, type: 'ultrasound', label: 'Échographie T1',  description: 'Datation, vitalité, dépistage trisomie' },
  { week: 16, type: 'cpn',        label: 'CPN 2',           description: 'Bilan + test glucose + mesure hauteur utérine' },
  { week: 20, type: 'ultrasound', label: 'Écho morphologique', description: 'Examen structural du fœtus — étape critique T2' },
  { week: 24, type: 'cpn',        label: 'CPN 3',           description: 'Mouvements fœtaux, surveillance TA/protéinurie' },
  { week: 26, type: 'vaccination', label: 'Vaccin VAT',     description: 'Antitétanique 2ème dose (primo-vaccination)' },
  { week: 28, type: 'cpn',        label: 'CPN 4',           description: 'Début du 3e trimestre — test anémie' },
  { week: 32, type: 'ultrasound', label: 'Échographie T3',  description: 'Croissance, position bébé, placenta' },
  { week: 32, type: 'cpn',        label: 'CPN 5',           description: 'Préparation accouchement — signes d\'alerte' },
  { week: 36, type: 'cpn',        label: 'CPN 6',           description: 'Test streptocoque B, plan d\'accouchement' },
  { week: 38, type: 'cpn',        label: 'CPN 7',           description: 'Monitoring hebdo — col, TA, mouvements' },
  { week: 40, type: 'delivery',   label: 'Accouchement',    description: 'Terme prévu — surveillance quotidienne' },
];

const TYPE_ICONS: Record<Milestone['type'], string> = {
  cpn:         '🩺',
  ultrasound:  '🔬',
  vaccination: '💉',
  labs:        '🧪',
  delivery:    '👶',
};

const TYPE_COLORS: Record<Milestone['type'], string> = {
  cpn:         'bg-pink-100 text-pink-700 border-pink-300 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800',
  ultrasound:  'bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
  vaccination: 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
  labs:        'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
  delivery:    'bg-emerald-100 text-emerald-700 border-emerald-400 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700',
};

interface Props {
  /** Date de début de grossesse (ISO) — pour calculer SA actuelle */
  pregnancyStart: string;
}

export default function PregnancyTimeline({ pregnancyStart }: Props) {
  const currentWeek = calcPregnancyWeek(pregnancyStart);

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
            📅 Parcours de grossesse
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Étapes clés protocole OMS — semaine actuelle : <strong className="text-[#E91E8C]">SA {currentWeek}</strong>
          </p>
        </div>
        <div className="text-xs font-semibold text-gray-400 dark:text-gray-500">
          {currentWeek >= 40 ? 'Terme atteint' : `${40 - currentWeek} sem. restantes`}
        </div>
      </div>

      {/* Barre de progression globale */}
      <div className="relative mb-6">
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-300 to-[#E91E8C] transition-all duration-500"
            style={{ width: `${Math.min(100, (currentWeek / 40) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
          <span>S0</span>
          <span>S10</span>
          <span>S20</span>
          <span>S30</span>
          <span>S40</span>
        </div>
      </div>

      {/* Liste des milestones */}
      <div className="space-y-2">
        {MILESTONES.map((m, idx) => {
          const isPast    = currentWeek > m.week;
          const isCurrent = currentWeek >= m.week - 1 && currentWeek <= m.week + 1;
          const isFuture  = currentWeek < m.week - 1;

          return (
            <div
              key={`${m.week}-${m.label}-${idx}`}
              className={`
                flex items-start gap-3 p-3 rounded-xl border transition-all
                ${isCurrent ? `${TYPE_COLORS[m.type]} border-2 shadow-sm` : ''}
                ${isPast ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 opacity-60' : ''}
                ${isFuture ? 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800' : ''}
              `}
            >
              {/* Icône + SA */}
              <div className="shrink-0 flex flex-col items-center gap-0.5 min-w-[42px]">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-base
                  ${isCurrent ? 'bg-white dark:bg-gray-900 ring-2 ring-[#E91E8C]' : 'bg-gray-100 dark:bg-gray-800'}
                `}>
                  {isPast ? '✓' : TYPE_ICONS[m.type]}
                </div>
                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 leading-none">
                  SA {m.week}
                </div>
              </div>

              {/* Contenu */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isCurrent ? 'text-gray-900 dark:text-gray-100' : 'text-gray-700 dark:text-gray-300'}`}>
                    {m.label}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-bold bg-[#E91E8C] text-white px-2 py-0.5 rounded-full animate-pulse">
                      En cours
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {m.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
