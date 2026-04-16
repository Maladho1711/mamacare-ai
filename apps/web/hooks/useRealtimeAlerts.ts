'use client';

/**
 * Hook Realtime pour le dashboard medecin.
 * Canal nommé par doctorId pour isoler chaque médecin.
 * Table patients filtrée par doctor_id pour éviter les fuites de données.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAlertsOptions {
  /** ID du médecin connecté — isole le canal Realtime */
  doctorId?: string;
  /** Callback quand une nouvelle alerte arrive */
  onNewAlert?: (alert: Record<string, unknown>) => void;
  /** Callback quand le risque d'une patiente change */
  onPatientUpdated?: (patient: Record<string, unknown>) => void;
  /** Active/desactive le realtime */
  enabled?: boolean;
}

export function useRealtimeAlerts({
  doctorId,
  onNewAlert,
  onPatientUpdated,
  enabled = true,
}: UseRealtimeAlertsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled || !doctorId) return;

    // Canal nommé par doctorId — chaque médecin a son propre canal
    const channel = supabase
      .channel(`doctor-${doctorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          // Pas de filtre direct (doctor_id absent de la table alerts)
          // La RLS Supabase limite déjà les lignes visibles par médecin
        },
        (payload) => {
          onNewAlert?.(payload.new as Record<string, unknown>);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'patients',
          filter: `doctor_id=eq.${doctorId}`, // ← Filtré par médecin
        },
        (payload) => {
          onPatientUpdated?.(payload.new as Record<string, unknown>);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  // doctorId change si l'utilisateur change de compte — recréer le canal
  }, [enabled, doctorId, onNewAlert, onPatientUpdated]);
}
