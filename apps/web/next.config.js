// @ts-check

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/],
  importScripts: ['/custom-sw.js'],

  // ── Fallback offline ─────────────────────────────────────────────────────
  // Si navigation hors-ligne → page /offline (informe l'utilisatrice + lien
  // vers le brouillon localStorage du questionnaire)
  fallbacks: {
    document: '/offline',
  },

  // ── Stratégies de cache Workbox ───────────────────────────────────────────
  runtimeCaching: [
    // ── Network First : Supabase Edge Function API ───────────────────────
    // L'ancien backend NestJS Render est mort — toutes les APIs passent
    // désormais par /functions/v1/api sur Supabase.
    // Timeout 5s : assez long pour la 4G guinéenne, assez court pour ne pas
    // geler l'interface — le cache prend le relais rapidement en cas d'échec.

    // ── Network First : Supabase REST / Auth / Realtime / Edge Functions ──
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 5 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Cache First : chunks JS/CSS versionnés ────────────────────────────
    // Les fichiers _next/static/* ont un content-hash dans leur URL →
    // immuables → cache 1 an.
    {
      urlPattern: /\/_next\/static\/.+\.(js|css)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-static',
        expiration: {
          maxEntries: 128,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Cache First : images optimisées Next.js ───────────────────────────
    {
      urlPattern: /\/_next\/image\?url=.+/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'next-images',
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Cache First : icônes PWA, manifest, fonts ─────────────────────────
    {
      urlPattern: /\.(png|ico|svg|woff2?|webmanifest)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-icons',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 365 * 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Stale While Revalidate : pages HTML navigables ────────────────────
    // Affiche immédiatement la version en cache, met à jour en arrière-plan.
    {
      urlPattern: ({ request }) => request.destination === 'document',
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'html-pages',
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mamacare/shared-types'],
  // Pas d'images externes — tout est local (contrainte réseau Guinée)
  images: { unoptimized: true },

  // Plus de rewrites /api/* : depuis la migration Supabase Edge Functions
  // (avril 2026), le client appelle directement SUPABASE_URL/functions/v1/api
};

// En dev on bypass next-pwa (incompatible Turbopack + déjà disable:true).
// En build prod on wrappe normalement pour garder le service worker.
module.exports = process.env.NODE_ENV === 'development'
  ? nextConfig
  : withPWA(nextConfig);
