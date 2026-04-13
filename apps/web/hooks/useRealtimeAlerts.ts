'use client';

/**
 * Hook Realtime pour le dashboard medecin.
 * Ecoute les nouvelles alertes et les changements de risque
 * sur les patientes du medecin via Supabase Realtime.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeAlertsOptions {
  /** Callback quand une nouvelle alerte arrive */
  onNewAlert?: (alert: Record<string, unknown>) => void;
  /** Callback quand le risque d'une patiente change */
  onPatientUpdated?: (patient: Record<string, unknown>) => void;
  /** Active/desactive le realtime */
  enabled?: boolean;
}

export function useRealtimeAlerts({
  onNewAlert,
  onPatientUpdated,
  enabled = true,
}: UseRealtimeAlertsOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel('doctor-dashboard')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          onNewAlert?.(payload.new as Record<string, unknown>);
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'patients' },
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
  }, [enabled, onNewAlert, onPatientUpdated]);
}
