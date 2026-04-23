'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard, type PatientRow } from '@/hooks/useDashboard';
import { isToday } from '@/lib/utils/date';
import { calcPregnancyWeek } from '@/lib/utils/pregnancy';
import { apiClient } from '@/lib/api/client';
import PatientTable from '@/components/doctor/PatientTable';
import AlertBadge from '@/components/doctor/AlertBadge';
import Button from '@/components/ui/Button';
import FilterChip from '@/components/ui/FilterChip';
import SkeletonDashboard from '@/components/doctor/SkeletonDashboard';

// --- Types --------------------------------------------------------------------

type ActiveFilter  = 'all' | 'red' | 'orange' | 'missed';
type MissedDaysFilter = 2 | 3 | 7 | null;
type TrimesterFilter  = 1 | 2 | 3 | null;

// --- Helpers ------------------------------------------------------------------

/** Nombre de jours calendaires écoulés depuis le dernier check. */
function calcDaysMissed(lastSubmittedAt: string | null): number {
  if (!lastSubmittedAt) return 999; // jamais soumis = très longtemps manqué
  return Math.floor((Date.now() - new Date(lastSubmittedAt).getTime()) / 86_400_000);
}

/** Trimestre de grossesse : 1 = 0-13 SA, 2 = 14-27 SA, 3 = 28+ SA */
function calcTrimester(pregnancyStart: string): 1 | 2 | 3 {
  const week = calcPregnancyWeek(pregnancyStart);
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

/**
 * Génère et télécharge un fichier CSV à partir des patientes filtrées.
 * Zéro dépendance externe — uniquement URL.createObjectURL().
 */
function exportToCsv(rows: PatientRow[]): void {
  const headers = ['Nom', 'Téléphone', 'SA', 'Trimestre', 'Dernier check', 'Risque'];
  const lines = rows.map((p) => {
    const sa       = calcPregnancyWeek(p.pregnancy_start);
    const trim     = calcTrimester(p.pregnancy_start);
    const lastCheck = p.last_submitted_at
      ? new Date(p.last_submitted_at).toLocaleDateString('fr-FR')
      : 'Jamais';
    const risque =
      p.risk_level === 'red'    ? 'Urgent' :
      p.risk_level === 'orange' ? 'Surveillance' : 'Normal';

    // Échapper les virgules et guillemets dans les champs texte
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [escape(p.full_name), escape(p.phone), sa, trim, escape(lastCheck), escape(risque)].join(',');
  });

  const csv  = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); // BOM UTF-8 pour Excel
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `mamacare_patientes_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Composant ----------------------------------------------------------------

export default function DashboardPage() {
  const router = useRouter();
  const { patients, stats, loading, refresh, lastUpdated } = useDashboard();

  // Filtres existants
  const [filter, setFilter] = useState<ActiveFilter>('all');

  // Nouveaux filtres (cumulables)
  const [missedDaysFilter, setMissedDaysFilter] = useState<MissedDaysFilter>(null);
  const [trimesterFilter,  setTrimesterFilter]  = useState<TrimesterFilter>(null);

  // -- KPIs additionnels : RDV cette semaine + compliance ---------------------
  const [upcomingWeek, setUpcomingWeek] = useState<number>(0);

  useEffect(() => {
    if (loading) return;
    const now = new Date();
    const in7 = new Date(now);
    in7.setDate(now.getDate() + 7);
    apiClient
      .get<Array<{ scheduledAt: string; status: string }>>(
        `/appointments?from=${now.toISOString()}&to=${in7.toISOString()}`,
      )
      .then((rows) => {
        setUpcomingWeek(rows.filter((r) => r.status === 'scheduled').length);
      })
      .catch(() => setUpcomingWeek(0));
  }, [loading]);

  if (loading) {
    return <SkeletonDashboard />;
  }

  // Compliance = % de patientes ayant rempli aujourd'hui
  const compliance =
    patients.length > 0
      ? Math.round(
          (patients.filter((p) => isToday(p.last_submitted_at)).length /
            patients.length) *
            100,
        )
      : 0;

  // -- Application des filtres (cumulatifs) ----------------------------------
  const filtered: PatientRow[] = patients.filter((p) => {
    // Filtre principal (stat cards)
    if (filter === 'missed'  && isToday(p.last_submitted_at))  return false;
    if (filter === 'red'     && p.risk_level !== 'red')        return false;
    if (filter === 'orange'  && p.risk_level !== 'orange')     return false;

    // Filtre jours manqués consécutifs
    if (missedDaysFilter !== null) {
      if (calcDaysMissed(p.last_submitted_at) < missedDaysFilter) return false;
    }

    // Filtre trimestre
    if (trimesterFilter !== null) {
      if (calcTrimester(p.pregnancy_start) !== trimesterFilter) return false;
    }

    return true;
  });

  const hasActiveFilters = filter !== 'all' || missedDaysFilter !== null || trimesterFilter !== null;

  function toggleFilter(f: ActiveFilter) {
    setFilter((prev) => (prev === f ? 'all' : f));
  }

  function toggleMissedDays(days: MissedDaysFilter) {
    setMissedDaysFilter((prev) => (prev === days ? null : days));
  }

  function toggleTrimester(t: TrimesterFilter) {
    setTrimesterFilter((prev) => (prev === t ? null : t));
  }

  function clearAllFilters() {
    setFilter('all');
    setMissedDaysFilter(null);
    setTrimesterFilter(null);
  }

  return (
    <div className="flex flex-col gap-5">

        {/* -- Header + Quick actions -- */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => router.push('/patients/new')}>
            + Patiente
          </Button>
        </div>

        {/* -- Stats -- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total"           value={stats.total}  color="text-gray-800 dark:text-gray-100"   bg="bg-white dark:bg-gray-900" />
          <StatCard label="Urgences"        value={stats.red}    color="text-red-700 dark:text-red-400"     bg={filter === 'red'    ? 'bg-red-100 dark:bg-red-950'       : 'bg-red-50 dark:bg-red-950/60'}    active={filter === 'red'}    onClick={() => toggleFilter('red')} />
          <StatCard label="À surveiller"    value={stats.orange} color="text-orange-700 dark:text-orange-400" bg={filter === 'orange' ? 'bg-orange-100 dark:bg-orange-950'  : 'bg-orange-50 dark:bg-orange-950/60'} active={filter === 'orange'} onClick={() => toggleFilter('orange')} />
          <StatCard label="Sans check auj." value={stats.missed} color="text-gray-600 dark:text-gray-300"   bg={filter === 'missed' ? 'bg-gray-200 dark:bg-gray-800'     : 'bg-gray-100 dark:bg-gray-800/60'}  active={filter === 'missed'} onClick={() => toggleFilter('missed')} />
        </div>

        {/* -- KPIs additionnels : compliance + RDV à venir -- */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Compliance aujourd'hui</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{compliance}%</p>
              </div>
              <div className={`text-3xl ${compliance >= 70 ? 'text-emerald-500' : compliance >= 40 ? 'text-orange-500' : 'text-red-500'}`}>
                {compliance >= 70 ? '✓' : compliance >= 40 ? '~' : '!'}
              </div>
            </div>
            <div className="mt-2 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${compliance >= 70 ? 'bg-emerald-500' : compliance >= 40 ? 'bg-orange-500' : 'bg-red-500'}`}
                style={{ width: `${compliance}%` }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push('/appointments')}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3 text-left hover:border-[#E91E8C] transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">RDV cette semaine</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-0.5">{upcomingWeek}</p>
              </div>
              <div className="text-3xl text-[#E91E8C]">📅</div>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Voir tous les rendez-vous →</p>
          </button>
        </div>

        {/* -- Filtres avancés -- */}
        <div className="flex flex-col gap-3">

          {/* Jours manqués consécutifs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Inactives :</span>
            {([2, 3, 7] as const).map((days) => (
              <FilterChip
                key={days}
                label={`${days}+ jours`}
                active={missedDaysFilter === days}
                onClick={() => toggleMissedDays(days)}
              />
            ))}
          </div>

          {/* Trimestre de grossesse */}
          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Trimestre :</span>
            <FilterChip
              label="T1 · 0-13 SA"
              active={trimesterFilter === 1}
              onClick={() => toggleTrimester(1)}
            />
            <FilterChip
              label="T2 · 14-27 SA"
              active={trimesterFilter === 2}
              onClick={() => toggleTrimester(2)}
            />
            <FilterChip
              label="T3 · 28+ SA"
              active={trimesterFilter === 3}
              onClick={() => toggleTrimester(3)}
            />
          </div>
        </div>

        {/* -- Résumé des filtres actifs -- */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-gray-500 dark:text-gray-400">Filtres actifs :</span>

            {(filter === 'red' || filter === 'orange') && (
              <AlertBadge level={filter} />
            )}
            {filter === 'missed' && (
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
                Sans check
              </span>
            )}
            {missedDaysFilter !== null && (
              <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 px-2.5 py-1 rounded-full">
                {missedDaysFilter}+ jours inactif
              </span>
            )}
            {trimesterFilter !== null && (
              <span className="text-xs font-semibold text-pink-700 dark:text-pink-400 bg-pink-50 dark:bg-pink-950 border border-pink-200 dark:border-pink-800 px-2.5 py-1 rounded-full">
                T{trimesterFilter}
              </span>
            )}

            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline ml-1"
            >
              Tout effacer
            </button>
          </div>
        )}

        {/* -- Table -- */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {!hasActiveFilters
                ? `Toutes les patientes (${patients.length})`
                : `${filtered.length} patiente${filtered.length !== 1 ? 's' : ''} filtrée${filtered.length !== 1 ? 's' : ''}`
              }
            </h2>
            <div className="flex items-center gap-3">
              {/* Bouton export CSV */}
              <button
                onClick={() => exportToCsv(filtered)}
                title="Exporter en CSV"
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                CSV
              </button>
              <button
                onClick={refresh}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors"
              >
                ↻ Actualiser
              </button>
            </div>
          </div>
          <PatientTable patients={filtered} />
        </section>

        <button
          onClick={() => router.push('/patients')}
          className="text-sm text-center text-[#E91E8C] hover:underline py-2"
        >
          Gérer toutes les patientes →
        </button>
    </div>
  );
}

// --- StatCard -----------------------------------------------------------------

function StatCard({
  label, value, color, bg, onClick, active,
}: {
  label: string; value: number; color: string; bg: string;
  onClick?: () => void; active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`
        ${bg} rounded-2xl p-4 text-left transition-all border
        ${onClick ? 'cursor-pointer hover:shadow-sm active:scale-[0.97]' : 'cursor-default'}
        ${active ? 'ring-2 ring-[#E91E8C] border-transparent' : 'border-transparent'}
      `}
    >
      <p className={`text-2xl font-bold leading-none ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-snug">{label}</p>
    </button>
  );
}

