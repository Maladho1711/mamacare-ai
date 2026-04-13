'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDashboard, type PatientRow } from '@/hooks/useDashboard';
import { isToday } from '@/lib/utils/date';
import PatientTable from '@/components/doctor/PatientTable';
import AlertBadge from '@/components/doctor/AlertBadge';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

// ─── Types ────────────────────────────────────────────────────────────────────

type ActiveFilter = 'all' | 'red' | 'orange' | 'missed';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const { patients, doctorName, stats, loading, refresh, lastUpdated } = useDashboard();
  const [filter, setFilter] = useState<ActiveFilter>('all');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  const filtered: PatientRow[] =
    filter === 'all'    ? patients :
    filter === 'missed' ? patients.filter((p) => !isToday(p.last_submitted_at)) :
                          patients.filter((p) => p.risk_level === filter);

  function toggleFilter(f: ActiveFilter) {
    setFilter((prev) => (prev === f ? 'all' : f));
  }

  return (
    <div className="flex flex-col gap-5">

        {/* ── Header + Quick actions ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
            {lastUpdated && (
              <p className="text-xs text-gray-400 mt-0.5">
                Mis à jour {new Date(lastUpdated).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
          <Button size="sm" onClick={() => router.push('/patients/new')}>
            + Patiente
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total"              value={stats.total}  color="text-gray-800"   bg="bg-white" />
          <StatCard label="Urgences"           value={stats.red}    color="text-red-700"    bg={filter === 'red'    ? 'bg-red-100'    : 'bg-red-50'}    active={filter === 'red'}    onClick={() => toggleFilter('red')} />
          <StatCard label="À surveiller"       value={stats.orange} color="text-orange-700" bg={filter === 'orange' ? 'bg-orange-100' : 'bg-orange-50'} active={filter === 'orange'} onClick={() => toggleFilter('orange')} />
          <StatCard label="Sans check auj."    value={stats.missed} color="text-gray-600"   bg={filter === 'missed' ? 'bg-gray-200'   : 'bg-gray-100'}  active={filter === 'missed'} onClick={() => toggleFilter('missed')} />
        </div>

        {/* ── Filtre actif ── */}
        {filter !== 'all' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Filtre :</span>
            {filter === 'red' || filter === 'orange'
              ? <AlertBadge level={filter} />
              : <span className="text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">⏳ Sans check</span>
            }
            <button onClick={() => setFilter('all')} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
              Effacer
            </button>
          </div>
        )}

        {/* ── Table ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              {filter === 'all'
                ? `Toutes les patientes (${patients.length})`
                : `${filtered.length} patiente${filtered.length !== 1 ? 's' : ''}`
              }
            </h2>
            <button
              onClick={refresh}
              className="text-xs text-gray-400 hover:text-[#E91E8C] transition-colors"
            >
              ↻ Actualiser
            </button>
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

// ─── StatCard ─────────────────────────────────────────────────────────────────

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
      <p className="text-xs text-gray-500 mt-1.5 font-medium leading-snug">{label}</p>
    </button>
  );
}
