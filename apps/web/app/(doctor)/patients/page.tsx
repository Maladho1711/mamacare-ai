'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import { calcPregnancyWeek } from '@/lib/utils/pregnancy';
import PatientTable, { type PatientRow } from '@/components/doctor/PatientTable';
import FilterChip from '@/components/ui/FilterChip';
import SkeletonPatientList from '@/components/doctor/SkeletonPatientList';

// --- Types API ----------------------------------------------------------------

interface PatientApi {
  id:              string;
  fullName:        string;
  phone:           string;
  riskLevel:       string;
  status:          string;
  pregnancyStart:  string;
  expectedTerm:    string;
  updatedAt:       string;
  lastSubmittedAt?: string | null;
}

function mapPatient(p: PatientApi): PatientRow {
  return {
    id:                p.id,
    full_name:         p.fullName,
    phone:             p.phone,
    risk_level:        p.riskLevel,
    status:            p.status,
    pregnancy_start:   p.pregnancyStart,
    expected_term:     p.expectedTerm,
    last_submitted_at: p.lastSubmittedAt ?? p.updatedAt,
  };
}

// --- Types filtres ------------------------------------------------------------

type SortKey       = 'risk' | 'name' | 'recent';
type StatusFilter  = 'all' | 'pregnant' | 'postnatal';
type MissedDaysFilter = 2 | 3 | 7 | null;
type TrimesterFilter  = 1 | 2 | 3 | null;

// --- Helpers ------------------------------------------------------------------

const RISK_ORDER: Record<string, number> = { red: 0, orange: 1, green: 2 };

function sortPatients(patients: PatientRow[], key: SortKey): PatientRow[] {
  return [...patients].sort((a, b) => {
    if (key === 'risk') return (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3);
    if (key === 'name') return a.full_name.localeCompare(b.full_name, 'fr');
    const ta = a.last_submitted_at ? new Date(a.last_submitted_at).getTime() : 0;
    const tb = b.last_submitted_at ? new Date(b.last_submitted_at).getTime() : 0;
    return tb - ta;
  });
}

function calcDaysMissed(lastSubmittedAt: string | null): number {
  if (!lastSubmittedAt) return 999;
  return Math.floor((Date.now() - new Date(lastSubmittedAt).getTime()) / 86_400_000);
}

function calcTrimester(pregnancyStart: string): 1 | 2 | 3 {
  const week = calcPregnancyWeek(pregnancyStart);
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
}

function exportToCsv(rows: PatientRow[]): void {
  const headers = ['Nom', 'Téléphone', 'SA', 'Trimestre', 'Dernier check', 'Risque'];
  const lines = rows.map((p) => {
    const sa        = calcPregnancyWeek(p.pregnancy_start);
    const trim      = calcTrimester(p.pregnancy_start);
    const lastCheck = p.last_submitted_at
      ? new Date(p.last_submitted_at).toLocaleDateString('fr-FR')
      : 'Jamais';
    const risque =
      p.risk_level === 'red'    ? 'Urgent' :
      p.risk_level === 'orange' ? 'Surveillance' : 'Normal';
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    return [escape(p.full_name), escape(p.phone), sa, trim, escape(lastCheck), escape(risque)].join(',');
  });

  const csv  = [headers.join(','), ...lines].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href     = url;
  link.download = `mamacare_patientes_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

// --- Composant ----------------------------------------------------------------

export default function PatientsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [patients,       setPatients]       = useState<PatientRow[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [search,         setSearch]         = useState('');
  const [sortKey,        setSortKey]        = useState<SortKey>('risk');
  const [statusFilter,   setStatusFilter]   = useState<StatusFilter>('all');
  const [missedDaysFilter, setMissedDaysFilter] = useState<MissedDaysFilter>(null);
  const [trimesterFilter,  setTrimesterFilter]  = useState<TrimesterFilter>(null);

  useEffect(() => {
    if (sessionLoading || !session) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiClient.get<PatientApi[]>('/patients');
        if (cancelled) return;
        setPatients(data.map(mapPatient));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erreur lors du chargement des patientes',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionLoading, session]);

  if (loading || sessionLoading) {
    return <SkeletonPatientList />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    );
  }

  // -- Application des filtres -----------------------------------------------
  let visible = patients;

  if (statusFilter !== 'all') {
    visible = visible.filter((p) => p.status === statusFilter);
  }
  if (missedDaysFilter !== null) {
    visible = visible.filter((p) => calcDaysMissed(p.last_submitted_at) >= missedDaysFilter);
  }
  if (trimesterFilter !== null) {
    visible = visible.filter((p) => calcTrimester(p.pregnancy_start) === trimesterFilter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    visible = visible.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }
  visible = sortPatients(visible, sortKey);

  const hasAdvancedFilters = missedDaysFilter !== null || trimesterFilter !== null;

  return (
    <div className="flex flex-col gap-4">
      {/* -- En-tête -- */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Patientes</h1>
        <button
          onClick={() => router.push('/patients/new')}
          className="text-sm bg-[#E91E8C] text-white px-4 py-2 rounded-lg hover:bg-[#C9177A] transition-colors font-medium"
        >
          + Ajouter
        </button>
      </div>

      {/* -- Barre de recherche -- */}
      <input
        type="search"
        placeholder="Rechercher par nom ou téléphone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100
          placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] transition-shadow"
      />

      {/* -- Filtres statut + tri -- */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'pregnant', 'postnatal'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border
              ${statusFilter === s
                ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-[#E91E8C]'
              }`}
          >
            {s === 'all' ? 'Toutes' : s === 'pregnant' ? 'Grossesse' : 'Post-natal'}
          </button>
        ))}
        <div className="flex-1" />
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
        >
          <option value="risk">Trier : Risque</option>
          <option value="name">Trier : Nom</option>
          <option value="recent">Trier : Récent</option>
        </select>
      </div>

      {/* -- Filtres avancés -- */}
      <div className="flex flex-col gap-2.5">
        {/* Jours manqués */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Inactives :</span>
          {([2, 3, 7] as const).map((days) => (
            <FilterChip
              key={days}
              label={`${days}+ jours`}
              active={missedDaysFilter === days}
              onClick={() => setMissedDaysFilter((prev) => (prev === days ? null : days))}
            />
          ))}
        </div>

        {/* Trimestre */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">Trimestre :</span>
          <FilterChip label="T1 · 0-13 SA"  active={trimesterFilter === 1} onClick={() => setTrimesterFilter((p) => (p === 1 ? null : 1))} />
          <FilterChip label="T2 · 14-27 SA" active={trimesterFilter === 2} onClick={() => setTrimesterFilter((p) => (p === 2 ? null : 2))} />
          <FilterChip label="T3 · 28+ SA"   active={trimesterFilter === 3} onClick={() => setTrimesterFilter((p) => (p === 3 ? null : 3))} />
        </div>
      </div>

      {/* -- Résumé filtres avancés actifs -- */}
      {hasAdvancedFilters && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-gray-500 dark:text-gray-400">Filtres :</span>
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
            onClick={() => { setMissedDaysFilter(null); setTrimesterFilter(null); }}
            className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline ml-1"
          >
            Effacer
          </button>
        </div>
      )}

      {/* -- Compteur + export CSV -- */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
          {visible.length} patiente{visible.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => exportToCsv(visible)}
          title="Exporter en CSV"
          className="text-xs text-gray-400 dark:text-gray-500 hover:text-[#E91E8C] dark:hover:text-[#E91E8C] transition-colors flex items-center gap-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
          Exporter CSV
        </button>
      </div>

      <PatientTable patients={visible} />
    </div>
  );
}
