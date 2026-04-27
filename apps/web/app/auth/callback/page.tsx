'use client';

/**
 * --- Magic Link Callback ----------------------------------------------------
 *
 * Reçu sur /auth/callback?token=<uuid>.
 * Consume le magic link via l'API → connexion automatique → redirection.
 *
 * Utilisé pour les patientes invitées par leur médecin (workflow alternatif au SMS).
 */

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';

interface MagicLinkResponse {
  accessToken: string;
  profile: {
    id: string;
    role: 'doctor' | 'patient' | 'admin';
    full_name: string;
    phone: string;
  };
}

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('Lien invalide — aucun token');
      return;
    }

    apiClient
      .post<MagicLinkResponse>('/auth/magic-link', { token }, { skipAuth: true })
      .then((result) => {
        saveSession({
          token: result.accessToken,
          userId: result.profile.id,
          role: result.profile.role,
          fullName: result.profile.full_name,
        });
        // Rediriger selon le rôle
        const target =
          result.profile.role === 'doctor' ? '/dashboard' :
          result.profile.role === 'admin' ? '/admin' :
          '/questionnaire';
        router.replace(target);
      })
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : 'Erreur lors de la connexion');
      });
  }, [searchParams, router]);

  if (error) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-red-100 dark:border-red-900 p-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-red-50 dark:bg-red-950 flex items-center justify-center mb-4">
            <span className="text-3xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
            Lien invalide
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            {error}
          </p>
          <button
            type="button"
            onClick={() => router.replace('/login')}
            className="inline-flex items-center justify-center px-6 py-2.5 bg-[#E91E8C] text-white rounded-xl text-sm font-medium hover:bg-[#C9177A] transition-colors"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-pink-50 dark:bg-pink-950 flex items-center justify-center mb-4 animate-pulse">
          <span className="text-3xl">🔐</span>
        </div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Connexion en cours…
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Activation de votre compte MamaCare AI
        </p>
      </div>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Suspense fallback={null}>
          <CallbackContent />
        </Suspense>
      </div>
    </div>
  );
}
