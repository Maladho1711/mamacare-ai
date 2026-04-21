'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHistory, type DayCell } from '@/hooks/useHistory';
import { toDateStr } from '@/lib/utils/date';
import { nextConsultations } from '@/lib/utils/pregnancy';
import NotificationSettings from '@/components/patient/NotificationSettings';
import SkeletonHistory from '@/components/patient/SkeletonHistory';

// ─── Config couleurs ──────────────────────────────────────────────────────────

const LEVEL_BG: Record<string, string> = {
  green: 'bg-emerald-400', orange: 'bg-orange-400', red: 'bg-red-500',
};
const LEVEL_LABEL: Record<string, string> = {
  green: '✅ Bien', orange: '⚠️ À surveiller', red: '🚨 Urgence',
};
const LEVEL_TEXT: Record<string, string> = {
  green: 'text-emerald-700', orange: 'text-orange-700', red: 'text-red-700',
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter();
  const { cells, pregnancyWeek, expectedTerm, loading } = useHistory();
  const [selected, setSelected] = useState<DayCell | null>(null);

  if (loading) {
    return <SkeletonHistory />;
  }

  const today = toDateStr(new Date());

  return (
    <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Mon historique</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">30 derniers jours</p>
        </div>

        {/* ── Légende ── */}
        <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
          {(['green', 'orange', 'red'] as const).map((l) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className={`inline-block w-3 h-3 rounded-full ${LEVEL_BG[l]}`} />
              {LEVEL_LABEL[l]}
            </span>
          ))}
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-full bg-gray-200 dark:bg-gray-700" />
            Non rempli
          </span>
        </div>

        {/* ── Grille 30 jours ── */}
        <div className="grid grid-cols-7 gap-1.5" role="grid" aria-label="Calendrier 30 jours">
          {['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'].map((d) => (
            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 dark:text-gray-500 py-1">{d}</div>
          ))}

          {/* Décalage premier jour */}
          {Array.from({
            length: cells[0]?.date.getDay() === 0 ? 6 : (cells[0]?.date.getDay() ?? 1) - 1,
          }).map((_, i) => <div key={`e-${i}`} />)}

          {cells.map((cell) => {
            const isToday   = cell.dateStr === today;
            const level     = cell.response?.alert_level;
            const bg        = level ? (LEVEL_BG[level] ?? 'bg-gray-200') : 'bg-gray-200 dark:bg-gray-700';
            const isSelected = selected?.dateStr === cell.dateStr;

            return (
              <button
                key={cell.dateStr}
                aria-label={`${cell.date.getDate()}${level ? `, ${level}` : ', non rempli'}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : cell)}
                disabled={!cell.response}
                className={`
                  flex flex-col items-center justify-center aspect-square rounded-xl
                  transition-all duration-150 active:scale-95
                  focus:outline-none focus:ring-2 focus:ring-[#E91E8C]
                  dark:focus:ring-offset-gray-950
                  ${cell.response ? 'cursor-pointer hover:opacity-80' : 'cursor-default opacity-60'}
                  ${isToday ? 'ring-2 ring-[#E91E8C] ring-offset-1 dark:ring-offset-gray-950' : ''}
                  ${isSelected ? 'scale-95 opacity-90' : ''}
                `}
              >
                <span className={`w-7 h-7 rounded-full ${bg} mb-0.5`} />
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">{cell.date.getDate()}</span>
              </button>
            );
          })}
        </div>

        {/* ── Détail jour sélectionné ── */}
        {selected?.response && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                {selected.date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
              </h2>
              <span className={`text-sm font-medium ${LEVEL_TEXT[selected.response.alert_level] ?? 'text-gray-600'}`}>
                {LEVEL_LABEL[selected.response.alert_level] ?? ''}
              </span>
            </div>

            {selected.response.ai_analysis && (
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{selected.response.ai_analysis}</p>
            )}

            {selected.response.triggered_rules.length > 0 && (
              <div>
                <p className="text-xs text-gray-400 dark:text-gray-500 uppercase font-semibold tracking-wide mb-1">Signes détectés</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.response.triggered_rules.map((r) => (
                    <span key={r} className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-full">
                      {r.toLowerCase().replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Rappels grossesse ── */}
        {pregnancyWeek !== null && (
          <div className="bg-[#FDE8F3] dark:bg-pink-950 border border-pink-200 dark:border-pink-800 rounded-xl p-4">
            <p className="text-xs font-semibold text-[#C9177A] dark:text-pink-400 uppercase tracking-wide mb-1">
              Rappels consultations
            </p>
            <p className="text-sm text-[#A81266] dark:text-pink-300 leading-relaxed">
              {nextConsultations(pregnancyWeek)}
            </p>
            {expectedTerm && (
              <p className="text-sm text-[#A81266] dark:text-pink-300 mt-1">
                Terme prévu : {expectedTerm.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
        )}

        {/* ── Notifications push ── */}
        <NotificationSettings />
    </div>
  );
}
