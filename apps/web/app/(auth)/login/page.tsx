'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';
import { DEMO_DOCTOR, DEMO_PATIENT_SELF } from '@/lib/demo/mock-data';
import Button from '@/components/ui/Button';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DevLoginResponse {
  accessToken: string;
  profile: {
    id:        string;
    role:      'doctor' | 'patient';
    full_name: string;
    phone:     string;
  };
}

type Role = 'doctor' | 'patient';

// ─── Constantes ───────────────────────────────────────────────────────────────

const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const IS_DEV       = process.env.NODE_ENV === 'development';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();

  const [phone,       setPhone]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [showPhone,   setShowPhone]   = useState(!IS_DEMO_MODE && !IS_DEV);

  // ── Connexion démo 100% frontend ────────────────────────────────────────────
  const handleDemoLogin = (role: Role) => {
    setLoadingRole(role);
    const isDemoDoctor = role === 'doctor';
    const profile = isDemoDoctor ? DEMO_DOCTOR : DEMO_PATIENT_SELF;

    saveSession({
      token:    'DEMO_TOKEN',
      userId:   profile.id,
      role,
      fullName: profile.fullName,
    });

    router.replace(role === 'doctor' ? '/dashboard' : '/questionnaire');
  };

  // ── Connexion dev (backend local) ────────────────────────────────────────────
  const handleDevLogin = async (role: Role) => {
    setError(null);
    setLoadingRole(role);
    try {
      const data = await apiClient.post<DevLoginResponse>(
        '/auth/dev-login',
        { role },
        { skipAuth: true },
      );
      saveSession({
        token:    data.accessToken,
        userId:   data.profile.id,
        role:     data.profile.role,
        fullName: data.profile.full_name,
      });
      router.replace(role === 'doctor' ? '/dashboard' : '/questionnaire');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erreur inattendue.');
      setLoadingRole(null);
    }
  };

  // ── Connexion OTP ────────────────────────────────────────────────────────────
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setError(null);
    setLoading(true);
    const fullPhone = phone.startsWith('+') ? phone : `+224${phone}`;
    try {
      await apiClient.post('/auth/send-otp', { phone: fullPhone }, { skipAuth: true });
      router.push(`/verify?phone=${encodeURIComponent(fullPhone)}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Impossible d'envoyer le SMS.");
      setLoading(false);
    }
  };

  // ─── Rendu ────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Bandeau mode démo ── */}
      {IS_DEMO_MODE && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
            <span>🔍</span> Mode démonstration — aucun SMS requis
          </span>
        </div>
      )}

      {/* ── Boutons démo ── */}
      {(IS_DEMO_MODE || IS_DEV) && !showPhone && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-lg font-semibold text-gray-800">Accès démo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Explorez toutes les fonctionnalités sans compte.
            </p>
          </div>

          <div className="px-4 pb-5 flex flex-col gap-3">
            {/* Bouton Médecin */}
            <button
              type="button"
              onClick={() => IS_DEMO_MODE ? handleDemoLogin('doctor') : handleDevLogin('doctor')}
              disabled={loadingRole !== null}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl
                border-2 border-transparent bg-blue-50 hover:bg-blue-100
                hover:border-blue-300 active:scale-[0.98]
                transition-all text-left disabled:opacity-50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center text-2xl shrink-0">
                👨‍⚕️
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-blue-900">
                  {loadingRole === 'doctor' ? 'Connexion…' : DEMO_DOCTOR.fullName}
                </div>
                <div className="text-xs text-blue-600 mt-0.5">
                  Dashboard · Patientes · Alertes
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-200 text-blue-800 shrink-0">
                Médecin
              </span>
            </button>

            {/* Bouton Patiente */}
            <button
              type="button"
              onClick={() => IS_DEMO_MODE ? handleDemoLogin('patient') : handleDevLogin('patient')}
              disabled={loadingRole !== null}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl
                border-2 border-transparent bg-pink-50 hover:bg-pink-100
                hover:border-pink-300 active:scale-[0.98]
                transition-all text-left disabled:opacity-50 group"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-200 flex items-center justify-center text-2xl shrink-0">
                🤰
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-pink-900">
                  {loadingRole === 'patient' ? 'Connexion…' : DEMO_PATIENT_SELF.fullName}
                </div>
                <div className="text-xs text-pink-600 mt-0.5">
                  Questionnaire · Historique · Résultats
                </div>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-200 text-pink-800 shrink-0">
                Patiente
              </span>
            </button>
          </div>

          {/* Lien vers connexion réelle */}
          <div className="border-t border-gray-100 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowPhone(true)}
              className="w-full text-xs text-gray-400 hover:text-[#E91E8C] transition-colors text-center py-1"
            >
              Vous avez un compte ? Se connecter avec un numéro →
            </button>
          </div>
        </div>
      )}

      {/* ── Formulaire OTP ── */}
      {showPhone && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-6">
            Entrez votre numéro pour recevoir un code de vérification.
          </p>
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Numéro de téléphone
              </label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-gray-300 bg-gray-50 text-sm text-gray-600 font-medium">
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
                  className="flex-1 px-4 py-3 rounded-r-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#E91E8C] focus:border-transparent"
                  autoComplete="tel"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Vous recevrez un code SMS à 6 chiffres</p>
            </div>
            <Button type="submit" fullWidth isLoading={loading} disabled={phone.length < 8}>
              Continuer
            </Button>
          </form>

          {(IS_DEMO_MODE || IS_DEV) && (
            <button
              type="button"
              onClick={() => setShowPhone(false)}
              className="w-full text-center text-xs text-gray-400 hover:text-[#E91E8C] transition-colors mt-4 py-1"
            >
              ← Retour à la démo
            </button>
          )}
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
