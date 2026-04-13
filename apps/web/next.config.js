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
    // ── Network First : API NestJS ────────────────────────────────────────
    // Tente le réseau d'abord ; si indisponible, sert le cache (5 min max).
    // Timeout 5s : assez long pour la 4G guinéenne, assez court pour ne pas
    // geler l'interface — le cache prend le relais rapidement en cas d'échec.
    {
      urlPattern: /^https?:\/\/.*\.(render\.com|localhost)(:\d+)?\/.*$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'mamacare-api',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 5 * 60, // 5 min — données médicales fraîches
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },

    // ── Network First : Supabase REST / Auth / Realtime ───────────────────
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

const API_URL = process.env.API_URL ?? 'http://localhost:3001';

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@mamacare/shared-types'],
  // Pas d'images externes — tout est local (contrainte réseau Guinée)
  images: { unoptimized: true },

  /**
   * Proxy /api/* → NestJS (port 3001).
   * Permet d'appeler fetch('/api/auth/send-otp') depuis le navigateur
   * sans CORS et sans exposer l'URL du backend.
   * En production, API_URL pointe vers l'instance Render.
   */
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${API_URL}/:path*`,
      },
    ];
  },
};

// En dev on bypass next-pwa (incompatible Turbopack + déjà disable:true).
// En build prod on wrappe normalement pour garder le service worker.
module.exports = process.env.NODE_ENV === 'development'
  ? nextConfig
  : withPWA(nextConfig);
