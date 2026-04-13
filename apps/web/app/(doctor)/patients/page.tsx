'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import PatientTable, { type PatientRow } from '@/components/doctor/PatientTable';
import Spinner from '@/components/ui/Spinner';

interface PatientApi {
  id:              string;
  fullName:        string;
  phone:           string;
  riskLevel:       string;
  status:          string;
  pregnancyStart:  string;
  expectedTerm:    string;
  updatedAt:       string;
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
    last_submitted_at: p.updatedAt,
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SortKey = 'risk' | 'name' | 'recent';
type StatusFilter = 'all' | 'pregnant' | 'postnatal';

const RISK_ORDER: Record<string, number> = { red: 0, orange: 1, green: 2 };

function sortPatients(patients: PatientRow[], key: SortKey): PatientRow[] {
  return [...patients].sort((a, b) => {
    if (key === 'risk') return (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3);
    if (key === 'name') return a.full_name.localeCompare(b.full_name, 'fr');
    // recent: last_submitted_at desc
    const ta = a.last_submitted_at ? new Date(a.last_submitted_at).getTime() : 0;
    const tb = b.last_submitted_at ? new Date(b.last_submitted_at).getTime() : 0;
    return tb - ta;
  });
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('risk');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

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

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, session]);

  if (loading || sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-red-600 text-sm text-center">{error}</p>
      </div>
    );
  }

  // Filtres
  let visible = patients;
  if (statusFilter !== 'all') {
    visible = visible.filter((p) => p.status === statusFilter);
  }
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    visible = visible.filter(
      (p) => p.full_name.toLowerCase().includes(q) || p.phone.includes(q),
    );
  }
  visible = sortPatients(visible, sortKey);

  return (
    <div className="flex flex-col gap-4">
      {/* ── En-tête ── */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Patientes</h1>
        <button
          onClick={() => router.push('/patients/new')}
          className="text-sm bg-[#E91E8C] text-white px-4 py-2 rounded-lg hover:bg-[#C9177A] transition-colors font-medium"
        >
          + Ajouter
        </button>
      </div>

        {/* ── Barre de recherche ── */}
        <input
          type="search"
          placeholder="Rechercher par nom ou téléphone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-white text-sm
            placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E91E8C] transition-shadow"
        />

        {/* ── Filtres + tri ── */}
        <div className="flex flex-wrap gap-2">
          {/* Statut */}
          {(['all', 'pregnant', 'postnatal'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border
                ${statusFilter === s
                  ? 'bg-[#E91E8C] text-white border-[#E91E8C]'
                  : 'bg-white text-gray-500 border-gray-200 hover:border-[#E91E8C]'
                }`}
            >
              {s === 'all' ? 'Toutes' : s === 'pregnant' ? 'Grossesse' : 'Post-natal'}
            </button>
          ))}
          <div className="flex-1" />
          {/* Tri */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-500
              focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
          >
            <option value="risk">Trier : Risque</option>
            <option value="name">Trier : Nom</option>
            <option value="recent">Trier : Récent</option>
          </select>
        </div>

        {/* ── Résultat ── */}
        <p className="text-xs text-gray-400 font-medium">{visible.length} patiente{visible.length !== 1 ? 's' : ''}</p>

        <PatientTable patients={visible} />
    </div>
  );
}
