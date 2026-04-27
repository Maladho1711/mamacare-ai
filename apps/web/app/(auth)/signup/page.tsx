'use client';

/**
 * --- Page d'inscription médecin -------------------------------------------
 *
 * Permet à un nouveau médecin de créer son compte directement.
 * Workflow : formulaire → API /auth/register-doctor → OTP → /verify
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient, ApiError } from '@/lib/api/client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface RegisterResponse {
  success: boolean;
  phone: string;
  testMode?: boolean;
  devCode?: string;
  message?: string;
}

export default function SignupPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState('Dr. ');
  const [phone, setPhone] = useState('');
  const [hospital, setHospital] = useState('');
  const [specialty, setSpecialty] = useState('Gynécologie-obstétrique');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim()) return;
    setError(null);
    setLoading(true);

    const fullPhone = phone.startsWith('+') ? phone : `+224${phone.replace(/\D/g, '')}`;

    try {
      const result = await apiClient.post<RegisterResponse>(
        '/auth/register-doctor',
        {
          fullName: fullName.trim(),
          phone: fullPhone,
          hospital: hospital.trim() || undefined,
          specialty: specialty.trim() || undefined,
        },
        { skipAuth: true },
      );

      // Mode test : afficher le code dans une popup pour faciliter le test
      if (result.testMode && result.devCode) {
        alert(
          `🔑 MODE TEST\n\nVotre code OTP : ${result.devCode}\n\n` +
          `(Ce code est affiché car Nimba SMS n'est pas configuré.\n` +
          `En production, il sera envoyé par SMS.)\n\n` +
          `Cliquez OK puis entrez ce code sur la page suivante.`,
        );
      }

      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}${result.testMode ? `&dev=${result.devCode}` : ''}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Erreur lors de l'inscription");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <Link
          href="/login"
          className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 mb-5 transition-colors"
        >
          ← Retour
        </Link>

        <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 px-3 py-1.5 rounded-full mb-4">
          <span>👨‍⚕️</span> Inscription médecin
        </div>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Créez votre compte</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">
          Vous recevrez un code par SMS pour activer votre compte.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nom complet"
            placeholder="Dr. Aïssatou Camara"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Téléphone
            </label>
            <div className="flex">
              <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm text-gray-600 dark:text-gray-300 font-medium">
                +224
              </span>
              <input
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

          <Input
            label="Hôpital / Centre de santé (optionnel)"
            placeholder="CS de Pita, Hôpital Ignace Deen…"
            value={hospital}
            onChange={(e) => setHospital(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Spécialité
            </label>
            <select
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C]"
            >
              <option>Gynécologie-obstétrique</option>
              <option>Médecine générale</option>
              <option>Sage-femme</option>
              <option>Pédiatrie</option>
              <option>Infirmier·e</option>
              <option>Autre</option>
            </select>
          </div>

          <Button
            type="submit"
            fullWidth
            isLoading={loading}
            disabled={!fullName.trim() || phone.length < 8}
          >
            Créer mon compte
          </Button>
        </form>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300">
            {error}
          </div>
        )}
      </div>

      <div className="text-center text-xs text-gray-500 dark:text-gray-400">
        Déjà un compte ?{' '}
        <Link href="/login" className="text-[#E91E8C] hover:underline font-semibold">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
