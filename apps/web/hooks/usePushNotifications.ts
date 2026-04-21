'use client';

/**
 * ─── usePushNotifications ───────────────────────────────────────────────────
 *
 * Gère tout le cycle de vie des Push Notifications Web :
 *  1. Vérification du support navigateur
 *  2. Demande de permission Notification API
 *  3. Souscription VAPID + envoi au backend
 *  4. Désinscription
 *  5. Programmation de rappels locaux via SCHEDULE_REMINDER (Service Worker)
 *
 * Endpoints backend attendus :
 *  GET  /notifications/vapid-public-key  → { publicKey: string }
 *  POST /notifications/subscribe         → { endpoint, p256dh, auth }
 *  DELETE /notifications/unsubscribe     → (pas de body)
 */

import { useCallback, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PushState {
  /** Push API disponible dans ce navigateur */
  supported: boolean;
  /** 'default' | 'granted' | 'denied' */
  permission: NotificationPermission;
  /** Subscription active enregistrée dans le backend */
  subscribed: boolean;
  loading: boolean;
  error: string;
}

interface VapidKeyResponse {
  publicKey: string;
}

// ─── Helper : convertit la clé VAPID base64url → Uint8Array ──────────────────

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

// ─── Helper : calcule le délai en ms jusqu'à l'heure "HH:MM" ─────────────────
// Si l'heure est déjà passée, programme pour le lendemain.

function msUntilTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const now = new Date();
  const target = new Date();
  target.setHours(hours, minutes, 0, 0);
  if (target <= now) {
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    supported: false,
    permission: 'default',
    subscribed: false,
    loading: false,
    error: '',
  });

  // Initialisation côté client uniquement (SSR-safe)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supported =
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;

    setState((prev) => ({
      ...prev,
      supported,
      permission: supported ? Notification.permission : 'default',
    }));

    // Vérifier si une souscription existe déjà localement
    if (supported) {
      navigator.serviceWorker.ready
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (sub) {
            setState((prev) => ({ ...prev, subscribed: true }));
          }
        })
        .catch(() => {
          // Silencieux — pas critique au chargement
        });
    }
  }, []);

  // ─── subscribe ─────────────────────────────────────────────────────────────

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!state.supported) return false;

    setState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      // 1. Demander la permission
      const permission = await Notification.requestPermission();
      setState((prev) => ({ ...prev, permission }));

      if (permission !== 'granted') {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            permission === 'denied'
              ? 'Notifications bloquées — activez-les dans les paramètres de votre navigateur.'
              : 'Permission refusée.',
        }));
        return false;
      }

      // 2. Récupérer la clé publique VAPID
      const { publicKey } = await apiClient.get<VapidKeyResponse>(
        '/notifications/vapid-public-key',
      );

      // 3. S'abonner via PushManager
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      // 4. Envoyer la subscription au backend
      const sub = subscription.toJSON();
      await apiClient.post('/notifications/subscribe', {
        endpoint: sub.endpoint,
        p256dh: sub.keys?.p256dh,
        auth: sub.keys?.auth,
      });

      setState((prev) => ({
        ...prev,
        subscribed: true,
        loading: false,
        error: '',
      }));
      return true;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de l'activation.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
      return false;
    }
  }, [state.supported]);

  // ─── unsubscribe ───────────────────────────────────────────────────────────

  const unsubscribe = useCallback(async (): Promise<void> => {
    if (!state.supported) return;

    setState((prev) => ({ ...prev, loading: true, error: '' }));

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
        await apiClient.delete('/notifications/unsubscribe');
      }

      setState((prev) => ({
        ...prev,
        subscribed: false,
        loading: false,
        error: '',
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la désactivation.';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, [state.supported]);

  // ─── scheduleLocalReminder ─────────────────────────────────────────────────

  const scheduleLocalReminder = useCallback(
    async (timeStr: string): Promise<void> => {
      if (!state.supported || state.permission !== 'granted') return;

      const delayMs = msUntilTime(timeStr);

      const registration = await navigator.serviceWorker.ready;
      registration.active?.postMessage({
        type: 'SCHEDULE_REMINDER',
        delayMs,
        title: 'MamaCare AI',
        body: "N'oubliez pas votre check-up quotidien !",
        url: '/questionnaire',
      });
    },
    [state.supported, state.permission],
  );

  return {
    ...state,
    subscribe,
    unsubscribe,
    scheduleLocalReminder,
  };
}
