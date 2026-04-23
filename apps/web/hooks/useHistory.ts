'use client';

/**
 * --- useHistory ------------------------------------------------------------
 *
 * Charge l'historique 30 jours d'une patiente.
 *
 * - Sans argument → patiente connectée (GET /questionnaire/my-history)
 * - Avec patientId → médecin consultant une patiente (GET /questionnaire/history/:id)
 *
 * Le backend renvoie des mocks en mode dev (isDevMode()).
 */

import { useEffect, useState } from 'react';
import { apiClient, ApiError } from '@/lib/api/client';
import { useSession } from '@/hooks/useSession';
import { toDateStr } from '@/lib/utils/date';
import { calcPregnancyWeek } from '@/lib/utils/pregnancy';

// --- Types --------------------------------------------------------------------

export interface ResponseRow {
  submitted_at:    string;
  alert_level:     string;
  ai_analysis:     string | null;
  triggered_rules: string[];
  responses:       Record<string, string>;
}

export interface DayCell {
  date:     Date;
  dateStr:  string;
  response: ResponseRow | null;
}

interface UseHistoryReturn {
  cells:         DayCell[];
  pregnancyWeek: number | null;
  expectedTerm:  Date | null;
  loading:       boolean;
  error:         string | null;
}

// --- Hook ---------------------------------------------------------------------

export function useHistory(patientId?: string): UseHistoryReturn {
  const { session, loading: sessionLoading } = useSession({ required: true });

  const [cells,         setCells]         = useState<DayCell[]>([]);
  const [pregnancyWeek, setPregnancyWeek] = useState<number | null>(null);
  const [expectedTerm,  setExpectedTerm]  = useState<Date | null>(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !session) return;

    let cancelled = false;

    (async () => {
      try {
        const path = patientId
          ? `/questionnaire/history/${patientId}`
          : '/questionnaire/my-history';

        const rows = await apiClient.get<ResponseRow[]>(path);
        if (cancelled) return;

        // Charger aussi les infos de grossesse (pour la patiente connectée)
        if (!patientId) {
          try {
            const me = await apiClient.get<{ pregnancyStart: string; expectedTerm: string }>('/patients/me');
            if (!cancelled) {
              setPregnancyWeek(calcPregnancyWeek(me.pregnancyStart));
              setExpectedTerm(new Date(me.expectedTerm));
            }
          } catch { /* ignore si patiente sans profil */ }
        }

        // Indexer par date
        const byDate = new Map<string, ResponseRow>();
        for (const row of rows) {
          const ds = toDateStr(new Date(row.submitted_at));
          if (ds && !byDate.has(ds)) byDate.set(ds, row);
        }

        // Grille 30 jours
        const grid: DayCell[] = Array.from({ length: 30 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (29 - i));
          d.setHours(0, 0, 0, 0);
          const ds = toDateStr(d);
          return { date: d, dateStr: ds, response: byDate.get(ds) ?? null };
        });

        setCells(grid);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiError
            ? err.message
            : 'Erreur lors du chargement de l\'historique',
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionLoading, session, patientId]);

  return {
    cells,
    pregnancyWeek,
    expectedTerm,
    loading: sessionLoading || loading,
    error,
  };
}
