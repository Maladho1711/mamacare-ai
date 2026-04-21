'use client';

import { useRouter } from 'next/navigation';
import AlertBadge from './AlertBadge';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientRow {
  id: string;
  full_name: string;
  phone: string;
  risk_level: string;
  status: string;
  pregnancy_start: string;
  expected_term: string;
  last_submitted_at?: string | null;
}

interface PatientTableProps {
  patients: PatientRow[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pregnancyWeek(start: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 604_800_000));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function lastSeen(iso: string | null | undefined): string {
  if (!iso) return 'Jamais';
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today.getTime() - d.getTime()) / 86_400_000);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return 'Hier';
  return `Il y a ${diff} j`;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function PatientTable({ patients }: PatientTableProps) {
  const router = useRouter();

  if (patients.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm p-8 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm">Aucune patiente enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Patiente</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Statut</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">SA / Terme</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Dernier check</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Risque</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr
                key={p.id}
                onClick={() => router.push(`/patients/${p.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    router.push(`/patients/${p.id}`);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Voir le détail de ${p.full_name}`}
                className="border-b border-gray-50 dark:border-gray-800/80 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors focus:outline-none focus:bg-pink-50 dark:focus:bg-pink-950/30"
              >
                <td className="px-5 py-4">
                  <p className="font-medium text-gray-800 dark:text-gray-200">{p.full_name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.phone}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                    {p.status === 'postnatal' ? 'Post-natal' : 'Grossesse'}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
                  {p.status !== 'postnatal'
                    ? `SA ${pregnancyWeek(p.pregnancy_start)}`
                    : '—'
                  }
                  <span className="block text-xs text-gray-400 dark:text-gray-500">
                    Terme : {formatDate(p.expected_term)}
                  </span>
                </td>
                <td className="px-5 py-4 text-gray-500 dark:text-gray-400 text-xs">
                  {lastSeen(p.last_submitted_at)}
                </td>
                <td className="px-5 py-4">
                  <AlertBadge level={p.risk_level} />
                </td>
                <td className="px-5 py-4 text-right">
                  <span className="text-xs text-[#E91E8C] font-medium">Voir →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-gray-50 dark:divide-gray-800">
        {patients.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/patients/${p.id}`)}
            className="w-full text-left px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-start justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">{p.full_name}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{p.phone}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {p.status !== 'postnatal' ? `SA ${pregnancyWeek(p.pregnancy_start)} · ` : ''}
                Vu {lastSeen(p.last_submitted_at)}
              </p>
            </div>
            <AlertBadge level={p.risk_level} />
          </button>
        ))}
      </div>
    </div>
  );
}
