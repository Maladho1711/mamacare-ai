'use client';

/**
 * ─── useDashboard ──────────────────────────────────────────────────────────
 *
 * Charge les patientes du médecin connecté via GET /patients.
 * Le backend gère automatiquement le mode dev (mocks) via isDevMode().
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { calcPregnancyWeek } from '@/lib/utils/pregnancy';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Shape renvoyée par le backend (IPatient sérialisé). */
interface ApiPatient {
  id:                string;
  userId:            string | null;
  doctorId:          string;
  fullName:          string;
  phone:             string;
  pregnancyStart:    string;
  expectedTerm:      string;
  status:            string;
  riskLevel:         string;
  notes?:            string;
  lastSubmittedAt?:  string | null; // champ optionnel — backend V2
  createdAt:         string;
  updatedAt:         string;
}

/** Shape utilisée par les composants UI du dashboard. */
export interface PatientRow {
  id:                string;
  full_name:         string;
  phone:             string;
  risk_level:        string;
  status:            string;
  pregnancy_start:   string;
  expected_term:     string;
  last_submitted_at: string | null;
}

export interface DashboardStats {
  total:  number;
  red:    number;
  orange: number;
  missed: number;
}

interface UseDashboardReturn {
  patients:    PatientRow[];
  doctorName:  string;
  stats:       DashboardStats;
  loading:     boolean;
  error:       string | null;
  refresh:     () => void;
  lastUpdated: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_ORDER: Record<string, number> = { red: 0, orange: 1, green: 2 };

function sortByRisk(a: PatientRow, b: PatientRow): number {
  return (RISK_ORDER[a.risk_level] ?? 3) - (RISK_ORDER[b.risk_level] ?? 3);
}

function mapPatient(p: ApiPatient): PatientRow {
  return {
    id:                p.id,
    full_name:         p.fullName,
    phone:             p.phone,
    risk_level:        p.riskLevel,
    status:            p.status,
    pregnancy_start:   p.pregnancyStart,
    expected_term:     p.expectedTerm,
    // Utilise lastSubmittedAt si le backend le fournit (V2), sinon null
    last_submitted_at: p.lastSubmittedAt ?? null,
  };
}

function computeStats(patients: PatientRow[]): DashboardStats {
  return {
    total:  patients.length,
    red:    patients.filter((p) => p.risk_level === 'red').length,
    orange: patients.filter((p) => p.risk_level === 'orange').length,
    missed: 0, // non calculé côté frontend — à ajouter si l'API le fournit
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboard(): UseDashboardReturn {
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'doctor',
  });

  const [patients, setPatients]       = useState<PatientRow[]>([]);
  const [loading,  setLoading]        = useState(true);
  const [error,    setError]          = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchPatients = useCallback(async () => {
    try {
      const data = await apiClient.get<ApiPatient[]>('/patients');
      const rows = data.map(mapPatient).sort(sortByRisk);
      setPatients(rows);
      setLastUpdated(new Date().toISOString());
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Erreur lors du chargement des patientes',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (sessionLoading || !session) return;
    fetchPatients();
  }, [sessionLoading, session, fetchPatients]);

  // Realtime : rafraichir quand une alerte ou un changement de patient arrive
  useRealtimeAlerts({
    enabled: !sessionLoading && !!session,
    doctorId: session?.userId,
    onNewAlert: () => fetchPatients(),
    onPatientUpdated: () => fetchPatients(),
  });

  return {
    patients,
    doctorName:  session?.fullName ?? '',
    stats:       computeStats(patients),
    loading:     sessionLoading || loading,
    error,
    refresh:     fetchPatients,
    lastUpdated,
  };
}

// ─── Re-exports utils (back-compat avec l'ancien hook) ──────────────────────

export { calcPregnancyWeek };
export { timeAgo, isToday } from '@/lib/utils/date';
