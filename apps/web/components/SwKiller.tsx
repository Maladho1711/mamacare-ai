'use client';

/**
 * ─── SwKiller — tue les Service Workers fantômes en dev ─────────────────────
 *
 * Pourquoi ? next-pwa a été activé dans des sessions précédentes et a
 * installé un service worker dans le navigateur. Même après avoir désactivé
 * next-pwa, le SW déjà enregistré continue d'intercepter les requêtes et
 * sert du contenu caché périmé → "rien ne marche".
 *
 * Ce composant s'exécute côté client au montage du layout racine :
 *   1. Désenregistre tous les Service Workers du scope courant
 *   2. Vide tous les caches Workbox / CacheStorage
 *   3. Si au moins un SW a été trouvé, force un reload pour sortir des
 *      requêtes interceptées
 *
 * En prod, ce composant n'est pas rendu (voir layout.tsx).
 */

import { useEffect } from 'react';

export function SwKiller() {
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        let killedAny = false;

        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
            killedAny = true;
          }
        }

        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
            killedAny = true;
          }
        }

        if (killedAny && !cancelled) {
          // eslint-disable-next-line no-console
          console.warn(
            '[SwKiller] Service Workers / caches détectés et supprimés. Reload…',
          );
          window.location.reload();
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SwKiller]', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
