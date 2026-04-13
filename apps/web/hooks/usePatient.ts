'use client';

/**
 * ─── usePatient ────────────────────────────────────────────────────────────
 *
 * Retourne les infos de la patiente connectée (calcul semaines / jours bébé).
 * En mode dev, le backend renvoie DEV_PATIENTS[0] via findByUserId().
 *
 * NOTE : aujourd'hui il n'y a pas d'endpoint REST dédié "mon profil patiente".
 * On reconstruit les données côté frontend à partir de la session + helpers.
 * Quand une route GET /patients/me sera exposée, il suffira de la consommer.
 */

import { useEffect, useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { apiClient } from '@/lib/api/client';
import { calcPregnancyWeek, calcBabyDayOfLife } from '@/lib/utils/pregnancy';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PatientData {
  id:             string;
  pregnancyWeek:  number;
  babyDayOfLife:  number;
  status:         string;
  type:           'pregnancy' | 'postnatal';
}

interface UsePatientReturn {
  patient: PatientData | null;
  token:   string;
  loading: boolean;
  error:   string | null;
}

interface PatientApiResponse {
  id:             string;
  pregnancyStart: string;
  expectedTerm:   string;
  status:         string;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePatient(): UsePatientReturn {
  const { session, loading: sessionLoading } = useSession({
    required:    true,
    requireRole: 'patient',
  });

  const [patient, setPatient] = useState<PatientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (sessionLoading || !session) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await apiClient.get<PatientApiResponse>('/patients/me');
        if (cancelled) return;

        const status = data.status ?? 'pregnant';
        const isPostnatal = status === 'postnatal';

        setPatient({
          id:            data.id,
          pregnancyWeek: calcPregnancyWeek(data.pregnancyStart),
          babyDayOfLife: calcBabyDayOfLife(data.expectedTerm),
          status,
          type:          isPostnatal ? 'postnatal' : 'pregnancy',
        });
      } catch {
        if (cancelled) return;
        setError('Impossible de charger votre profil.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [sessionLoading, session]);

  return {
    patient,
    token:   session?.token ?? '',
    loading: sessionLoading || loading,
    error,
  };
}
