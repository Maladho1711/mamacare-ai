'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api/client';
import { saveSession } from '@/lib/auth/session';
import { DEMO_DOCTOR, DEMO_PATIENT_SELF, DEMO_ADMIN } from '@/lib/demo/mock-data';
import Button from '@/components/ui/Button';

type Role = 'doctor' | 'patient';

export default function LoginPage() {
  const router = useRouter();

  const [phone,       setPhone]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);
  const [showOtp,     setShowOtp]     = useState(false);

  // -- Connexion démo instantanée -----------------------------------------------
  const handleDemoLogin = (role: Role) => {
    if (loadingRole) return;
    setLoadingRole(role);
    const profile = role === 'doctor' ? DEMO_DOCTOR : DEMO_PATIENT_SELF;
    saveSession({
      token:    'DEMO_TOKEN',
      userId:   profile.id,
      role,
      fullName: profile.fullName,
    });
    router.replace(role === 'doctor' ? '/dashboard' : '/questionnaire');
  };

  // -- Connexion OTP ------------------------------------------------------------
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

  return (
    <div className="space-y-4">

      {/* -- Accès démo — toujours visible -- */}
      {!showOtp && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          <div className="px-6 pt-6 pb-2">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full mb-4">
              <span>🔍</span> Mode démonstration
            </div>
            <h2 className="text-lg font-bold text-gray-900">Choisissez un profil</h2>
            <p className="text-sm text-gray-500 mt-1 mb-5">
              Accès instantané — aucun mot de passe requis.
            </p>
          </div>

          <div className="px-4 pb-5 flex flex-col gap-3">

            {/* -- Médecin -- */}
            <button
              type="button"
              onClick={() => handleDemoLogin('doctor')}
              disabled={loadingRole !== null}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl
                bg-blue-50 hover:bg-blue-100 border-2 border-blue-100
                hover:border-blue-300 active:scale-[0.98]
                transition-all text-left disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-200 flex items-center justify-center text-2xl shrink-0">
                👨‍⚕️
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-blue-900">
                  {loadingRole === 'doctor' ? 'Connexion en cours…' : DEMO_DOCTOR.fullName}
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  Dashboard · Patientes · Alertes
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-600 text-white shrink-0">
                {loadingRole === 'doctor' ? '…' : 'Entrer →'}
              </span>
            </button>

            {/* -- Patiente -- */}
            <button
              type="button"
              onClick={() => handleDemoLogin('patient')}
              disabled={loadingRole !== null}
              className="flex items-center gap-4 w-full px-4 py-4 rounded-2xl
                bg-pink-50 hover:bg-pink-100 border-2 border-pink-100
                hover:border-pink-300 active:scale-[0.98]
                transition-all text-left disabled:opacity-60"
            >
              <div className="w-12 h-12 rounded-xl bg-pink-200 flex items-center justify-center text-2xl shrink-0">
                🤰
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-pink-900">
                  {loadingRole === 'patient' ? 'Connexion en cours…' : DEMO_PATIENT_SELF.fullName}
                </p>
                <p className="text-xs text-pink-500 mt-0.5">
                  Questionnaire · Historique · Résultats
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-[#E91E8C] text-white shrink-0">
                {loadingRole === 'patient' ? '…' : 'Entrer →'}
              </span>
            </button>
          </div>

          <div className="border-t border-gray-100 px-6 py-3">
            <button
              type="button"
              onClick={() => setShowOtp(true)}
              className="w-full text-xs text-gray-400 hover:text-[#E91E8C] transition-colors text-center py-1"
            >
              J'ai un compte → Se connecter avec mon numéro
            </button>
          </div>
        </div>
      )}

      {/* -- Formulaire OTP (compte réel) -- */}
      {showOtp && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <button
            type="button"
            onClick={() => { setShowOtp(false); setError(null); }}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 mb-5 transition-colors"
          >
            ← Retour
          </button>
          <h2 className="text-lg font-semibold text-gray-800 mb-1">Connexion</h2>
          <p className="text-sm text-gray-500 mb-5">
            Entrez votre numéro pour recevoir un code SMS.
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
            </div>
            <Button type="submit" fullWidth isLoading={loading} disabled={phone.length < 8}>
              Recevoir le code
            </Button>
          </form>
        </div>
      )}

      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}
    </div>
  );
}
