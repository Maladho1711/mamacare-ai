'use client';

/**
 * --- Page de connexion (mode production) -----------------------------------
 *
 * Page de login propre pour vraie utilisation :
 * - Formulaire OTP par numéro de téléphone (Nimba SMS / mode test)
 * - Lien d'inscription pour nouveaux médecins
 * - Plus de boutons démo (utiliser le scénario complet d'inscription)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import { HeartIcon } from '@/components/icons';

interface SendOtpResponse {
  sent: boolean;
  testMode?: boolean;
  devCode?: string;
}

export default function LoginPage() {
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError(null);
    setLoading(true);

    const fullPhone = phone.startsWith('+') ? phone : `+224${phone.replace(/\D/g, '')}`;

    try {
      const result = await apiClient.post<SendOtpResponse>(
        '/auth/send-otp',
        { phone: fullPhone },
        { skipAuth: true },
      );

      // Mode test : afficher le code dans une popup pour faciliter le test
      const devParam = result.testMode && result.devCode ? `&dev=${result.devCode}` : '';
      if (result.testMode && result.devCode) {
        // Pas de alert() — on passe le code dans l'URL pour pré-remplir
      }

      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}${devParam}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le SMS.");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Logo + titre */}
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#E91E8C] mb-3 shadow-lg shadow-pink-200 dark:shadow-pink-950">
          <HeartIcon size={28} className="text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">MamaCare AI</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Suivi de grossesse intelligent — Guinée
        </p>
      </div>

      {/* Formulaire login */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Connexion</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
          Entrez votre numéro pour recevoir un code de connexion.
        </p>

        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Numéro de téléphone
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 font-medium">
                +224
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                placeholder="6XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                maxLength={9}
                className="flex-1 px-4 py-2.5 rounded-r-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                autoComplete="tel"
                required
              />
            </div>
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            disabled={phone.length < 8}
          >
            Recevoir le code de connexion
          </Button>
        </form>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-xs font-semibold text-red-800 dark:text-red-300">Erreur</p>
            <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 leading-relaxed">{error}</p>
            {error.includes('non reconnu') && (
              <Link href="/signup" className="text-xs text-[#E91E8C] hover:underline font-semibold mt-2 inline-block">
                → Créer un compte médecin
              </Link>
            )}
          </div>
        )}
      </div>

      {/* CTA inscription */}
      <div className="bg-gradient-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-gray-900 rounded-2xl border border-pink-100 dark:border-pink-950 p-5 text-center">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
          Première fois sur MamaCare ?
        </p>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
          Si vous êtes médecin ou sage-femme, créez votre compte gratuitement.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center px-5 py-2.5 bg-white dark:bg-gray-900 text-[#E91E8C] border-2 border-[#E91E8C] rounded-xl text-sm font-bold hover:bg-[#E91E8C] hover:text-white transition-colors shadow-sm"
        >
          ✨ Créer un compte médecin
        </Link>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-3">
          Les patientes reçoivent un lien par leur médecin — pas d&apos;inscription directe.
        </p>
      </div>
    </div>
  );
}
