'use client';

/**
 * Hook pour la soumission offline des questionnaires.
 * Sauvegarde en IndexedDB quand hors-ligne, sync quand en ligne.
 */

import { useEffect, useState, useCallback } from 'react';

const DB_NAME = 'mamacare-offline';
const STORE_NAME = 'pending-submissions';
const DB_VERSION = 1;

interface PendingSubmission {
  id: string;
  payload: Record<string, unknown>;
  endpoint: string;
  createdAt: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToPending(submission: PendingSubmission): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add(submission);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getAllPending(): Promise<PendingSubmission[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as PendingSubmission[]);
    request.onerror = () => reject(request.error);
  });
}

async function removePending(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

interface UseOfflineQueueReturn {
  isOnline: boolean;
  pendingCount: number;
  queueSubmission: (endpoint: string, payload: Record<string, unknown>) => Promise<void>;
  syncNow: () => Promise<number>;
}

export function useOfflineQueue(): UseOfflineQueueReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [pendingCount, setPendingCount] = useState(0);

  // Ecouter les changements de connectivite
  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Compter les soumissions en attente
  useEffect(() => {
    getAllPending().then((items) => setPendingCount(items.length)).catch(() => {});
  }, [isOnline]);

  const queueSubmission = useCallback(
    async (endpoint: string, payload: Record<string, unknown>) => {
      const submission: PendingSubmission = {
        id: `offline-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        payload,
        endpoint,
        createdAt: new Date().toISOString(),
      };
      await addToPending(submission);
      setPendingCount((c) => c + 1);
    },
    [],
  );

  const syncNow = useCallback(async (): Promise<number> => {
    const pending = await getAllPending();
    let synced = 0;

    for (const item of pending) {
      try {
        const { apiClient } = await import('@/lib/api/client');
        await apiClient.post(item.endpoint, item.payload);
        await removePending(item.id);
        synced++;
      } catch {
        // Garder en file pour la prochaine tentative
        break;
      }
    }

    setPendingCount((c) => Math.max(0, c - synced));
    return synced;
  }, []);

  // Auto-sync quand la connexion revient
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      syncNow();
    }
  }, [isOnline, pendingCount, syncNow]);

  return { isOnline, pendingCount, queueSubmission, syncNow };
}
