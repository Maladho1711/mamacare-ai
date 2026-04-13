'use client';

/**
 * Hook pour gerer les push notifications et les rappels locaux.
 * - Demande la permission au premier usage
 * - Programme un rappel quotidien si le questionnaire n'est pas rempli
 */

import { useEffect, useState, useCallback } from 'react';

type Permission = 'granted' | 'denied' | 'default' | 'unsupported';

interface UseNotificationsReturn {
  permission: Permission;
  requestPermission: () => Promise<void>;
  scheduleReminder: (delayMs: number, title: string, body: string) => void;
  supported: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const [permission, setPermission] = useState<Permission>('default');
  const supported = typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;

  useEffect(() => {
    if (!supported) {
      setPermission('unsupported');
      return;
    }
    setPermission(Notification.permission as Permission);
  }, [supported]);

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
  }, [supported]);

  const scheduleReminder = useCallback(
    (delayMs: number, title: string, body: string) => {
      if (!supported || permission !== 'granted') return;

      navigator.serviceWorker.ready.then((registration) => {
        registration.active?.postMessage({
          type: 'SCHEDULE_REMINDER',
          delayMs,
          title,
          body,
          url: '/questionnaire',
        });
      });
    },
    [supported, permission],
  );

  return { permission, requestPermission, scheduleReminder, supported };
}

/**
 * Calcule le delai en ms jusqu'a l'heure cible (ex: 8h00 ou 10h00).
 * Si l'heure est deja passee aujourd'hui, retourne le delai jusqu'a demain.
 */
export function msUntilHour(hour: number, minute = 0): number {
  const now = new Date();
  const target = new Date(now);
  target.setHours(hour, minute, 0, 0);

  if (target.getTime() <= now.getTime()) {
    target.setDate(target.getDate() + 1);
  }

  return target.getTime() - now.getTime();
}
